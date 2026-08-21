import { api } from '@/shared/api'
import type {
  SnapshotCreateRequest,
  SnapshotCreateResponse,
  SnapshotDetail,
  SnapshotListFilters,
  SnapshotListResponse,
  SnapshotUpdateRequest,
} from '../model/types'

const BASE = '/api/v1/snapshots'

function toSearchParams(f: SnapshotListFilters) {
  return {
    startDate: f.startDate,
    endDate: f.endDate,
    // Spring 의 List<Enum> 바인딩은 콤마 구분 단일 파라미터를 허용한다.
    judgments: f.judgments?.length ? f.judgments.join(',') : undefined,
    regimes: f.regimes?.length ? f.regimes.join(',') : undefined,
    stockName: f.stockName || undefined,
  }
}

export const snapshotApi = {
  getList: (filters: SnapshotListFilters = {}) =>
    api.get<SnapshotListResponse>(BASE, {
      searchParams: toSearchParams(filters),
    }),

  getDetail: (snapshotId: number) =>
    api.get<SnapshotDetail>(`${BASE}/${snapshotId}`),

  create: (req: SnapshotCreateRequest) =>
    api.post<SnapshotCreateResponse>(BASE, req),

  update: (snapshotId: number, req: SnapshotUpdateRequest) =>
    api.patch<void>(`${BASE}/${snapshotId}`, req),
}
