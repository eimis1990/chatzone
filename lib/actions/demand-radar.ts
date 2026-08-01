'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
import type {
  DemandActionExecutionResult,
  DemandActionPlanInput,
  DemandActionPlanResult,
  ExecutableDemandActionId,
} from '@/lib/demand-actions'

const executableActionSchema = z.enum([
  'fix_product_attributes',
  'add_faq',
  'improve_product_description',
  'create_collection',
  'add_missing_synonym',
  'notify_merchandising_team',
])

const inputSchema = z.object({
  planId: z.string().uuid(),
  botId: z.string().uuid(),
  opportunity: z.object({
    key: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(180),
    issueType: z.enum(['product_gap', 'knowledge_gap', 'store_limitation']),
    evidence: z.array(z.object({
      question: z.string().trim().min(1).max(180),
      date: z.string().datetime(),
      channel: z.enum(['chat', 'voice', 'messenger']),
    })).max(3),
  }),
  selectedActions: z.array(executableActionSchema).min(1).max(6)
    .refine((actions) => new Set(actions).size === actions.length, 'Duplicate actions are not allowed'),
  faq: z.object({
    question: z.string().trim().min(5).max(500),
    answer: z.string().trim().min(10).max(4000),
  }).optional(),
  synonym: z.object({
    phrase: z.string().trim().min(2).max(120),
    replacement: z.string().trim().min(2).max(120),
  }).optional(),
}).superRefine((input, context) => {
  if (input.selectedActions.includes('add_faq') && !input.faq) {
    context.addIssue({ code: 'custom', path: ['faq'], message: 'Complete the FAQ draft' })
  }
  if (input.selectedActions.includes('add_missing_synonym') && !input.synonym) {
    context.addIssue({ code: 'custom', path: ['synonym'], message: 'Complete the synonym rule' })
  }
  if (input.synonym && input.synonym.phrase.toLocaleLowerCase('lt-LT') === input.synonym.replacement.toLocaleLowerCase('lt-LT')) {
    context.addIssue({ code: 'custom', path: ['synonym', 'replacement'], message: 'Use a different catalogue term' })
  }
})

const SAVE_ONLY_MESSAGES: Record<ExecutableDemandActionId, string> = {
  fix_product_attributes: 'Saved for catalogue review. No product data was changed.',
  add_faq: 'FAQ draft saved.',
  improve_product_description: 'Saved for product-copy review. No product data was changed.',
  create_collection: 'Saved for merchandising review. No store collection was created.',
  add_missing_synonym: 'Synonym rule saved.',
  notify_merchandising_team: 'Saved as a merchandising task. No external notification was sent.',
}

function planStatus(
  selectedActions: ExecutableDemandActionId[],
  results: Partial<Record<ExecutableDemandActionId, DemandActionExecutionResult>>,
): 'saved' | 'applied' | 'partial' {
  const immediate = selectedActions.filter((action) => action === 'add_faq' || action === 'add_missing_synonym')
  if (immediate.length === 0) return 'saved'
  return immediate.some((action) => results[action]?.status === 'failed') ? 'partial' : 'applied'
}

export async function createDemandActionPlan(rawInput: DemandActionPlanInput): Promise<DemandActionPlanResult> {
  const parsed = inputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the proposed changes' }
  }

  const input = parsed.data
  const user = await requireRole('client')
  const supabase = await createServerClient()

  // This RLS-scoped lookup is the authorization boundary for every following
  // write, including service-role ingestion.
  const { data: bot } = await supabase.from('bots').select('id').eq('id', input.botId).single()
  if (!bot) return { ok: false, error: 'Bot not found' }

  const { data: existing } = await supabase
    .from('demand_action_plans')
    .select('id, status, action_results')
    .eq('id', input.planId)
    .maybeSingle()
  if (existing) {
    return {
      ok: true,
      planId: existing.id as string,
      status: existing.status as DemandActionPlanResult['status'],
      actions: existing.action_results as DemandActionPlanResult['actions'],
    }
  }

  const actionPayloads = {
    ...(input.faq ? { add_faq: input.faq } : {}),
    ...(input.synonym ? { add_missing_synonym: input.synonym } : {}),
  }
  const initialResults = Object.fromEntries(
    input.selectedActions.map((action) => [action, { status: 'saved', message: SAVE_ONLY_MESSAGES[action] }]),
  ) as Partial<Record<ExecutableDemandActionId, DemandActionExecutionResult>>

  const { error: planInsertError } = await supabase.from('demand_action_plans').insert({
    id: input.planId,
    bot_id: input.botId,
    opportunity_key: input.opportunity.key,
    opportunity_title: input.opportunity.title,
    issue_type: input.opportunity.issueType,
    evidence: input.opportunity.evidence,
    selected_actions: input.selectedActions,
    action_payloads: actionPayloads,
    action_results: initialResults,
    status: 'processing',
    created_by: user.id,
  })
  if (planInsertError) return { ok: false, error: 'Could not save the action plan' }

  const results = { ...initialResults }

  if (input.selectedActions.includes('add_faq') && input.faq) {
    try {
      const { data: source, error: sourceError } = await supabase
        .from('knowledge_sources')
        .insert({
          bot_id: input.botId,
          type: 'qa',
          name: `Demand Radar FAQ — ${input.opportunity.title}`.slice(0, 180),
          status: 'pending',
          metadata: {
            pairs: [input.faq],
            kind: 'demand-radar',
            demandActionPlanId: input.planId,
          },
        })
        .select('id')
        .single<{ id: string }>()

      if (sourceError || !source) {
        results.add_faq = { status: 'failed', message: 'The plan was saved, but the FAQ could not be created.' }
      } else {
        const service = createServiceClient()
        await ingestSource(source.id, { repo: makeServiceRepo(service) })
        const { data: ingested } = await supabase
          .from('knowledge_sources')
          .select('status, error_message')
          .eq('id', source.id)
          .single<{ status: string; error_message: string | null }>()
        results.add_faq = ingested?.status === 'ready'
          ? { status: 'applied', message: 'FAQ added to the knowledge base and ready for answers.', resourceId: source.id }
          : { status: 'failed', message: ingested?.error_message || 'The FAQ was created but ingestion failed.', resourceId: source.id }
      }
    } catch (error) {
      console.error('[demand-radar] FAQ application failed:', error)
      results.add_faq = { status: 'failed', message: 'The plan was saved, but the FAQ could not be created.' }
    }
  }

  if (input.selectedActions.includes('add_missing_synonym') && input.synonym) {
    try {
      const { data: synonym, error: synonymError } = await supabase
        .from('product_search_synonyms')
        .upsert({
          bot_id: input.botId,
          phrase: input.synonym.phrase,
          replacement: input.synonym.replacement,
          action_plan_id: input.planId,
          created_by: user.id,
        }, { onConflict: 'bot_id,phrase_normalized' })
        .select('id')
        .single<{ id: string }>()

      results.add_missing_synonym = synonymError || !synonym
        ? { status: 'failed', message: 'The plan was saved, but the synonym rule could not be activated.' }
        : { status: 'applied', message: 'Synonym activated for future product searches.', resourceId: synonym.id }
    } catch (error) {
      console.error('[demand-radar] synonym application failed:', error)
      results.add_missing_synonym = { status: 'failed', message: 'The plan was saved, but the synonym rule could not be activated.' }
    }
  }

  const status = planStatus(input.selectedActions, results)
  const { error: planUpdateError } = await supabase
    .from('demand_action_plans')
    .update({ action_results: results, status })
    .eq('id', input.planId)
  if (planUpdateError) return { ok: false, error: 'Changes were applied, but the plan status could not be updated' }

  revalidatePath(`/app/bots/${input.botId}/demand-radar`)
  revalidatePath(`/app/bots/${input.botId}/knowledge`)
  return { ok: true, planId: input.planId, status, actions: results }
}
