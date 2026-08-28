import { http, HttpResponse } from 'msw'
import {
  STOCKS,
  makeBases,
  makeCandles,
  makeMovingAverage,
  rand,
  regimeOf,
  seedOf,
  stockName,
} from './data/stocks'

/** 백엔드 공통 래퍼(ApiResponse<T>) 를 씌운다 — client.ts 의 parse() 가 이 모양을 기대한다. */
const ok = <T>(data: T) =>
  HttpResponse.json({
    meta: { result: 'SUCCESS', errorCode: null, message: null },
    data,
  })

const MA_PERIOD: Record<string, number> = {
  MA_50: 50,
  MA_150: 150,
  MA_200: 200,
}

/** 관심 종목 — 목이라 메모리에만 담는다. 새로고침하면 초기화된다. */
const likes = new Set<string>(['000660'])

export const handlers = [
  // ─────────────── 차트 ───────────────
  http.get('/api/v1/stocks/:code/chart/daily', ({ params }) => {
    const candles = makeCandles(String(params.code))
    return ok({ candles })
  }),

  http.get('/api/v1/stocks/:code/chart/moving-averages', ({ params, request }) => {
    const period = new URL(request.url).searchParams.get('period') ?? 'MA_50'
    const candles = makeCandles(String(params.code))
    return ok({
      period,
      dataPoints: makeMovingAverage(candles, MA_PERIOD[period] ?? 50),
    })
  }),

  http.get('/api/v1/stocks/:code/chart/bases', ({ params }) => {
    const candles = makeCandles(String(params.code))
    return ok({ bases: makeBases(candles) })
  }),

  // ─────────────── 인사이트 8종 ───────────────
  http.get('/api/v1/stocks/:code/insight/:kind', ({ params }) => {
    const code = String(params.code)
    const kind = String(params.kind)
    const seed = seedOf(code)
    const candles = makeCandles(code)
    const last = candles[candles.length - 1]
    const yearAgo = candles[Math.max(0, candles.length - 240)]
    const bases = makeBases(candles)
    const lastBase = bases[bases.length - 1]

    switch (kind) {
      case 'regime':
        return ok({
          regime: regimeOf(code),
          currentPrice: last.closePrice,
          supportLine: lastBase.supportPrice,
          resistanceLine: lastBase.resistancePrice,
          changeRateFromReferenceLine:
            +(
              ((last.closePrice - lastBase.resistancePrice) /
                lastBase.resistancePrice) *
              100
            ).toFixed(2),
        })

      case 'moving-average': {
        const ma = (p: number) => {
          const pts = makeMovingAverage(candles, p)
          return pts[pts.length - 1]?.price ?? last.closePrice
        }
        const ma50 = ma(50)
        const ma150 = ma(150)
        const ma200 = ma(200)
        return ok({
          currentPrice: last.closePrice,
          ma50,
          ma150,
          ma200,
          isAboveMa50: last.closePrice > ma50,
          isMa50AboveMa150: ma50 > ma150,
          isMa150AboveMa200: ma150 > ma200,
        })
      }

      case 'momentum':
        return ok({
          yearAgoPrice: yearAgo.closePrice,
          yearAgoDate: yearAgo.tradeDate,
          currentPrice: last.closePrice,
          currentDate: last.tradeDate,
          yearlyPriceChangeRate: +(
            ((last.closePrice - yearAgo.closePrice) / yearAgo.closePrice) *
            100
          ).toFixed(2),
          percentileRank: Math.round(rand(seed, 1) * 40 + 55),
        })

      case 'fip': {
        const recent = candles.slice(-240)
        const up = recent.filter((c) => c.closePrice >= c.openPrice).length
        return ok({
          yearlyUpDays: up,
          yearlyDownDays: recent.length - up,
          fipScore: +(rand(seed, 2) * 0.8 + 0.1).toFixed(2),
          percentileRank: Math.round(rand(seed, 3) * 40 + 55),
        })
      }

      case 'volume': {
        const baseline =
          candles.slice(-60, -1).reduce((s, c) => s + c.volume, 0) / 59
        return ok({
          baselineAvgVolume: Math.round(baseline),
          currentVolume: last.volume,
          volumeToBaselineRatio: +(last.volume / baseline).toFixed(2),
          percentileRank: Math.round(rand(seed, 4) * 40 + 55),
        })
      }

      case 'rs':
        return ok({
          rsValue: +(rand(seed, 5) * 30 + 5).toFixed(2),
          percentileRank: Math.round(rand(seed, 6) * 40 + 55),
        })

      case 'eps': {
        const quarters = ['2025Q3', '2025Q4', '2026Q1', '2026Q2']
        let eps = 800 + rand(seed, 7) * 1_200
        const quarterlyEps = quarters.map((q, i) => {
          eps = eps * (1 + (rand(seed, 8 + i) - 0.3) * 0.35)
          return { quarter: q, eps: Math.round(eps) }
        })
        const first = quarterlyEps[0].eps
        const lastEps = quarterlyEps[quarterlyEps.length - 1].eps
        return ok({
          quarterlyEps,
          changeRateYoY: +(((lastEps - first) / first) * 100).toFixed(2),
          percentileRank: Math.round(rand(seed, 12) * 40 + 55),
        })
      }

      case 'base-stage':
        return ok({ stageLevel: (seedOf(code) % 4) + 1 })

      default:
        return ok(null)
    }
  }),

  // ─────────────── 관심 종목 ───────────────
  http.get('/api/v1/stocks/likes', () =>
    ok({
      stocks: [...likes].map((code) => ({
        stockCode: code,
        stockName: stockName(code),
      })),
    }),
  ),

  http.post('/api/v1/stocks/:code/like', ({ params }) => {
    likes.add(String(params.code))
    return ok(null)
  }),

  http.delete('/api/v1/stocks/:code/like', ({ params }) => {
    likes.delete(String(params.code))
    return ok(null)
  }),

  // ─────────────── 랭킹 ───────────────
  ...(['breakout-success', 'breakout-ready'] as const).map((regime) =>
    http.get(`/api/v1/ranking/${regime}`, () =>
      ok({
        stocks: STOCKS.map((s) => {
          const candles = makeCandles(s.stockCode)
          const last = candles[candles.length - 1]
          const yearAgo = candles[Math.max(0, candles.length - 240)]
          return {
            stockName: s.stockName,
            stockCode: s.stockCode,
            currentPrice: last.closePrice,
            oneYearMomentum: +(
              ((last.closePrice - yearAgo.closePrice) / yearAgo.closePrice) *
              100
            ).toFixed(2),
            fipScore: +(rand(seedOf(s.stockCode), 2) * 0.8 + 0.1).toFixed(2),
          }
        }).sort((a, b) => b.oneYearMomentum - a.oneYearMomentum),
      }),
    ),
  ),

  // ─────────────── 검색 ───────────────
  http.get('/api/v1/search/stocks', ({ request }) => {
    const q = (new URL(request.url).searchParams.get('query') ?? '').trim()
    const hits = q
      ? STOCKS.filter(
          (s) => s.stockName.includes(q) || s.stockCode.includes(q),
        )
      : []
    return ok({
      stocks: hits.map((s) => {
        const candles = makeCandles(s.stockCode)
        return {
          stockCode: s.stockCode,
          stockName: s.stockName,
          price: candles[candles.length - 1].closePrice,
          regime: regimeOf(s.stockCode),
        }
      }),
    })
  }),
]
