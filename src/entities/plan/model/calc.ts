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
