import { api } from '@/shared/api'
import type {
  PlanClose,
  PlanCreate,
  PlanDefaults,
  PlanDetail,
  PlanPatch,
  PlanListFilters,
  PlanListResponse,
  PlanBriefing,
  StockPositionView,
  StopPickBody,
} from '../model/types'

const BASE = '/api/v1/plans'

/**
 * ⚠️ **본문은 «위치 인자»다** — `api.post(path, body)`. `{ json: body }` 로 감싸면
 *    `{"json":{…}}` 가 그대로 나가고, 서버는 필드를 하나도 못 읽는다.
 *
 * 💀 `update` 가 처음부터 그렇게 나가 있었다. 목의 `patchPlan` 이 `?? 기존값` 으로
 *    받는 바람에 **저장이 조용히 아무것도 안 고쳤다** — 에러도 안 났다.
 *    `handlers.test.ts` 는 `fetch` 를 직접 불러서 이 층을 안 지난다.
 */

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

  /** 계획을 «세운다». 계좌 값과 스냅샷은 서버가 그 시점에서 찍는다 (F4 · F7) */
  create: (body: PlanCreate) => api.post<PlanDetail>(BASE, body),

  /**
   * 계획을 «고친다». 대기이든 실행 중이든 고칠 수 있다 —
   * 이미 찍힌 스냅샷과 체결은 안 바뀐다 (④-2).
   */
  update: (planId: number, patch: PlanPatch) =>
    api.patch<PlanDetail>(`${BASE}/${planId}`, patch),

  /**
   * 사다리에서 **닿은 단의 스톱 자리를 고른다** (Q16). 고르면 곧 계획의 손절가가 바뀐다 —
   * 「증권사에서 고쳤나」 를 따로 묻지 않는다.
   */
  pickStop: (planId: number, body: StopPickBody) =>
    api.post<PlanDetail>(`${BASE}/${planId}/stop-pick`, body),

  /**
   * 계획을 «폐기»한다 — 안 가기로 한 것이다 (Q8).
   * 계획은 «사라지지 않고» 상태만 바뀐다. ⑦가 폐기 비율로 센다.
   */
  close: (planId: number, body: PlanClose) =>
    api.post<PlanDetail>(`${BASE}/${planId}/close`, body),

  /**
   * 계획을 «삭제»한다 — 애초에 없어야 했던 것이다 (Q8).
   *
   * **폐기와 다른 행위다.** 대기 + 체결 0건만 지울 수 있고, 그 밖은 409 다 —
   * 체결이 붙었으면 돈이 실제로 움직였고 `TradeRecord` 가 그것을 가리킨다.
   */
  remove: (planId: number) => api.delete<null>(`${BASE}/${planId}`),

  /**
   * 계획을 세울 때 «계획이 아닌 데서» 오는 값들 — 계좌 · 통계 · 종목.
   * **계획이 하나도 없는 종목에서도 온다.** 첫 계획이 여기에 기댄다.
   */
  getDefaults: (stockCode: string) =>
    api.get<PlanDefaults>(`/api/v1/stocks/${stockCode}/plan-defaults`),

  /** 새 계획 전에 볼 것 — 내 최근 매매 · 이 종목 · 조건별 승률 (Q17 2) */
  getBriefing: (stockCode: string) =>
    api.get<PlanBriefing>(`/api/v1/stocks/${stockCode}/plan-briefing`),

  /** 종목 포지션 — 계획 화면이 「지금 어디에 서 있나」를 알려면 필요하다 */
  getPosition: (stockCode: string) =>
    api.get<StockPositionView>(`/api/v1/stocks/${stockCode}/position`),
}
