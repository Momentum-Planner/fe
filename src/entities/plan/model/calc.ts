import { AVG_STOP_MIN_SAMPLES, ENTRY_STATE_LABEL } from './types'
import type { EntryState, PlanRecord, StopPick, StopPickKind } from './types'

/**
 * 계획의 «산출값» — ④-1 의 ㉢ 을 계산한다.
 *
 * 목과 화면이 **같은 식을 써야 한다.** 화면이 따로 계산하면 저장 전 미리보기와
 * 저장 후 값이 어긋나고, 그 어긋남은 「내가 잘못 넣었나」로 읽힌다.
 *
 * 여기 있는 것은 전부 «입력이 아니라 결과»다 — 위험노출을 직접 적을 수는 없다(④-1).
 */

/** 진입가 아래로 몇 % 를 감수하나. 손절가가 위면 음수 */
export const stopWidthPct = (entryPrice: number, stopPrice: number) =>
  entryPrice > 0 ? ((entryPrice - stopPrice) / entryPrice) * 100 : 0

/**
 * 이 계획이 «자체로» 거는 몫 (계좌 대비 %).
 *
 * **부호를 안 지운다** — 손절가가 진입가 «위»면 음수다. 절댓값을 씌우면
 * 확정 이익이 위험처럼 보인다.
 */
export const ownRisk = (
  entryPrice: number,
  stopPrice: number,
  quantity: number,
  accountTotal: number,
) =>
  accountTotal > 0
    ? ((entryPrice - stopPrice) * quantity * 100) / accountTotal
    : 0

/**
 * 실행 «후» 위험노출 — 지금 걸린 것 «위에» 이번 것을 얹은 값이다 (④-1 의 사다리).
 * 이 계획 몫만 재면 안 된다.
 */
export const riskAfter = (
  riskBefore: number,
  entryPrice: number,
  stopPrice: number,
  quantity: number,
  accountTotal: number,
) =>
  clampExposure(
    riskBefore + ownRisk(entryPrice, stopPrice, quantity, accountTotal),
  )

/**
 * 위험노출의 **바닥은 0 이다. 음수가 없다.**
 *
 * 위험노출은 *「스톱에 걸렸을 때 «원금에서 잃는 돈»」*(③-2)이다. 손절가가 평단
 * 위로 올라가면 걸려도 **잃지 않는다** — 그러면 위험은 0 이지 「−0.4%의 위험」이
 * 아니다. 음수로 두면 구간(1% 미만 · 1~2.5% · 2.5% 초과)의 왼쪽이 열리고,
 * 「위험이 마이너스」라는 읽히지 않는 값이 화면에 선다.
 *
 * 확보한 이익은 **위험 숫자가 아니라 매도 규칙이 다룬다** — ③-2 가 수익 반납을
 * 리스크에서 뺀 것과 같은 이유다.
 *
 * ⚠️ **최종미지 ③-2 를 한 칸 뒤집는다.** 거기는 「손절가가 평단 위로 올라가면
 *    «0 이하»가 된다」로 적혀 있다 (2026-09-11).
 *
 * ⚠️ `ownRisk` 는 «안 자른다». 그건 노출이 아니라 **이번 계획이 얹는 몫**이고,
 *    줄이는 방향이면 음수인 것이 맞다 — 자르면 스톱 상향이 아무 일도 안 한 것처럼
 *    보인다.
 */
export const clampExposure = (v: number) => Math.max(0, v)

/**
 * 필요 현금.
 * ⚠️ ④-3 은 「진입 예상가 × 수량 + 수수료」인데 **요율이 아직 안 정해졌다.**
 */
export const needCash = (entryPrice: number, quantity: number) =>
  entryPrice * quantity

/** 진입가 − 손절가. 실행될 때 박히고 그 뒤로 안 변한다 (③-2-1) */
export const oneR = (entryPrice: number, stopPrice: number) =>
  entryPrice - stopPrice

/**
 * 사다리 한 단의 **목표 가격** — 진입가 + r × 1R (Q16). 차트 위쪽 면이 여기까지 칠해진다.
 * 1R 이 0 이하(손절가가 진입가 위)면 R 로는 잴 수 없어 null 이다.
 *
 * ⚠️ **실행된 계획은 `initialStopWidth` 로 잰다.** 1R 은 실행될 때 박히고 손절가가
 *    올라가도 안 변한다 (③-2-1). 본전으로 올린 계획은 진입가 = 손절가라
 *    지금 값으로 재면 1R 이 0 이 되어 위쪽 면이 사라진다.
 */
export const goalPrice = (
  entryPrice: number,
  stopPrice: number,
  r: number,
  initialStopWidth: number | null = null,
): number | null => {
  const w = initialStopWidth ?? oneR(entryPrice, stopPrice)
  return w > 0 && r > 0 ? Math.round(entryPrice + r * w) : null
}

/**
 * 사다리의 목표 R 이 **설 수 있나** (Q16 2 · 3).
 *
 * - 한 단 이상 — 스톱 규칙은 필수다 (Q12 에서 이어진다)
 * - 비어 있는 단이 없다
 * - 앞 단보다 커야 한다 — 같은 목표를 두 번 걸면 두 번째가 뜻이 없다
 *
 * @returns 막는 까닭. 문제없으면 null
 */
export const goalsProblem = (rs: (number | null)[]): string | null => {
  if (rs.length === 0) return '✕ 목표를 하나 이상 건다'
  if (rs.some((r) => r == null || !(r > 0))) return '✕ 목표를 고른다'
  for (let i = 1; i < rs.length; i++)
    if ((rs[i] as number) <= (rs[i - 1] as number))
      return '✕ 뒤 단의 목표는 앞 단보다 커야 한다'
  return null
}

/** 닿은 날 뜨는 후보 한 줄 */
export interface StopPickOption {
  kind: StopPickKind
  r?: number
  label: string
  /** 계산할 수 없으면(통계 없음 · 1R 없음) null */
  price: number | null
  /** 못 고르는 까닭. 고를 수 있으면 null */
  blocked: string | null
}

/**
 * 닿은 날의 후보 — **전부 늘어놓는다** (Q16 5). 서비스가 하나를 정하지 않는다.
 *
 * ```text
 * 본전            매입가
 * +1R · +2R …     목표보다 아래인 정수 R 전부
 * 평균 수익률 N%   진입가 × (1 + N%)          표본 5건 전에는 막힌다
 * 20일선 · 50일선  그날 값 — 한 번 옮긴다
 * ```
 *
 * **지금 스톱 이하 · 목표 가격 이상은 막는다.** 스톱은 내려가지 않고, 목표를 넘는 스톱은
 * 종가 위에 걸려 곧바로 걸린다. 직접 입력은 여기 없다 — 칸이 따로 재서 `pickProblem` 으로 막는다.
 */
export function stopPickOptions(o: {
  entryPrice: number
  initialStopWidth: number
  goalR: number
  currentStop: number
  avgWinPct: number | null
  sampleCount: number
  ma20: number
  ma50: number
}): StopPickOption[] {
  const goal = o.entryPrice + o.goalR * o.initialStopWidth
  const out: StopPickOption[] = [
    { kind: 'BREAKEVEN', label: '본전', price: o.entryPrice, blocked: null },
  ]
  for (let r = 1; r < o.goalR; r++)
    out.push({
      kind: 'R',
      r,
      label: `+${r}R`,
      price: o.entryPrice + r * o.initialStopWidth,
      blocked: null,
    })
  const avgLocked = o.avgWinPct == null || o.sampleCount < AVG_STOP_MIN_SAMPLES
  out.push({
    kind: 'AVG',
    label: avgLocked
      ? '평균 수익률'
      : `평균 수익률 ${(o.avgWinPct as number).toFixed(1)}%`,
    price: avgLocked
      ? null
      : Math.round(o.entryPrice * (1 + (o.avgWinPct as number) / 100)),
    blocked: avgLocked ? `통계 ${AVG_STOP_MIN_SAMPLES}건부터` : null,
  })
  out.push(
    { kind: 'MA20', label: '20일선', price: o.ma20, blocked: null },
    { kind: 'MA50', label: '50일선', price: o.ma50, blocked: null },
  )
  return out.map((c) =>
    c.blocked || c.price == null
      ? c
      : { ...c, blocked: pickProblem(c.price, o.currentStop, goal) },
  )
}

/**
 * 고른 가격이 **설 수 있나** — 지금 스톱 초과 · 목표 미만 (Q16 5).
 * @returns 막는 까닭. 문제없으면 null
 */
export const pickProblem = (
  price: number,
  currentStop: number,
  goal: number,
): string | null =>
  price <= currentStop ? '지금 스톱 이하' : price >= goal ? '목표 이상' : null

/** 고른 후보 → 저장할 값 */
export const toStopPick = (o: StopPickOption): StopPick => ({
  kind: o.kind,
  ...(o.r != null ? { r: o.r } : {}),
  price: o.price ?? 0,
})

/**
 * **목표 > 진입 > 스톱** 순서가 아니면 세울 수도 고칠 수도 없다 (2026-09-17 사용자).
 *
 * ```text
 * 스톱 ≥ 진입     1R 이 0 이하 — 위험노출도 R배수도 못 잰다
 * 목표 ≤ 진입     「여기까지 오르면 올린다」 가 뜻을 잃는다
 * 목표 ≤ 스톱     스톱이 목표 위에 선다 — 닿기도 전에 걸린다
 * ```
 * 0 은 「아직 없다」라 빼고 본다.
 *
 * 💀 처음엔 «같은 값»만 막았다. 스톱이 진입가 «위»로 들어가도 통과해서 카드에
 *    「1R 40,000 · −3.57%」 같은 음수 손절폭이 떴다.
 *
 * ⚠️ **실행된 계획(1R 이 박힘)은 스톱 ≥ 진입을 막지 않는다.** 목표에 도착해 본전 · +1R 로
 *    옮긴 스톱은 진입가 이상이 맞다 (Q16). 1R 은 `initialStopWidth` 로 박혀 0 이 안 된다.
 *    그래도 **목표보다는 아래**여야 한다.
 *
 * @returns 막는 까닭. 문제없으면 null
 */
export const priceConflict = (
  entryPrice: number,
  stopPrice: number,
  goal: number | null,
  initialStopWidth: number | null = null,
): string | null => {
  const g = goal == null ? 0 : Math.round(goal)
  if (
    initialStopWidth == null &&
    entryPrice > 0 &&
    stopPrice > 0 &&
    stopPrice >= entryPrice
  )
    return '✕ 스톱가격은 진입가보다 낮아야 한다'
  if (g > 0 && entryPrice > 0 && g <= entryPrice)
    return '✕ 목표는 진입가보다 높아야 한다'
  if (g > 0 && stopPrice > 0 && g <= stopPrice)
    return '✕ 목표는 스톱가격보다 높아야 한다'
  return null
}

/**
 * 계획 이름 — **자동으로 붙인다** (Q11 A). 진입 상태 + 진입가.
 * 같은 종목의 시나리오가 사슬에서 이 이름으로 갈린다: 「돌파 68,200」 · 「눌림 66,000」.
 */
export const autoPlanTitle = (entryState: EntryState, entryPrice: number) =>
  `${ENTRY_STATE_LABEL[entryState]} ${entryPrice.toLocaleString('ko-KR')}`

/**
 * 실현 손익 — **이 계획의 체결만으로** 낸다 (Q20).
 *
 * 평단은 이 계획의 매수들이다. 승계받은 계획처럼 매수가 없으면 `entryPrice` 로
 * 잰다 — 물량은 종목이 들고 있고(④-2) 이 목은 이전 평단을 모른다.
 * 매도가 없으면 둘 다 `null` — 0 으로 적으면 본전으로 읽힌다.
 */
export function realizedOf(
  records: PlanRecord[],
  entryPrice: number,
): { realized: number | null; realizedPct: number | null } {
  const buys = records.filter((r) => r.side === 'BUY')
  const sells = records.filter((r) => r.side === 'SELL')
  if (sells.length === 0) return { realized: null, realizedPct: null }
  const qty = buys.reduce((a, r) => a + r.quantity, 0)
  const avg = qty
    ? buys.reduce((a, r) => a + r.price * r.quantity, 0) / qty
    : entryPrice
  const sold = sells.reduce((a, r) => a + r.quantity, 0)
  const realized = sells.reduce((a, r) => a + (r.price - avg) * r.quantity, 0)
  return {
    realized: Math.round(realized),
    realizedPct: avg > 0 && sold > 0 ? (realized / (avg * sold)) * 100 : null,
  }
}
