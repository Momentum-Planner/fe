import { describe, expect, it } from 'vitest'
import type { TradeRecord, TradeSnapshot } from '@/entities/tradeRecord'
import {
  gatePassed,
  inPeriod,
  isClosed,
  monthRange,
  monthlyFlow,
  planClassOf,
  LIST_FILTER_ALL,
  isNoneGroup,
  filterGroups,
  groupRows,
  listStat,
  liveRows,
  recordRows,
  sortGroups,
  riskStat,
  summarize,
  wallStat,
} from './aggregate'
import type { Closed } from './aggregate'

/** 스냅샷 한 벌. 축이 값을 «고르는» 자리만 인자로 받는다 */
const snap = (over: Partial<TradeSnapshot> = {}): TradeSnapshot => ({
  dailyScreeningResultId: 1,
  date: '2025-06-01',
  entryState: 'BREAKOUT',
  regime: 'start',
  trendPassed: 8,
  trendFailed: [],
  baseNo: 1,
  vcp: true,
  fundamentalScore: 5,
  damageScore: 0,
  entryPosition: 1,
  ...over,
})

let id = 1

const buy = (over: Partial<TradeRecord> = {}): TradeRecord => ({
  recordId: id++,
  stockCode: '000660',
  stockName: 'SK하이닉스',
  side: 'BUY',
  price: 100_000,
  quantity: 10,
  filledAt: '2025-06-02',
  sellReasons: [],
  reason: '',
  planId: 1,
  planTitle: '돌파 100,000',
  accountTotal: 80_000_000,
  estimated: false,
  derived: null,
  snapshot: snap(),
  ...over,
})

const sell = (
  profit: number,
  over: Partial<TradeRecord> & {
    rMultiple?: number | null
    holdingDays?: number
  } = {},
): Closed => {
  const { rMultiple = profit > 0 ? 2 : -1, holdingDays = 18, ...rest } = over
  return {
    ...buy(),
    side: 'SELL',
    filledAt: '2025-06-20',
    derived: {
      entryPrice: 100_000,
      returnPct: profit / 1000,
      profit,
      holdingDays,
      rMultiple,
      riskPct: 1.5,
      riskBand: 'MID',
    },
    ...rest,
  } as Closed
}

describe('② 워터폴 — 막대 끝이 곧 누적이다', () => {
  it('각 막대는 이전 막대가 끝난 지점에서 시작한다', () => {
    const flow = monthlyFlow([
      sell(210_000, { filledAt: '2025-06-10' }),
      sell(245_000, { filledAt: '2025-07-05' }),
      sell(-150_000, { filledAt: '2025-07-20' }),
    ])
    expect(flow.map((f) => [f.base, f.gain, f.loss, f.cum])).toEqual([
      [0, 210_000, 0, 210_000],
      [210_000, 245_000, -150_000, 305_000],
    ])
  })

  it('분할 매도는 같은 달에 수익 막대와 손실 막대를 «둘 다» 세운다', () => {
    const [june] = monthlyFlow([
      sell(300_000, { filledAt: '2025-06-10' }),
      sell(-100_000, { filledAt: '2025-06-12' }),
    ])
    // 순증 하나로 접히면 손실이 숨는다
    expect(june!.gain).toBe(300_000)
    expect(june!.loss).toBe(-100_000)
    expect(june!.net).toBe(200_000)
  })

  it('거래가 없던 달도 행이 남는다 — 빈 것이 정보다', () => {
    const flow = monthlyFlow([
      sell(100, { filledAt: '2025-06-10' }),
      sell(100, { filledAt: '2025-09-10' }),
    ])
    expect(flow.map((f) => f.month)).toEqual([
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
    ])
    expect(flow[1]!.n).toBe(0)
    // 누적은 그대로 이어진다
    expect(flow[1]!.cum).toBe(flow[0]!.cum)
  })

  it('해를 넘겨도 빠짐없이 편다', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })
})

describe('벽(−1R)과 R 평균 — 계획 없는 매매는 이 셈에 없다', () => {
  const rows = [
    sell(1, { rMultiple: -1 }),
    sell(1, { rMultiple: -2.1 }),
    sell(1, { rMultiple: 3 }),
    sell(-1, { rMultiple: null, planId: null }),
    sell(-1, { rMultiple: null, planId: null }),
  ]

  it('1R 이 없는 건수를 «따로» 센다 — 지우지 않는다', () => {
    const w = wallStat(rows)
    expect(w.planned).toBe(3)
    expect(w.unplanned).toBe(2)
  })

  it('벽 왼쪽은 «넘긴» 것만이다 — 정확히 −1R 은 안 넘겼다', () => {
    expect(wallStat(rows).wallBreaks).toBe(1)
  })

  it('R 평균은 «R 축에 오른 전부»의 평균이다 — 넘긴 것만이 아니다', () => {
    // (−1 + −2.1 + 3) / 3
    expect(wallStat(rows).avgR).toBeCloseTo(-0.0333, 3)
  })

  it('R 축이 비면 평균도 비운다 — 0 으로 채우지 않는다', () => {
    expect(
      wallStat([sell(1, { rMultiple: null, planId: null })]).avgR,
    ).toBeNull()
  })
})

describe('위험 관리 — 「무엇을 걸고 벌었나」', () => {
  it('자본 감소는 «고점 대비» 최대 낙폭이다 — 1건부터 사실이다', () => {
    const r = riskStat([
      sell(300_000, { filledAt: '2025-06-01' }),
      sell(-500_000, { filledAt: '2025-06-05' }),
      sell(-100_000, { filledAt: '2025-06-09' }),
      sell(400_000, { filledAt: '2025-06-20' }),
    ])
    // 고점 300,000 → 바닥 −300,000
    expect(r.maxDrawdown).toBe(600_000)
    expect(r.maxDrawdownAt).toBe('2025-06-09')
    // 마지막에 +400,000 → 누적 100,000, 고점은 여전히 300,000
    expect(r.currentDrawdown).toBe(200_000)
  })

  it('연속 손실은 «가장 길게 이어진» 것이고 지금 것과 다르다', () => {
    const r = riskStat([
      sell(-1, { filledAt: '2025-06-01' }),
      sell(-1, { filledAt: '2025-06-02' }),
      sell(-1, { filledAt: '2025-06-03' }),
      sell(1, { filledAt: '2025-06-04' }),
      sell(-1, { filledAt: '2025-06-05' }),
    ])
    expect(r.lossStreak).toBe(3)
    expect(r.currentStreak).toBe(1)
  })

  it('위험노출을 «못 낸» 건수는 평균에 안 섞인다 — 0 으로 채우지 않는다', () => {
    const r = riskStat([
      sell(1, { derived: { ...sell(1).derived, riskPct: 1 } }),
      sell(1, { derived: { ...sell(1).derived, riskPct: 3 } }),
      sell(1, { derived: { ...sell(1).derived, riskPct: null } }),
    ])
    expect(r.avgRiskPct).toBe(2)
    expect(r.maxRiskPct).toBe(3)
    expect(r.overCount).toBe(1)
    expect(r.unknownRisk).toBe(1)
  })
})

describe('계획 유무 — 둘이다', () => {
  it('게이트는 «다른» 축이 센다 — 계획이 있으면 트렌드가 몇이든 「있음」이다', () => {
    expect(planClassOf(buy())).toBe('YES')
    expect(planClassOf(buy({ snapshot: snap({ trendPassed: 7 }) }))).toBe('YES')
    expect(planClassOf(buy({ planId: null }))).toBe('NONE')

    expect(gatePassed(buy())).toBe(true)
    expect(gatePassed(buy({ snapshot: snap({ trendPassed: 7 }) }))).toBe(false)
  })
})

describe('③ 요약 지표', () => {
  it('손익비는 진 거래가 있어야 선다 — 없으면 비운다', () => {
    expect(summarize([sell(1), sell(1)]).payoff).toBeNull()
    expect(summarize([sell(1), sell(-1)]).payoff).toBeCloseTo(1)
  })

  it('기대값은 매도 한 건이 남긴 평균 금액이다', () => {
    expect(summarize([sell(300_000), sell(-100_000)]).expectancy).toBe(100_000)
  })
})

describe('목록 — 계획이 제목, 체결이 행 (Q13)', () => {
  it('행은 여전히 체결 하나다 — 최신이 위', () => {
    const rows = recordRows([
      buy({ filledAt: '2025-06-02' }),
      sell(1, { filledAt: '2025-06-20' }),
      sell(1, { filledAt: '2025-06-25' }),
    ])
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.rec.filledAt)).toEqual([
      '2025-06-25',
      '2025-06-20',
      '2025-06-02',
    ])
  })

  it('계획으로 묶고 · 묶음 안은 시간 오름차순 · 묶음끼리는 손익 합계 순 (Q14)', () => {
    const groups = groupRows(
      recordRows([
        buy({ planId: 1, filledAt: '2025-06-02' }),
        sell(100_000, { planId: 1, filledAt: '2025-06-20' }),
        buy({ planId: 2, filledAt: '2025-06-05' }),
        sell(500_000, { planId: 2, filledAt: '2025-07-01' }),
        buy({ planId: 3, filledAt: '2025-08-01' }),
      ]),
    )
    // 수익 큰 순 — 매도 없는 계획은 맨 끝
    expect(groups.map((g) => g.planId)).toEqual([2, 1, 3])
    expect(sortGroups(groups, 'LOSS').map((g) => g.planId)).toEqual([1, 2, 3])
    const one = groups.find((g) => g.planId === 1)!
    expect(one.rows.map((r) => r.rec.filledAt)).toEqual([
      '2025-06-02',
      '2025-06-20',
    ])
    expect([one.firstAt, one.lastAt]).toEqual(['2025-06-02', '2025-06-20'])
  })

  it('계획 없는 체결은 «매도 하나가 한 줄» — 그 매수는 보유일수로 거슬러 붙는다', () => {
    const groups = groupRows(
      recordRows([
        buy({ planId: null, stockCode: 'A', filledAt: '2025-06-02' }),
        sell(-1, {
          planId: null,
          stockCode: 'A',
          filledAt: '2025-06-10',
          holdingDays: 8,
        }),
        buy({ planId: null, stockCode: 'B', filledAt: '2025-06-03' }),
        sell(1, {
          planId: null,
          stockCode: 'B',
          filledAt: '2025-06-04',
          holdingDays: 1,
        }),
        buy({ planId: null, stockCode: 'C', filledAt: '2025-06-05' }),
      ]),
    )
    const none = groups.filter(isNoneGroup)
    expect(none).toHaveLength(3)
    expect(none.map((g) => g.rows.length)).toEqual([2, 2, 1])
    // 짝 없는 매수는 결과가 없어 맨 끝
    expect(none.at(-1)!.sells).toBe(0)
  })

  it('머리줄 합계는 매도 행의 합 — 매도가 없으면 0건이다 (0원으로 적지 않는다)', () => {
    const [g] = groupRows(
      recordRows([
        buy({ filledAt: '2025-06-02' }),
        sell(300_000, { filledAt: '2025-06-20' }),
        sell(-100_000, { filledAt: '2025-06-25' }),
      ]),
    )
    expect(g!.sells).toBe(2)
    expect(g!.realized).toBe(200_000)

    const [only] = groupRows(recordRows([buy({ planId: 9 })]))
    expect(only!.sells).toBe(0)
  })

  it('머리줄의 셈은 «매도»를 센다 — 위의 요약과 같은 수여야 한다', () => {
    const stat = listStat(
      recordRows([
        buy({ filledAt: '2025-06-02' }),
        sell(300_000, { filledAt: '2025-06-20' }),
        sell(-100_000, { filledAt: '2025-06-25' }),
        buy({ planId: null, planTitle: null, filledAt: '2025-07-01' }),
        sell(-50_000, { planId: null, filledAt: '2025-07-05' }),
      ]),
    )
    expect(stat.fills).toBe(5)
    expect(stat.buys).toBe(2)
    expect(stat.sells).toBe(3)
    expect(stat.realized).toBe(150_000)
    expect(stat.planned + stat.unplanned).toBe(stat.sells)
  })

  describe('필터', () => {
    const groups = () =>
      groupRows(
        recordRows([
          buy({ planId: 1, filledAt: '2025-06-02' }),
          sell(1, { planId: 1, filledAt: '2025-07-20' }),
          buy({
            planId: null,
            planTitle: null,
            stockName: '카카오',
            stockCode: '035720',
            filledAt: '2025-07-01',
            snapshot: snap({ trendPassed: 6 }),
          }),
          sell(-1, {
            planId: null,
            stockName: '카카오',
            stockCode: '035720',
            filledAt: '2025-07-05',
            snapshot: snap({ trendPassed: 6 }),
          }),
        ]),
      )
    const all = LIST_FILTER_ALL
    const count = (f: typeof all) => liveRows(filterGroups(groups(), f)).length

    it('계획 · 게이트 · 종목은 행을 거른다', () => {
      expect(count(all)).toBe(4)
      expect(count({ ...all, plan: 'NONE' })).toBe(2)
      expect(count({ ...all, gate: 'PASS' })).toBe(2)
      expect(count({ ...all, q: '카카' })).toBe(2)
      expect(count({ ...all, q: '0357' })).toBe(2)
    })

    it('체결일에 걸친 묶음은 «통째로» 나오고 범위 밖은 흐리게 따라온다', () => {
      const f = { ...all, from: '2025-07-10' }
      const shown = filterGroups(groups(), f)
      // 계획 1 은 7/20 매도가 범위 안 → 6/2 매수도 흐리게 따라온다
      const plan = shown.find((g) => g.planId === 1)!
      expect(plan.rows.map((r) => !!r.dim)).toEqual([true, false])
      // 계획에 없음은 범위 안의 행이 없어 빠진다
      expect(shown.find(isNoneGroup)).toBeUndefined()
      // 흐린 행은 셈에 없다
      expect(liveRows(shown)).toHaveLength(1)
    })
  })
})

describe('세는 단위와 기간', () => {
  it('매도 기록만 센다 — 매수는 결과가 없다', () => {
    expect([buy(), sell(1)].filter(isClosed)).toHaveLength(1)
  })

  it('기간은 «달» 단위로 포함한다', () => {
    const r = sell(1, { filledAt: '2025-07-31' })
    expect(inPeriod(r, null)).toBe(true)
    expect(inPeriod(r, { from: '2025-07', to: '2025-07' })).toBe(true)
    expect(inPeriod(r, { from: '2025-08', to: '2025-09' })).toBe(false)
  })
})
