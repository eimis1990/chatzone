import type { DemandActionId, DemandEvidence, DemandIssueType } from '@/lib/demand-radar'

export type ExecutableDemandActionId = Exclude<DemandActionId, 'publish_correction'>
export type DemandActionExecutionStatus = 'saved' | 'applied' | 'failed'
export type DemandActionPlanStatus = 'saved' | 'processing' | 'applied' | 'partial'

export interface DemandActionExecutionResult {
  status: DemandActionExecutionStatus
  message: string
  resourceId?: string
}

export interface DemandActionPlanInput {
  planId: string
  botId: string
  opportunity: {
    key: string
    title: string
    issueType: DemandIssueType
    evidence: DemandEvidence[]
  }
  selectedActions: ExecutableDemandActionId[]
  faq?: {
    question: string
    answer: string
  }
  synonym?: {
    phrase: string
    replacement: string
  }
}

export interface DemandActionPlanResult {
  ok: boolean
  planId?: string
  status?: DemandActionPlanStatus
  actions?: Partial<Record<ExecutableDemandActionId, DemandActionExecutionResult>>
  error?: string
}
