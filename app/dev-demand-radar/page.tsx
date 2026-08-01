import { notFound } from 'next/navigation'
import { AppSidebar } from '@/components/client/AppSidebar'
import { DemandRadarView } from '@/components/bot-views/DemandRadarView'
import { Toaster } from '@/components/ui/sonner'
import type { DemandAction, DemandOpportunity, DemandRadarSnapshot } from '@/lib/demand-radar'
import type { DemandActionPlanInput, DemandActionPlanResult } from '@/lib/demand-actions'

const ALL_ACTIONS: DemandAction[] = [
  { id: 'fix_product_attributes', label: 'Fix product attributes', description: 'Complete the fields shoppers use to narrow their choice.', recommended: true },
  { id: 'add_faq', label: 'Add an FAQ', description: 'Turn the repeated question into a grounded store answer.', recommended: false },
  { id: 'improve_product_description', label: 'Improve product description', description: 'Add the missing buying detail to the relevant products.', recommended: true },
  { id: 'create_collection', label: 'Create a collection', description: 'Group matching products around this shopper intent.', recommended: true },
  { id: 'add_missing_synonym', label: 'Add a missing synonym', description: 'Teach search the wording shoppers actually use.', recommended: false },
  { id: 'notify_merchandising_team', label: 'Notify merchandising team', description: 'Share the evidence with the person who owns the catalog.', recommended: false },
  { id: 'publish_correction', label: 'Publish correction to store', description: 'Available after a supported write-back connection is approved.', recommended: false },
]

function opportunity(
  overrides: Pick<DemandOpportunity, 'id' | 'title' | 'issueType' | 'shoppers' | 'conversations' | 'trendPercent' | 'detectedIssue'>,
  evidence: string[],
): DemandOpportunity {
  return {
    ...overrides,
    evidence: evidence.map((question, index) => ({
      question,
      date: `2026-07-${String(30 - index * 3).padStart(2, '0')}T12:00:00.000Z`,
      channel: index === 1 ? 'messenger' : 'chat',
    })),
    actions: ALL_ACTIONS.map((action) => ({
      ...action,
      recommended:
        overrides.issueType === 'product_gap'
          ? ['fix_product_attributes', 'improve_product_description', 'create_collection'].includes(action.id)
          : overrides.issueType === 'knowledge_gap'
            ? ['add_faq', 'improve_product_description', 'add_missing_synonym'].includes(action.id)
            : ['add_faq', 'notify_merchandising_team'].includes(action.id),
    })),
  }
}

const dailyPattern = [
  [3, 2, 1], [4, 2, 1], [3, 3, 1], [5, 2, 2], [4, 4, 1], [6, 3, 2],
  [5, 3, 2], [7, 4, 2], [6, 3, 3], [8, 5, 2], [7, 4, 3], [9, 5, 3],
  [8, 6, 3], [10, 5, 4], [9, 7, 3], [11, 6, 4], [10, 7, 4], [12, 8, 5],
  [11, 7, 4], [13, 9, 5], [12, 8, 6], [14, 10, 5], [13, 9, 6], [15, 11, 6],
  [14, 10, 7], [16, 12, 6], [15, 11, 7], [17, 13, 8], [16, 12, 7], [18, 14, 9],
]

const snapshot: DemandRadarSnapshot = {
  totalShoppers: 84,
  totalConversations: 109,
  totalSignals: 126,
  topIssueType: 'product_gap',
  daily: dailyPattern.map(([productGaps, knowledgeGaps, storeLimitations], index) => ({
    date: `2026-07-${String(index + 2).padStart(2, '0')}`,
    productGaps,
    knowledgeGaps,
    storeLimitations,
  })),
  opportunities: [
    opportunity(
      {
        id: 'oak-dining-tables',
        title: 'Oak dining tables under €800',
        issueType: 'product_gap',
        shoppers: 31,
        conversations: 38,
        trendPercent: 72,
        detectedIssue: 'Shoppers are repeatedly asking for an oak table within a clear budget, but product material and price attributes are incomplete or inconsistent.',
      },
      ['Do you have an oak dining table under €800?', 'Show me solid oak tables for six people', 'Any natural oak dining tables below my budget?'],
    ),
    opportunity(
      {
        id: 'washable-sofas',
        title: 'Sofas with washable covers',
        issueType: 'knowledge_gap',
        shoppers: 24,
        conversations: 29,
        trendPercent: 48,
        detectedIssue: 'Care and cover-removal information is missing from several sofa descriptions, so the assistant cannot confidently answer this buying question.',
      },
      ['Which sofas have covers I can wash?', 'Can the Luna sofa covers go in a washing machine?', 'I need a family sofa with removable covers'],
    ),
    opportunity(
      {
        id: 'assembly-service',
        title: 'Furniture assembly at delivery',
        issueType: 'store_limitation',
        shoppers: 18,
        conversations: 24,
        trendPercent: 29,
        detectedIssue: 'Customers expect assembly as part of delivery, but the store policy does not clearly state whether this service is available.',
      },
      ['Can you assemble the wardrobe when it arrives?', 'Is furniture assembly included with delivery?', 'Do you offer assembly in Vilnius?'],
    ),
    opportunity(
      {
        id: 'pet-friendly-fabrics',
        title: 'Pet-friendly upholstery',
        issueType: 'product_gap',
        shoppers: 11,
        conversations: 18,
        trendPercent: 18,
        detectedIssue: 'Shoppers use “pet-friendly” as a filter, but durability and easy-clean fabric attributes are not normalized across the catalog.',
      },
      ['Which sofa fabric is best with a dog?', 'Show me scratch-resistant upholstery', 'Do you have easy-clean fabric for pets?'],
    ),
  ],
}

async function createPreviewActionPlan(input: DemandActionPlanInput): Promise<DemandActionPlanResult> {
  'use server'
  const actions = Object.fromEntries(input.selectedActions.map((action) => [
    action,
    {
      status: action === 'add_faq' || action === 'add_missing_synonym' ? 'applied' : 'saved',
      message: action === 'add_faq' || action === 'add_missing_synonym'
        ? 'Applied to the development preview.'
        : 'Saved as a preview task.',
    },
  ])) as DemandActionPlanResult['actions']
  return { ok: true, planId: input.planId, status: 'applied', actions }
}

export default function DemandRadarPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <>
      <div className="relative isolate flex h-svh flex-col overflow-hidden bg-sidebar-mesh md:flex-row">
        <div className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[42vh]" aria-hidden="true" />
        <div className="hidden md:flex">
          <AppSidebar bots={[{ id: 'preview', name: 'Nord Home', status: 'active' }]} userEmail="preview@loqara.com" />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background md:m-3 md:rounded-2xl md:shadow-sm" data-testid="demand-radar-preview">
          <DemandRadarView
            bot={{ id: 'preview', name: 'Nord Home' }}
            snapshot={snapshot}
            rangeDays={30}
            rangeLabel="Jul 2 – Jul 31, 2026"
            createActionPlanAction={createPreviewActionPlan}
          />
        </main>
      </div>
      <Toaster />
    </>
  )
}
