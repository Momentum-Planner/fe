import { describe, expect, it } from 'vitest'
import { scoreOf, sortRanking } from './judge'

const q = (eps: number[], revenue = [10, 9, 8], margin = [8, 9, 10]) => ({
  eps,
  revenue,
  margin,
})

describe('펀더멘털 점수 — 최근 3분기 · 관측 하나에 1점 (0~9)', () => {
  it('20% 이상은 분기마다 · 오름은 분기 사이 비교마다 1점', () => {
    // A — 12 · 20 · 44 / 매출 9 · 13 · 18 / 마진 12.4 · 18.6 · 24.1
    expect(scoreOf(q([12, 20, 44], [9, 13, 18], [12.4, 18.6, 24.1]))).toEqual({
      epsFloor: 2,
      epsUp: 2,
      revenueUp: 2,
      marginUp: 2,
      total: 8,
      epsRise: 32,
    })
    // D — 20% 는 셋 다 넘지만 계속 내린다
    expect(scoreOf(q([30, 25, 22])).total).toBe(5)
  })

  it('5분기가 와도 마지막 3분기만 센다', () => {
    const five = q([1, 90, 30, 25, 22], [1, 2, 10, 9, 8], [1, 2, 8, 9, 10])
    expect(scoreOf(five)).toMatchObject({ total: 5, epsRise: -8 })
  })

  it('점수 순 · 동점은 EPS 증가율 상승폭 · 값 없으면 뒤', () => {
    const rows = [
      { id: 'none', quarters: null },
      { id: 'D', quarters: q([30, 25, 22]) }, // 5 · −8
      { id: 'E', quarters: q([10, 40, 35]) }, // 5 · +25
      { id: 'C', quarters: q([20, 25, 35]) }, // 7
      { id: 'B', quarters: q([5, 8, 10], [4, 6, 9]) }, // 6
    ]
    expect(sortRanking(rows).map((r) => r.id)).toEqual([
      'C',
      'B',
      'E',
      'D',
      'none',
    ])
  })
})
