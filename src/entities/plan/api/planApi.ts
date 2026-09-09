import { api } from '@/shared/api'
import type {
  PlanDetail,
  PlanListFilters,
  PlanListResponse,
  StockPositionView,
} from '../model/types'

const BASE = '/api/v1/plans'

function toSearchParams(f: PlanListFilters) {
  return {
    from: f.from,
    to: f.to,
    statuses: f.statuses?.length ? f.statuses.join(',') : undefined,
    stockCode: f.stockCode || undefined,
  }
}

export const planApi = {
  getList: (filters: PlanListFilters = {}) =>
    api.get<PlanListResponse>(BASE, { searchParams: toSearchParams(filters) }),

  getDetail: (planId: number) => api.get<PlanDetail>(`${BASE}/${planId}`),

  /** 종목 포지션 — 계획 화면이 「지금 어디에 서 있나」를 알려면 필요하다 */
  getPosition: (stockCode: string) =>
    api.get<StockPositionView>(`/api/v1/stocks/${stockCode}/position`),
}
