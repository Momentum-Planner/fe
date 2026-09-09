import { http, HttpResponse } from 'msw'
import { PLANS, toListItem } from './data/plans'
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

/**
 * 펀더멘털 세 축과 그 합계 (최종미지 ①-2) — **전부 목이다.**
 *
 *   수준  분기 EPS 증가율   40%↑ 3.0 · 25~40% 2.0 · 20~25% 1.5 · 0~20% 1.0
 *   방향  가속 +1 · 유지 0 · 감속 −1
 *   동반  EPS↑ · 매출↑ · 마진↑  각 1점 (3분기 관측 창)
 *
 * ⚠️ 백엔드 DTO 에 이 필드들이 하나도 없다. 분기 매출·마진 계열이 있어야
 *    만들 수 있는데 그게 있는지도 아직 모른다 (Q6 미결).
 *
 * 종목코드 seed 로 뽑아 **새로고침해도 같은 값**이 나오게 한다.
 */
function fundamentals(code: string) {
  const seed = seedOf(code)

  // 수준 — 구간을 먼저 고르고 그 구간 «안»의 값을 뽑는다. 그래야 화면에
  // 뜨는 증가율과 점수가 서로 안 어긋난다
  const band = Math.floor(rand(seed, 7) * 4)
  const [lo, span, level] = [
    [0, 20, 1.0],
    [20, 5, 1.5],
    [25, 15, 2.0],
    [40, 60, 3.0],
  ][band]
  const epsGrowth = +(lo + rand(seed, 10) * span).toFixed(0)

  const direction = (['decel', 'flat', 'accel'] as const)[
    Math.floor(rand(seed, 8) * 3)
  ]
  const dirPoint = { decel: -1, flat: 0, accel: 1 }[direction]

  const up = {
    eps: rand(seed, 11) > 0.35,
    revenue: rand(seed, 12) > 0.45,
    margin: rand(seed, 13) > 0.55,
  }
  const together = Number(up.eps) + Number(up.revenue) + Number(up.margin)

  return {
    epsGrowth,
    direction,
    up,
    fundamentalScore: +(level + dirPoint + together).toFixed(1),
  }
}

export const handlers = [
  // ─────────────── 차트 ───────────────
  http.get('/api/v1/stocks/:code/chart/daily', ({ params }) => {
    const candles = makeCandles(String(params.code))
    return ok({ candles })
  }),

  http.get(
    '/api/v1/stocks/:code/chart/moving-averages',
    ({ params, request }) => {
      const period = new URL(request.url).searchParams.get('period') ?? 'MA_50'
      const candles = makeCandles(String(params.code))
      return ok({
        period,
        dataPoints: makeMovingAverage(candles, MA_PERIOD[period] ?? 50),
      })
    },
  ),

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
          changeRateFromReferenceLine: +(
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
            ...fundamentals(s.stockCode),
          }
        }).sort((a, b) => b.fundamentalScore - a.fundamentalScore),
      }),
    ),
  ),

  // ─────────────── 계정 ───────────────
  // ⚠️ 목이다. 사용자 축(계획 · 거래 기록 · 계좌) 화면은 로그인 상태여야 내용이 뜨는데,
  //    백엔드가 안 떠 있으면 dev 에서 그 화면들을 «볼 수가 없다».
  http.get('/api/v1/auth/account', () =>
    ok({ isLoggedIn: true, nickname: '개발자', email: 'dev@example.com' }),
  ),

  // ─────────────── 계획 ───────────────
  // ⚠️ 백엔드에 TradePlan API 가 없다. 이 둘이 유일한 구현이다.
  http.get('/api/v1/plans', ({ request }) => {
    const q = new URL(request.url).searchParams
    const statuses = q.get('statuses')?.split(',').filter(Boolean) ?? []
    const stockCode = q.get('stockCode')
    const from = q.get('from')
    const to = q.get('to')

    // 「오늘」과 「전체」는 같은 컬렉션의 기간 필터다 (Q3)
    const plans = PLANS.filter(
      (p) =>
        (statuses.length === 0 || statuses.includes(p.status)) &&
        (!stockCode || p.stockCode === stockCode) &&
        (!from || p.writtenAt >= from) &&
        (!to || p.writtenAt <= to),
    )
      .sort(
        (a, b) => b.writtenAt.localeCompare(a.writtenAt) || b.planId - a.planId,
      )
      .map(toListItem)

    return ok({ plans })
  }),

  // 종목 포지션 (③). ④의 자료가 「스냅샷 + ③의 손절가·위험노출·보유 수량 + 계좌 총액」이라
  // 계획 화면이 이 값 없이는 「지금 어디에 서 있나」를 못 보여준다.
  // ⚠️ StockPosition API 도 백엔드에 없다.
  http.get('/api/v1/stocks/:code/position', ({ params }) => {
    const code = String(params.code)
    const running = PLANS.find(
      (p) => p.stockCode === code && p.status === 'RUNNING',
    )
    if (!running)
      return ok({
        stockCode: code,
        quantity: 0,
        avgPrice: 0,
        stopPrice: null,
        riskExposure: 0,
      })
    // 손절가는 종목이 «자기 필드로 안 든다» — 실행 중 계획의 PlannedStop 이 곧 그 값이다
    const filled = running.records.filter((r) => r.side === 'BUY')
    const qty = filled.reduce((n, r) => n + r.quantity, 0)
    const avg = qty
      ? Math.round(filled.reduce((n, r) => n + r.price * r.quantity, 0) / qty)
      : running.entryPrice
    return ok({
      stockCode: code,
      quantity: qty,
      avgPrice: avg,
      stopPrice: running.stopPrice,
      riskExposure: running.riskAfter,
    })
  }),

  http.get('/api/v1/plans/:planId', ({ params }) => {
    const plan = PLANS.find((p) => p.planId === Number(params.planId))
    if (!plan)
      return HttpResponse.json(
        {
          meta: {
            result: 'FAIL',
            errorCode: 'NOT_FOUND',
            message: '계획이 없습니다',
          },
          data: null,
        },
        { status: 404 },
      )
    return ok(plan)
  }),

  // ─────────────── 검색 ───────────────
  http.get('/api/v1/search/stocks', ({ request }) => {
    const q = (new URL(request.url).searchParams.get('query') ?? '').trim()
    const hits = q
      ? STOCKS.filter((s) => s.stockName.includes(q) || s.stockCode.includes(q))
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
