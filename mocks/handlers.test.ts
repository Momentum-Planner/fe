import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
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
      expect(candles[i].tradeDate > candles[i - 1].tradeDate).toBe(true)
    }
    for (const c of candles) {
      expect(c.highPrice).toBeGreaterThanOrEqual(c.lowPrice)
      expect(c.highPrice).toBeGreaterThanOrEqual(Math.max(c.openPrice, c.closePrice))
      expect(c.lowPrice).toBeLessThanOrEqual(Math.min(c.openPrice, c.closePrice))
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
    const d = r.data as { quarterlyEps: Array<{ quarter: string; eps: number }> }
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
    expect(stocks[0].stockName).toBe('SK하이닉스')
  })
})

describe('랭킹 · 검색', () => {
  it.each(['breakout-success', 'breakout-ready'])(
    '%s 랭킹은 모멘텀 내림차순이다',
    async (regime) => {
      const r = await get(`/api/v1/ranking/${regime}`)
      const { stocks } = r.data as {
        stocks: Array<{ oneYearMomentum: number; currentPrice: number }>
      }
      expect(stocks.length).toBeGreaterThan(0)
      for (let i = 1; i < stocks.length; i++) {
        expect(stocks[i - 1].oneYearMomentum).toBeGreaterThanOrEqual(
          stocks[i].oneYearMomentum,
        )
      }
    },
  )

  it('검색은 종목명 부분일치로 찾는다', async () => {
    const r = await get('/api/v1/search/stocks?query=하이닉스')
    const { stocks } = r.data as { stocks: Array<{ stockCode: string }> }
    expect(stocks).toHaveLength(1)
    expect(stocks[0].stockCode).toBe('000660')
  })

  it('검색어가 비면 빈 배열을 준다', async () => {
    const r = await get('/api/v1/search/stocks?query=')
    expect((r.data as { stocks: unknown[] }).stocks).toEqual([])
  })
})
