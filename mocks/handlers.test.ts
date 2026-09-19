import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { at } from '@/shared/lib/at'
import { server } from './server'

/**
 * 목 핸들러가 백엔드 DTO 모양을 지키는지 본다.
 * 백엔드가 안 떠 있는 동안 화면이 도는 근거라서, 모양이 어긋나면 화면이 조용히 빈다.
 */

const BASE = 'http://localhost:3000'

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`)
  const json = (await res.json()) as {
    meta: { result: string }
    data: unknown
  }
  return { status: res.status, ...json }
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as {
    meta: { result: string }
    data: unknown
  }
  return { status: res.status, ...json }
}

async function send(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  const json = (await res.json()) as {
    meta: { result: string; errorCode: string | null }
    data: unknown
  }
  return { status: res.status, ...json }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('차트', () => {
  it('일봉은 ApiResponse 래퍼 안에 candles 를 준다', async () => {
    const r = await get('/api/v1/stocks/000660/chart/daily')
    expect(r.status).toBe(200)
    expect(r.meta.result).toBe('SUCCESS')

    const { candles } = r.data as { candles: Array<Record<string, unknown>> }
    expect(candles.length).toBeGreaterThan(200)
    expect(candles[0]).toEqual({
      tradeDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      openPrice: expect.any(Number),
      highPrice: expect.any(Number),
      lowPrice: expect.any(Number),
      closePrice: expect.any(Number),
      volume: expect.any(Number),
    })
  })

  it('일봉은 날짜 오름차순이고 고가 ≥ 저가다', async () => {
    const r = await get('/api/v1/stocks/000660/chart/daily')
    const { candles } = r.data as {
      candles: Array<{
        tradeDate: string
        highPrice: number
        lowPrice: number
        openPrice: number
        closePrice: number
      }>
    }
    for (let i = 1; i < candles.length; i++) {
      expect(at(candles, i).tradeDate > at(candles, i - 1).tradeDate).toBe(true)
    }
    for (const c of candles) {
      expect(c.highPrice).toBeGreaterThanOrEqual(c.lowPrice)
      expect(c.highPrice).toBeGreaterThanOrEqual(
        Math.max(c.openPrice, c.closePrice),
      )
      expect(c.lowPrice).toBeLessThanOrEqual(
        Math.min(c.openPrice, c.closePrice),
      )
    }
  })

  it('같은 종목은 매번 같은 캔들을 준다 (seed 고정)', async () => {
    const a = await get('/api/v1/stocks/000660/chart/daily')
    const b = await get('/api/v1/stocks/000660/chart/daily')
    expect(a.data).toEqual(b.data)
  })

  it('종목이 다르면 캔들도 다르다', async () => {
    const a = await get('/api/v1/stocks/000660/chart/daily')
    const b = await get('/api/v1/stocks/005930/chart/daily')
    expect(a.data).not.toEqual(b.data)
  })

  it('이동평균은 period 만큼 워밍업을 뺀 개수를 준다', async () => {
    const daily = await get('/api/v1/stocks/000660/chart/daily')
    const total = (daily.data as { candles: unknown[] }).candles.length

    for (const [period, n] of [
      ['MA_50', 50],
      ['MA_150', 150],
      ['MA_200', 200],
    ] as const) {
      const r = await get(
        `/api/v1/stocks/000660/chart/moving-averages?period=${period}`,
      )
      const d = r.data as { period: string; dataPoints: unknown[] }
      expect(d.period).toBe(period)
      expect(d.dataPoints).toHaveLength(total - n + 1)
    }
  })

  it('베이스는 지지 < 저항이고 시작일 < 종료일이다', async () => {
    const r = await get('/api/v1/stocks/000660/chart/bases')
    const { bases } = r.data as {
      bases: Array<{
        startDate: string
        endDate: string
        supportPrice: number
        resistancePrice: number
      }>
    }
    expect(bases.length).toBeGreaterThan(0)
    for (const b of bases) {
      expect(b.supportPrice).toBeLessThan(b.resistancePrice)
      expect(b.startDate < b.endDate).toBe(true)
    }
  })
})

describe('인사이트 8종', () => {
  const kinds = [
    'regime',
    'moving-average',
    'momentum',
    'volume',
    'fip',
    'rs',
    'eps',
    'base-stage',
  ]

  it.each(kinds)('%s 는 200 과 객체를 준다', async (kind) => {
    const r = await get(`/api/v1/stocks/000660/insight/${kind}`)
    expect(r.status).toBe(200)
    expect(r.meta.result).toBe('SUCCESS')
    expect(r.data).toBeTypeOf('object')
    expect(r.data).not.toBeNull()
  })

  it('regime 은 지지 < 저항을 지킨다', async () => {
    const r = await get('/api/v1/stocks/000660/insight/regime')
    const d = r.data as {
      regime: string
      supportLine: number
      resistanceLine: number
      currentPrice: number
    }
    expect(d.supportLine).toBeLessThan(d.resistanceLine)
    expect(d.currentPrice).toBeGreaterThan(0)
    expect(typeof d.regime).toBe('string')
  })

  it('moving-average 의 비교 플래그가 값과 일치한다', async () => {
    const r = await get('/api/v1/stocks/000660/insight/moving-average')
    const d = r.data as {
      currentPrice: number
      ma50: number
      ma150: number
      ma200: number
      isAboveMa50: boolean
      isMa50AboveMa150: boolean
      isMa150AboveMa200: boolean
    }
    expect(d.isAboveMa50).toBe(d.currentPrice > d.ma50)
    expect(d.isMa50AboveMa150).toBe(d.ma50 > d.ma150)
    expect(d.isMa150AboveMa200).toBe(d.ma150 > d.ma200)
  })

  it('eps 는 분기 4개를 준다', async () => {
    const r = await get('/api/v1/stocks/000660/insight/eps')
    const d = r.data as {
      quarterlyEps: Array<{ quarter: string; eps: number }>
    }
    expect(d.quarterlyEps).toHaveLength(4)
  })
})

describe('관심 종목', () => {
  it('추가하면 목록에 뜨고, 지우면 빠진다', async () => {
    const before = await get('/api/v1/stocks/likes')
    const codes = () =>
      (before.data as { stocks: Array<{ stockCode: string }> }).stocks.map(
        (s) => s.stockCode,
      )
    expect(codes()).toContain('000660') // 초기값

    await fetch(`${BASE}/api/v1/stocks/005930/like`, { method: 'POST' })
    const added = await get('/api/v1/stocks/likes')
    const addedCodes = (
      added.data as { stocks: Array<{ stockCode: string }> }
    ).stocks.map((s) => s.stockCode)
    expect(addedCodes).toContain('005930')

    await fetch(`${BASE}/api/v1/stocks/005930/like`, { method: 'DELETE' })
    const removed = await get('/api/v1/stocks/likes')
    const removedCodes = (
      removed.data as { stocks: Array<{ stockCode: string }> }
    ).stocks.map((s) => s.stockCode)
    expect(removedCodes).not.toContain('005930')
  })

  it('종목명이 함께 온다', async () => {
    const r = await get('/api/v1/stocks/likes')
    const { stocks } = r.data as {
      stocks: Array<{ stockCode: string; stockName: string }>
    }
    expect(at(stocks, 0).stockName).toBe('SK하이닉스')
  })
})

describe('랭킹 · 검색', () => {
  it.each(['breakout-success', 'breakout-ready'])(
    '%s 랭킹은 종목마다 최근 5분기 EPS · 매출 · 마진을 싣는다',
    async (regime) => {
      const r = await get(`/api/v1/ranking/${regime}`)
      const { stocks } = r.data as {
        stocks: Array<{
          quarters: { eps: number[]; revenue: number[]; margin: number[] }
        }>
      }
      expect(stocks.length).toBeGreaterThan(0)
      for (const { quarters } of stocks) {
        expect(quarters.eps).toHaveLength(5)
        expect(quarters.revenue).toHaveLength(5)
        expect(quarters.margin).toHaveLength(5)
      }
    },
  )

  it('검색은 종목명 부분일치로 찾는다', async () => {
    const r = await get('/api/v1/search/stocks?query=하이닉스')
    const { stocks } = r.data as { stocks: Array<{ stockCode: string }> }
    expect(stocks).toHaveLength(1)
    expect(at(stocks, 0).stockCode).toBe('000660')
  })

  it('검색어가 비면 빈 배열을 준다', async () => {
    const r = await get('/api/v1/search/stocks?query=')
    expect((r.data as { stocks: unknown[] }).stocks).toEqual([])
  })
})

/**
 * 계획 수정.
 *
 * 목이 **파생을 다시 만드는지**가 요점이다. 위험노출·최저손절가·후보 선을 손으로
 * 덮어쓰면 저장 전 미리보기와 저장 후 값이 어긋나고, 그 어긋남은 사용자에게
 * 「내가 잘못 넣었나」로 읽힌다.
 */
describe('계획 수정', () => {
  type Plan = {
    planId: number
    entryPrice: number
    stopPrice: number
    quantity: number
    riskBefore: number
    riskAfter: number
    accountTotal: number
    memo: string
    plannedStop: { bands: { stopPrice: number; weight: number }[] }
    stopCandidates: { price: number; chosen: boolean }[]
    snapshot: { date: string }
  }

  it('수량을 고치면 «위험노출»이 따라 바뀐다', async () => {
    const before = (await get('/api/v1/plans/2')).data as Plan
    const r = await patch('/api/v1/plans/2', { quantity: 200 })
    const after = r.data as Plan

    expect(after.quantity).toBe(200)
    // 몫이 절반이 됐으니 «얹히는 만큼»도 절반이다 (riskBefore 위에 더한다).
    // 목이 riskAfter 를 소수 2자리로 반올림하므로 그 폭 안에서 본다
    const own = (p: Plan) => p.riskAfter - p.riskBefore
    expect(Math.abs(own(after) - own(before) / 2)).toBeLessThan(0.011)
  })

  it('손절가를 고치면 «최저손절가»와 구간이 같이 간다', async () => {
    const r = await patch('/api/v1/plans/2', { stopPrice: 65_000 })
    const p = r.data as Plan
    expect(p.stopPrice).toBe(65_000)
    // v1 은 구간이 «하나»다 — 비중 100 · 순번 1 (④-1-2)
    expect(p.plannedStop.bands).toHaveLength(1)
    expect(at(p.plannedStop.bands, 0).weight).toBe(100)
  })

  it('진입가를 고치면 «후보 선»이 다시 만들어진다', async () => {
    const before = (await get('/api/v1/plans/3')).data as Plan
    const r = await patch('/api/v1/plans/3', { entryPrice: 70_000 })
    const after = r.data as Plan
    expect(after.entryPrice).toBe(70_000)
    // 후보 선은 진입가에서 비율로 나오므로 값이 통째로 옮겨간다
    expect(at(after.stopCandidates, 0).price).not.toBe(
      at(before.stopCandidates, 0).price,
    )
  })

  it('스냅샷은 «안 바뀐다» — 사후에 못 만든다 (F4)', async () => {
    const before = (await get('/api/v1/plans/2')).data as Plan
    const r = await patch('/api/v1/plans/2', {
      entryPrice: 71_000,
      memo: '고쳐 본다',
    })
    const after = r.data as Plan
    expect(after.memo).toBe('고쳐 본다')
    expect(after.snapshot.date).toBe(before.snapshot.date)
  })

  it('없는 계획은 404', async () => {
    const r = await patch('/api/v1/plans/99999', { quantity: 1 })
    expect(r.status).toBe(404)
    expect(r.meta.result).toBe('FAIL')
  })
})

/**
 * 폐기와 삭제 (Q8).
 *
 * 요점은 **둘이 다른 결과를 남기는지**다 — 폐기는 행이 남고 ⑦가 세고, 삭제는
 * 사라지고 안 센다. 뭉치면 「내 계획이 성급한지」와 「내가 잘못 적었는지」를
 * 구분할 수 없다 (③-2-3 의 보정과 같은 자리).
 */
describe('계획 폐기와 삭제', () => {
  type Plan = {
    planId: number
    status: string
    closeReason: string | null
    stockCode: string
    recordCount: number
    quantity: number
    stopPrice: number
    snapshot: {
      date: string
      trend: { close: number }
      fundamentals: { quarters: unknown[] }
    }
  }
  const list = async () =>
    ((await get('/api/v1/plans')).data as { plans: { planId: number }[] }).plans

  /** 목은 메모리를 «공유»하므로 테스트마다 새 계획을 세워서 쓴다 */
  const fresh = async (over: Record<string, unknown> = {}) =>
    (
      await send('POST', '/api/v1/plans', {
        stockCode: '000660',
        side: 'BUY',
        title: '테스트 계획',
        snapshotDate: '2026-09-08',
        entryPrice: 1_200_000,
        stopPrice: 1_150_000,
        quantity: 5,
        memo: '',
        goals: [2],
        previousPlanId: null,
        ...over,
      })
    ).data as Plan

  it('세운 계획은 «대기»로 나고 목록에 뜬다', async () => {
    const p = await fresh()
    expect(p.status).toBe('PLANNED')
    // 파생이 채워진다 — 최저손절가·수량은 손으로 박는 값이 아니다
    expect(p.stopPrice).toBe(1_150_000)
    expect(p.quantity).toBe(5)
    expect((await list()).some((x) => x.planId === p.planId)).toBe(true)
  })

  it('스냅샷은 «고른 날짜»의 행을 서버가 붙인다 — 값은 입력으로 받지 않는다 (F4 · Q11 A)', async () => {
    const rows = (
      (await get('/api/v1/stocks/000660/screening')).data as {
        results: { date: string }[]
      }
    ).results
    const day = rows.at(-3)!.date
    const p = await fresh({ snapshotDate: day })
    expect(p.snapshot.date).toBe(day)
    // 원값이 같이 붙는다 (Q12)
    expect(p.snapshot.trend.close).toBeGreaterThan(0)
    expect(p.snapshot.fundamentals.quarters).toHaveLength(3)
  })

  it('Q16 실행 중 계획의 사다리 — 닿은 날은 캔들 종가에서 찾고, 고를 차례에는 그날 값이 붙는다', async () => {
    const p = (await get('/api/v1/plans/1')).data as {
      stopPrice: number
      goals: { r: number; hitAt: string | null; picked: unknown }[]
      pickBasis: { close: number; ma20: number; sampleCount: number } | null
    }
    expect(p.goals.map((g) => g.r)).toEqual([2, 3])
    // 2R 은 전에 도착해 본전을 고른 이력 · 3R 이 지금 목표 — 도착했고 고를 차례
    expect(p.goals[0]?.picked).not.toBeNull()
    expect(p.goals[1]?.hitAt).not.toBeNull()
    expect(p.goals[1]?.picked).toBeNull()
    expect(p.pickBasis?.close).toBeGreaterThanOrEqual(1_240_000)
    expect(p.pickBasis?.sampleCount).toBeGreaterThanOrEqual(0)
  })

  it('Q16 스톱 자리 고르기 — 지금 스톱 이하 · 목표 이상은 서버가 막고, 고르면 손절가가 바뀐다', async () => {
    const low = await send('POST', '/api/v1/plans/1/stop-pick', {
      goalIndex: 1,
      pick: { kind: 'BREAKEVEN', price: 1_120_000 },
    })
    expect(low.status).toBe(400)
    const wrong = await send('POST', '/api/v1/plans/1/stop-pick', {
      goalIndex: 2,
      pick: { kind: 'R', r: 1, price: 1_160_000 },
    })
    expect(wrong.status).toBe(409)
    const r = await send('POST', '/api/v1/plans/1/stop-pick', {
      goalIndex: 1,
      pick: { kind: 'R', r: 1, price: 1_160_000 },
    })
    expect(r.status).toBe(200)
    const p = r.data as { stopPrice: number; goals: { picked: unknown }[] }
    expect(p.stopPrice).toBe(1_160_000)
    expect(p.goals[1]?.picked).toEqual({ kind: 'R', r: 1, price: 1_160_000 })
    // 같은 단을 두 번 못 고른다
    const again = await send('POST', '/api/v1/plans/1/stop-pick', {
      goalIndex: 1,
      pick: { kind: 'R', r: 2, price: 1_200_000 },
    })
    expect(again.status).toBe(409)
  })

  it('Q16 도착한 목표는 못 바꾼다 · 오름차순 · 안 닿은 목표는 하나까지', async () => {
    const locked = await send('PATCH', '/api/v1/plans/1', {
      goals: [2.5, 3, 4],
    })
    expect(locked.status).toBe(400)
    const down = await send('POST', '/api/v1/plans', {
      stockCode: '000660',
      title: '내림차순',
      entryPrice: 1_200_000,
      stopPrice: 1_150_000,
      quantity: 1,
      memo: '',
      goals: [3, 2],
      previousPlanId: null,
    })
    expect(down.status).toBe(400)
    // 목표 둘을 한 번에 못 건다 — 새 계획도, 도착 뒤 다음 목표도 하나
    const two = await send('PATCH', '/api/v1/plans/1', { goals: [2, 3, 4, 6] })
    expect(two.status).toBe(400)
    const twoNew = await send('POST', '/api/v1/plans', {
      stockCode: '000660',
      title: '목표 둘',
      entryPrice: 1_200_000,
      stopPrice: 1_150_000,
      quantity: 1,
      memo: '',
      goals: [2, 3],
      previousPlanId: null,
    })
    expect(twoNew.status).toBe(400)
    const next = await send('PATCH', '/api/v1/plans/1', { goals: [2, 3, 4] })
    expect(next.status).toBe(200)
  })

  it('Q17 새 계획 전에 볼 것 — 연속 손실 · 승률 · 이 종목 · 진입 상태별', async () => {
    const b = (await get('/api/v1/stocks/000660/plan-briefing')).data as {
      recent: {
        lossStreak: number
        recentN: number
        overallN: number
        overallWinRate: number | null
        accountRisk: number
      }
      stock: { trades: number; wins: number; losses: number; holding: unknown }
      byEntryState: Record<string, { n: number; winRate: number }>
    }
    expect(b.recent.overallN).toBeGreaterThan(0)
    expect(b.recent.recentN).toBeLessThanOrEqual(10)
    expect(b.recent.lossStreak).toBeGreaterThanOrEqual(0)
    expect(b.recent.accountRisk).toBeGreaterThan(0)
    // 이 종목은 실행 중 계획이 있다 — 들고 있는 것이 붙는다
    expect(b.stock.holding).not.toBeNull()
    expect(b.stock.wins + b.stock.losses).toBe(b.stock.trades)
    const groups = Object.values(b.byEntryState)
    expect(groups.reduce((n, g) => n + g.n, 0)).toBeLessThanOrEqual(
      b.recent.overallN,
    )
  })

  it('Q12 계획 기본값에 표본 수가 온다 — 평균 수익률 후보를 고를 수 있는지가 여기서 갈린다', async () => {
    const d = (await get('/api/v1/stocks/000660/plan-defaults')).data as {
      sampleCount: number
    }
    expect(d.sampleCount).toBeGreaterThanOrEqual(0)
  })

  it('폐기하면 «남는다» — 상태와 사유만 바뀐다', async () => {
    const p = await fresh()
    const r = await send('POST', `/api/v1/plans/${p.planId}/close`, {
      closeReason: '돌파가 거래량 없이 나왔다',
    })
    const after = r.data as Plan
    expect(after.status).toBe('CLOSED')
    expect(after.closeReason).toBe('돌파가 거래량 없이 나왔다')
    // 계획은 사라지지 않는다. 상태만 바뀐다 (④-2)
    expect((await list()).some((x) => x.planId === p.planId)).toBe(true)
  })

  it('사유 없이 폐기할 수 없다 — 판단에는 이유가 있다', async () => {
    const p = await fresh()
    const r = await send('POST', `/api/v1/plans/${p.planId}/close`, {
      closeReason: '   ',
    })
    expect(r.status).toBe(400)
    expect(r.meta.errorCode).toBe('CLOSE_REASON_REQUIRED')
  })

  it('삭제하면 «사라진다»', async () => {
    const p = await fresh()
    const r = await send('DELETE', `/api/v1/plans/${p.planId}`)
    expect(r.status).toBe(200)
    expect((await list()).some((x) => x.planId === p.planId)).toBe(false)
    expect((await get(`/api/v1/plans/${p.planId}`)).status).toBe(404)
  })

  it('폐기한 계획은 «못 지운다» — 그건 판단이라 ⑦의 재료다', async () => {
    const p = await fresh()
    await send('POST', `/api/v1/plans/${p.planId}/close`, {
      closeReason: '안 가기로 했다',
    })
    const r = await send('DELETE', `/api/v1/plans/${p.planId}`)
    expect(r.status).toBe(409)
    expect(r.meta.errorCode).toBe('NOT_DELETABLE')
  })

  it('체결이 붙은 계획은 «못 지운다» — 돈이 실제로 움직였다', async () => {
    // 목의 1번은 실행 중 + 체결이 있다
    const running = (await get('/api/v1/plans/1')).data as Plan
    expect(running.recordCount).toBeGreaterThan(0)
    const r = await send('DELETE', '/api/v1/plans/1')
    expect(r.status).toBe(409)
  })

  it('이미 닫힌 계획과 «없는» 계획을 가른다', async () => {
    const p = await fresh()
    await send('POST', `/api/v1/plans/${p.planId}/close`, { closeReason: 'x' })
    // 닫힌 계획은 더 닫을 것이 없다 — 대기가 아니므로 같은 문턱에 걸린다
    const again = await send('POST', `/api/v1/plans/${p.planId}/close`, {
      closeReason: 'y',
    })
    expect(again.status).toBe(409)
    expect(again.meta.errorCode).toBe('NOT_CLOSABLE')

    const missing = await send('POST', '/api/v1/plans/99999/close', {
      closeReason: 'y',
    })
    expect(missing.status).toBe(404)
    expect(missing.meta.errorCode).toBe('NOT_FOUND')
  })

  it('체결이 붙은 계획은 «못 닫는다» — 「안 갔다」가 거짓이 된다', async () => {
    // 목의 1번은 실행 중 + 체결이 있다. 폐기와 삭제가 «같은 문턱»이다 (Q8)
    const r = await send('POST', '/api/v1/plans/1/close', {
      closeReason: '판단이 틀렸다',
    })
    expect(r.status).toBe(409)
    expect(r.meta.errorCode).toBe('NOT_CLOSABLE')
  })
})

/**
 * 하루치 스크리닝 판정 (⑤-2 · `DailyScreeningResult`).
 *
 * 요점은 **캔들과 어긋나지 않는지**다. 판정을 따로 난수로 만들면 봉은 오르는데
 * 「진입 불가」가 뜨는 식으로 화면이 거짓말을 한다 — 계획을 세우는 화면에서
 * 근거와 그림이 어긋나면 그 화면은 아무 말도 못 하는 것이 된다.
 */
describe('스크리닝 판정 목록', () => {
  type Row = {
    dailyScreeningResultId: number
    date: string
    entryState: string
    fundamentalScore: number
    damageScore: number
    entryPosition: number
    trendPassed: number
    trendFailed: string[]
  }
  const list = async (q = '') =>
    (
      (await get(`/api/v1/stocks/000660/screening${q}`)).data as {
        results: Row[]
      }
    ).results

  it('종목 × 일자로 «쌓인» 행을 준다', async () => {
    const rows = await list()
    expect(rows.length).toBeGreaterThan(50)
    // 날짜 오름차순이고 겹치지 않는다 — 하루가 한 행이다
    const dates = rows.map((r) => r.date)
    expect([...dates].sort()).toEqual(dates)
    expect(new Set(dates).size).toBe(dates.length)
  })

  it('매일 있지 «않다» — 게이트에 걸린 날은 행이 없다', async () => {
    const rows = await list()
    const candles = (
      (await get('/api/v1/stocks/000660/chart/daily')).data as {
        candles: { tradeDate: string }[]
      }
    ).candles
    const covered = candles.filter((c) => c.tradeDate >= (rows[0]?.date ?? ''))
    // 그 빈칸이 「후보가 아니었던 날」이다 (디자인 3장 ⑤ — 간극이 정보다)
    expect(rows.length).toBeLessThan(covered.length)
  })

  it('판정이 «봉의 자리»와 맞는다 — 돌파는 고점 근처에서만 난다', async () => {
    const rows = await list()
    for (const r of rows) {
      if (r.entryState === 'BREAKOUT')
        expect(r.entryPosition).toBeGreaterThan(-2)
      if (r.entryState === 'BLOCKED') expect(r.entryPosition).toBeLessThan(-8)
    }
  })

  it('트렌드는 «대개 8/8» 이고, 어긋나면 이름이 붙는다', async () => {
    const rows = await list()
    const full = rows.filter((r) => r.trendPassed === 8)
    expect(full.length).toBeGreaterThan(rows.length / 2)
    for (const r of rows) {
      expect(r.trendFailed.length).toBe(8 - r.trendPassed)
    }
  })

  it('기간으로 끊어 온다', async () => {
    const all = await list()
    const mid = all[Math.floor(all.length / 2)]!.date
    const cut = await list(`?from=${mid}`)
    expect(cut.length).toBeLessThan(all.length)
    expect(cut.every((r) => r.date >= mid)).toBe(true)
  })

  it('Q12 원값을 같이 준다 — 트렌드는 캔들에서, 펀더멘털은 세 분기', async () => {
    type Raw = Row & {
      trend: { close: number; ma50: number; ma150: number; ma200: number }
      fundamentals: { disclosedAt: string; quarters: { label: string }[] }
    }
    const rows = (await list()) as Raw[]
    const last = rows.at(-1)!
    const candles = (
      (await get('/api/v1/stocks/000660/chart/daily')).data as {
        candles: { tradeDate: string; closePrice: number }[]
      }
    ).candles
    const bar = candles.find((c) => c.tradeDate === last.date)!
    // 차트와 «같은 값»이어야 화면이 한 이야기를 한다
    expect(last.trend.close).toBe(bar.closePrice)
    expect(last.fundamentals.quarters).toHaveLength(3)
    // 공시일은 그날보다 앞선다 — 잠정 실적은 안 쓴다 (④-0)
    expect(last.fundamentals.disclosedAt <= last.date).toBe(true)
  })

  it('같은 종목은 «매번 같은» 판정을 준다 (seed 고정)', async () => {
    const a = await list()
    const b = await list()
    expect(a.map((r) => r.date + r.entryState)).toEqual(
      b.map((r) => r.date + r.entryState),
    )
  })
})

/**
 * 계획의 **불변식** — 값이 아니라 «규칙»을 잰다.
 */
describe('④ 계획의 불변식', () => {
  type Plan = {
    planId: number
    status: string
    stockCode: string
    entryPrice: number
    quantity: number
    riskBefore: number
    riskAfter: number
    accountCash: number
    initialStopWidth: number | null
    stopPrice: number
  }
  const of = async (id: number) =>
    (await get(`/api/v1/plans/${id}`)).data as Plan

  it('④-2 한 종목에 «실행 중»은 하나뿐이다', async () => {
    const { plans } = (await get('/api/v1/plans')).data as { plans: Plan[] }
    const byStock = new Map<string, number>()
    for (const p of plans)
      if (p.status === 'RUNNING')
        byStock.set(p.stockCode, (byStock.get(p.stockCode) ?? 0) + 1)
    for (const [, n] of byStock) expect(n).toBe(1)
  })

  it('④-3 시나리오의 실행 후 위험노출은 «단독 실행» 기준이다', async () => {
    // 같은 실행 중 계획에서 갈라진 대기 둘 — 하나만 실현된다
    const { plans } = (await get('/api/v1/plans?stockCode=000660')).data as {
      plans: Plan[]
    }
    const waiting = plans.filter((p) => p.status === 'PLANNED')
    expect(waiting.length).toBeGreaterThan(1)

    // 둘 다 «같은» riskBefore 에서 출발한다 — 서로 얹지 않는다
    const befores = new Set(waiting.map((p) => p.riskBefore))
    expect(befores.size).toBe(1)
    // 그리고 어느 것도 「둘을 합친」 값이 아니다
    const sumOfOwn = waiting.reduce(
      (n, p) => n + (p.riskAfter - p.riskBefore),
      0,
    )
    for (const p of waiting)
      expect(p.riskAfter - p.riskBefore).toBeLessThan(sumOfOwn)
  })

  it('목표 > 진입 > 스톱 순서가 아니면 생성도 수정도 서버가 막는다', async () => {
    const body = {
      stockCode: '000660',
      title: '같은 값',
      entryPrice: 1_100_000,
      stopPrice: 1_100_000,
      quantity: 1,
      memo: '',
      goals: [2],
      previousPlanId: null,
    }
    const made = await send('POST', '/api/v1/plans', body)
    expect(made.status).toBe(400)
    // 스톱이 진입가 «위»여도 막는다
    const above = await send('POST', '/api/v1/plans', {
      ...body,
      stopPrice: 1_150_000,
    })
    expect(above.status).toBe(400)

    const ok = (
      await send('POST', '/api/v1/plans', { ...body, stopPrice: 1_062_000 })
    ).data as { planId: number }
    const patched = await send('PATCH', `/api/v1/plans/${ok.planId}`, {
      stopPrice: 1_100_000,
    })
    expect(patched.status).toBe(400)
  })

  it('④-1-3 기록상 현금보다 큰 매수는 «막는다»', async () => {
    const cash = (await of(1)).accountCash
    const r = await send('POST', '/api/v1/plans', {
      stockCode: '000660',
      title: '현금 초과',
      entryPrice: cash,
      stopPrice: Math.round(cash * 0.97),
      quantity: 2, // 현금의 두 배가 든다
      memo: '',
      goals: [2],
      previousPlanId: null,
    })
    /**
     * 화면만 막으면 «우회»된다. 위험노출 2.5% 초과를 경고만 하는 것과 다르다 —
     * 그건 판단의 문제고 이건 **기록이 사실과 어긋나는** 문제다 (④-1-3 · ⑥).
     */
    expect(r.status).toBe(409)
    expect(r.meta.errorCode).toBe('NOT_ENOUGH_CASH')
  })

  it('③-2-1 1R 은 «실행될 때» 박히고, 대기면 아직 없다', async () => {
    // ⚠️ 목록에는 `initialStopWidth` 가 «없다» — 줄 세우는 데 안 쓰는 값이라
    //    싱글에만 있다. 그래서 하나씩 열어 본다
    const waiting = (
      (await get('/api/v1/plans?statuses=PLANNED')).data as {
        plans: { planId: number }[]
      }
    ).plans
    expect(waiting.length).toBeGreaterThan(0)
    for (const p of waiting)
      expect((await of(p.planId)).initialStopWidth).toBeNull()

    // 실행 중은 값이 박혀 있다 — R 배수의 분모가 그것이다
    expect((await of(1)).initialStopWidth).not.toBeNull()
  })

  it('③-2-1 손절가를 갱신해도 «1R 은 안 변한다»', async () => {
    const before = await of(1)
    expect(before.initialStopWidth).not.toBeNull()

    // 스톱을 올린다 — 위험노출은 줄지만 R 의 분모는 그대로다
    const after = (
      await patch('/api/v1/plans/1', {
        stopPrice: before.stopPrice + 10_000,
      })
    ).data as Plan
    expect(after.stopPrice).toBe(before.stopPrice + 10_000)
    expect(after.initialStopWidth).toBe(before.initialStopWidth)

    // 되돌린다 — 다른 테스트가 이 계획을 같이 쓴다
    await patch('/api/v1/plans/1', { stopPrice: before.stopPrice })
  })
})
