/**
 * 표본 경계 — **「통계를 믿을 수 있나」는 하나의 질문이 아니다** (⑦).
 *
 * 건수를 세는 것과 평균을 내는 것과 나눠서 비교하는 것은 요구하는 표본이 다르다.
 * 그래서 지표마다 문턱이 다르고, **화면이 위에서 아래로 차례로 열린다.**
 *
 * ```text
 * FACT   1건~   사실이라 표본과 무관하다 — 최대 수익·손실 · 월별 최대 · 벽 침범
 *               자본 감소 · 거래 목록 · 계획 통계 전부
 * AVG    5건~   평균과 비율이 «방향»은 말한다 — 승률 · 평균손익 · 손익비 · 기대값
 *               ⚠️ 값 옆에 「표본 N건」을 «항상» 붙인다
 * SHAPE  10건~  분포의 «모양»을 읽는다 — 오른쪽으로 기울었는가
 * SPLIT  15건~  나눠서 «비교»한다 — 그룹별 · 조건 고정 · 교차 · ⑧ diff
 * ```
 *
 * ⚠️ **경계 셋은 검증 대상이다** — *「책에 근거가 없어 낮춰 잡았다. 쌓이면서
 *    올릴지 본다」*. 그래서 숫자를 화면에 박지 않고 이 파일 하나에 둔다.
 */

export type SampleTier = 'FACT' | 'AVG' | 'SHAPE' | 'SPLIT'

export const SAMPLE_MIN: Record<SampleTier, number> = {
  FACT: 1,
  AVG: 5,
  SHAPE: 10,
  SPLIT: 15,
}

/** 이 층이 열렸나 */
export const opened = (n: number, tier: SampleTier) => n >= SAMPLE_MIN[tier]

/** 몇 건 더 있어야 열리나. 이미 열렸으면 0 */
export const shortBy = (n: number, tier: SampleTier) =>
  Math.max(0, SAMPLE_MIN[tier] - n)

/**
 * 값 옆에 붙는 꼬리표. **AVG 부터는 늘 붙는다** —
 * 표본이 적으면 *「적다고 함께 적는다」* (⑦).
 */
export const sampleNote = (n: number) => `표본 ${n}건`
