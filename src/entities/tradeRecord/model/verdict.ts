/**
 * 판정 — **단위가 서로 다른 지표를 같은 열에 세우는 표식** (디자인 8장 ①).
 *
 * ⑦ 이 내는 값은 단위가 넷이다 — `%`(승률·평균수익) · `원`(기대값) ·
 * `R`(예측치·자본감소) · `회`(연속 손실). 8장의 문제와 같은 모양이다 —
 *
 * > 📦 KPI 14개, 단위 4종 (% · 시간 · 일 · 0~100 점수)
 * >      ↓ 숫자를 그대로 늘어놓으면 71.2와 7.3과 18.4를 비교할 수 없다
 * >   값 자체를 버리고, 각자의 타겟과의 관계로 환산한다
 * >      ↓
 * > 🎯 측정 단위가 서로 다른 KPI들이 같은 열에서 비교되는 표식
 * >      ↓ 숫자는 옆에 원래 단위 그대로 남는다 — **상태는 아이콘이, 값은 숫자가**
 *
 * 💀 **정도를 얼마나 버리는지는 지표 개수가 정한다** (8장 대비쌍). 8장은
 * 수백 개라 5단계 범주로 접었고, 7장은 일곱 개라 목표 대비 %로 정도를 남겼다.
 * ⑦ 은 **여섯 행**이라 7장 쪽에 가깝다 — 그래서 범주와 «함께» `dir` 로 정도를
 * 남기고, 원의 채움 높이가 그 정도를 그린다.
 */

import type { KpiVerdict, StatTarget } from './types'
import type { SampleTier } from './gate'
import { SAMPLE_MIN } from './gate'

/**
 * 「맞다」와 「근접」의 경계.
 *
 * ⚠️ **8장이 밝히지 않은 자리다** — *「'타겟에 근접'의 경계를 무엇으로 정하는지
 *    … 구현 사항의 「목표보다 높거나 낮은 특정 백분율」이 몇 %인지 책은 밝히지
 *    않는다」* (8장 ※). 그래서 여기 상수 하나로 두고 「임의」로 표시한다 —
 *    ⑦ 이 *「책 우선, 없으면 보수적으로 임의 지정하고 「임의」 표시를 단다」*
 *    고 한 규칙 그대로다.
 */
export const VERDICT_BAND = { on: 0.05, near: 0.2 } as const

/**
 * 값 하나를 판정한다.
 *
 * **순서가 중요하다.** 표본을 먼저 보고(`PENDING`), 그다음 타겟을 본다
 * (`NO_TARGET`). 뒤집으면 「타겟이 없는데 표본도 없는」 칸이 타겟 쪽으로
 * 읽혀서, 쌓이면 열리는 칸과 영영 안 열리는 칸이 같은 기호가 된다.
 *
 * @param value  ⑦ 이 낸 값. 계산이 성립하지 않으면 `null`
 * @param target ④ 에 박혀 있는 값. 아직 안 정했으면 `undefined`
 * @param n      이 값의 표본 건수
 * @param tier   이 값이 몇 건부터 사실인가
 */
export function verdictOf(
  value: number | null,
  target: StatTarget | undefined,
  n: number,
  tier: SampleTier = 'AVG',
): KpiVerdict {
  if (value === null || n < SAMPLE_MIN[tier])
    return { state: 'PENDING', dir: null }
  if (!target || target.value === 0) return { state: 'NO_TARGET', dir: null }

  // 타겟 대비 상대 차이. 단위가 무엇이든 여기서 무단위가 된다 — 그래서 %와
  // 원과 R 이 같은 열에 선다
  const gap = (value - target.value) / Math.abs(target.value)
  const away = Math.abs(gap)

  return {
    state:
      away <= VERDICT_BAND.on
        ? 'ON'
        : away <= VERDICT_BAND.near
          ? 'NEAR'
          : 'OFF',
    /**
     * 원의 채움 높이가 될 값. **근접 경계의 두 배를 꽉 참으로 잡는다.**
     *
     * 💀 `gap` 을 그대로 쓰면 20% 어긋난 값이 5.5px 원에서 1px 띠가 되어
     * **범주는 「어긋남」인데 그림은 빈 원**이 된다. 판정과 그림이 어긋나면
     * 아이콘 열을 훑는 일 자체가 안 된다 (8장 ①). 그래서 경계에 맞춰 편다 —
     * 맞다(≤0.05) → 얇은 띠 · 근접(≤0.2) → 반쯤 · 어긋남 → 반 넘게.
     */
    dir: Math.max(-1, Math.min(1, gap / (VERDICT_BAND.near * 2))),
  }
}

/**
 * 왜 판정이 안 되는지 — **한 줄로 답할 수 있어야 기호를 둘로 가른 값을 한다.**
 *
 * *「이걸 뭉치면 「왜 회색인가」를 다시 물어야 한다」* (8장 ①) 의 반대편이다.
 */
export const VERDICT_WHY: Record<'NO_TARGET' | 'PENDING', string> = {
  NO_TARGET: '④ 에 견줄 값이 아직 없습니다 — 판정이 성립하지 않습니다',
  PENDING: '표본이 문턱 아래입니다 — 값은 있지만 판정을 보류합니다',
}
