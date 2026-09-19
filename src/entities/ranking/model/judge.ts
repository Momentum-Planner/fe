/**
 * 펀더멘털 순위 — 최근 3분기를 **관측 하나에 1점**으로 센다 (2026-09-19 사용자).
 *
 *   EPS 증가율 20% 이상   20% 이상인 분기마다 1점         0~3   분기 셋
 *   EPS 증가율이 오름      직전 분기보다 오르면 1점         0~2   비교 둘 (Q3→Q4 · Q4→Q1)
 *   매출 증가율이 오름     〃                              0~2
 *   마진율이 오름          〃                              0~2
 *   합계                                                  0~9
 *
 * 증가율은 전부 전년 동기 대비. 동점이면 EPS 증가율 상승폭(마지막 − 처음, %p) 순.
 *
 * 💀 판정 셋(연속 · 가속 · 코드 33)을 층으로 쌓는 안을 먼저 세웠는데
 *    「무엇이 무엇보다 큰가」가 안 풀렸다 — 연속과 가속이 같은 재료(EPS 증가율)의
 *    높이와 방향이라 우열의 근거가 없었다. 관측 하나 = 1점이면 따질 것이 없다.
 * ⚠️ 무게(관측 하나 = 1점)는 책이 정한 것이 아니다. 9점 중 5점이 EPS 에서 나온다.
 */

/** 오래된 분기 → 최근 분기. 길이 3 이상 — 점수는 마지막 3분기(관측 창)만 센다 */
export interface Quarters {
  /** EPS 증가율 (전년 동기 대비 %) */
  eps: number[]
  /** 매출 증가율 (전년 동기 대비 %) */
  revenue: number[]
  /** 마진율 (%) */
  margin: number[]
}

export const EPS_FLOOR = 20

/** 직전 분기보다 오른 횟수 */
const rises = (xs: number[]) =>
  xs.reduce((n, x, i) => (i > 0 && x > xs[i - 1]! ? n + 1 : n), 0)

export interface Score {
  /** 20% 이상인 분기 수 0~3 */
  epsFloor: number
  epsUp: number
  revenueUp: number
  marginUp: number
  /** 0~9 */
  total: number
  /** 마지막 − 처음 EPS 증가율 (%p) — 동점일 때만 쓴다 */
  epsRise: number
}

export const WINDOW = 3
const win = (xs: number[]) => xs.slice(-WINDOW)

export function scoreOf(quarters: Quarters): Score {
  const q = {
    eps: win(quarters.eps),
    revenue: win(quarters.revenue),
    margin: win(quarters.margin),
  }
  const epsFloor = q.eps.filter((x) => x >= EPS_FLOOR).length
  const epsUp = rises(q.eps)
  const revenueUp = rises(q.revenue)
  const marginUp = rises(q.margin)
  return {
    epsFloor,
    epsUp,
    revenueUp,
    marginUp,
    total: epsFloor + epsUp + revenueUp + marginUp,
    epsRise: (q.eps.at(-1) ?? 0) - (q.eps[0] ?? 0),
  }
}

/** 값이 없는 행(백엔드 미구현)은 맨 뒤로 민다 */
export function sortRanking<T extends { quarters?: Quarters | null }>(
  items: T[],
): T[] {
  const key = (x: T) =>
    x.quarters ? scoreOf(x.quarters) : { total: -1, epsRise: -Infinity }
  return [...items]
    .map((x) => ({ x, k: key(x) }))
    .sort((a, b) => b.k.total - a.k.total || b.k.epsRise - a.k.epsRise)
    .map(({ x }) => x)
}
