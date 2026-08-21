import type { ServerJudgment, ServerRegime } from '@/shared/lib/snapshots'

export interface SnapshotListItem {
  snapshotId: number
  stockName: string
  stockRegime: ServerRegime
  judgment: ServerJudgment
  recordedAt: string // LocalDateTime
  price: number
}

export interface SnapshotListResponse {
  buyCount: number
  sellCount: number
  watchCount: number
  snapshots: SnapshotListItem[]
}

export interface SnapshotDetail {
  stockName: string
  judgment: ServerJudgment
  referenceSnapshotIds: number[]
  recordedAt: string
  retrospective: string
}

export interface SnapshotCreateRequest {
  stockCode: string
  judgment: ServerJudgment
  referenceSnapshotIds: number[]
  retrospective: string
}

export interface SnapshotCreateResponse {
  snapshotId: number
  startDate: string // LocalDate
}

export interface SnapshotUpdateRequest {
  snapshotId: number
  judgment: ServerJudgment
  referenceSnapshotIds: number[]
  retrospective: string
}

/** 목록 필터. 배열은 콤마조인되어 전송된다(Spring List 바인딩). */
export interface SnapshotListFilters {
  startDate?: string // LocalDateTime
  endDate?: string
  judgments?: ServerJudgment[]
  regimes?: ServerRegime[]
  stockName?: string
}
