import { api } from '@/shared/api'
import type {
  NewTradeRecord,
  TradeRecord,
  TradeListFilters,
  TradeListResponse,
  TradeStats,
} from '../model/types'

const BASE = '/api/v1/trade-records'

/**
 * ⚠️ **본문은 «위치 인자»다** — `api.post(path, body)`. `planApi` 가 한 번
 *    `{ json: body }` 로 감싸서 저장이 조용히 아무것도 안 고친 적이 있다.
 */
function toSearchParams(f: TradeListFilters) {
  return {
    from: f.from,
    to: f.to,
    stockCode: f.stockCode || undefined,
    planned: f.planned === undefined ? undefined : String(f.planned),
  }
}

export const tradeRecordApi = {
  /** 체결 하나를 적는다 (F2) — 체결마다 계획을 지정한다 (F3) */
  create: (body: NewTradeRecord) => api.post<TradeRecord>(BASE, body),

  /**
   * 체결 하나에 계획을 붙이거나 뗀다 (⑥ · Q15 · Q21) — `planId: null` 이 「계획에 없음」이다.
   *
   * ⚠️ 도메인 노트 5-4 — `planId` 가 바뀌면 계좌 총액 복사와 R배수 · 위험노출%를
   *    다시 계산해야 한다. **지금 목은 꼬리표만 바꾼다.**
   */
  assignPlan: (recordId: number, planId: number | null) =>
    api.patch<TradeRecord>(`${BASE}/${recordId}`, { planId }),

  /** 체결 하나를 고친다 — 가격 · 수량 · 체결일 (Q23 ⑤) */
  update: (
    recordId: number,
    patch: { price?: number; quantity?: number; filledAt?: string },
  ) => api.patch<TradeRecord | null>(`${BASE}/${recordId}`, patch),

  /** 체결 하나를 지운다 — 소프트 삭제 (Q23 ⑤) */
  remove: (recordId: number) => api.delete<null>(`${BASE}/${recordId}`),

  getList: (filters: TradeListFilters = {}) =>
    api.get<TradeListResponse>(BASE, { searchParams: toSearchParams(filters) }),

  /**
   * ⑦ 이 내놓는 것 전부를 한 번에 받는다.
   *
   * **쪼개지 않는 이유** — 정산표·자본 감소·그룹별이 전부 «같은 매도 기록
   * 집합»에서 나온다. 따로 부르면 기간 필터가 어긋난 조합이 화면에 설 수 있다.
   * `TradeRecordDerived` 를 저장해 둔 것도 *「⑦ 쿼리가 한 테이블로 끝나게」*
   * 하려는 것이었다 (⑥).
   */
  getStats: (filters: TradeListFilters = {}) =>
    api.get<TradeStats>(`${BASE}/stats`, {
      searchParams: toSearchParams(filters),
    }),
}
