import type { Quarters } from './judge'

/** 백엔드 RankingV1Dto 와 대응하는 랭킹 도메인 타입. */

/** 레짐. 돌파 실패는 폐기되어 둘만 남았고, 화면에서는 둘을 합쳐 하나로 보여준다. */
export type Regime = 'success' | 'ready'

/** 랭킹 1개 종목. 금액/지표는 BigDecimal → number 로 직렬화된다. */
export interface RankingItem {
  stockName: string
  stockCode: string
  /** 조회 시점 기준 최근 체결가. 틱이 없으면 null. */
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
  /**
   * ①-2 — 최근 3분기의 EPS 증가율 · 매출 증가율(전년 동기) · 마진율.
   * 순위는 이것으로 판정한다 (`judge.ts`).
   *
   * ⚠️ **백엔드 DTO 에 없다** — msw 목만 채운다. 그래서 nullable 이다.
   */
  quarters: Quarters | null
}

export interface RankingResponse {
  stocks: RankingItem[]
}
