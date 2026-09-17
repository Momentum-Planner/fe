import { http, HttpResponse } from 'msw'
import { at } from '@/shared/lib/at'
import type { PlanDetail, StopPickBody } from '@/entities/plan'
import { makeScreening } from './data/screening'
import {
  PLANS,
  closePlan,
  createPlan,
  deletePlan,
  patchPlan,
  pickStop,
  planDefaults,
  toListItem,
} from './data/plans'
import { TRADE_RECORDS, filterRecords, makeStats } from './data/tradeRecords'
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

/**
 * 실패 응답. 같은 래퍼를 쓰되 `result: 'FAIL'` 이다 — `client.ts` 가 그것을 보고 던진다.
 *
 * **코드를 나눠 붙인다** — 「못 지운다」와 「없다」가 같은 응답이면 화면이
 * 무엇을 말해야 할지 모른다 (디자인 4장 ⑤ — 없는 이유가 다르면 표식도 다르다).
 */
/**
 * 고를 차례 단의 표본 수를 채운다 (Q16). 계획 목이 거래 기록 목을 부르면 순환이라 여기서 붙인다.
 * 매도 기록 하나가 한 건이다 (⑥) — plan-defaults 와 같은 셈이다.
 */
const withSamples = (p: PlanDetail): PlanDetail =>
  p.pickBasis
    ? {
        ...p,
        pickBasis: {
          ...p.pickBasis,
          sampleCount: TRADE_RECORDS.filter((r) => r.side === 'SELL').length,
        },
      }
    : p

const fail = (status: number, errorCode: string, message: string) =>
  HttpResponse.json(
    { meta: { result: 'FAIL', errorCode, message }, data: null },
    { status },
  )

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
  // 튜플로 못박는다 — 배열 리터럴이면 인덱싱 결과가 `undefined` 를 낀다
  const BANDS = [
    [0, 20, 1.0],
    [20, 5, 1.5],
    [25, 15, 2.0],
    [40, 60, 3.0],
  ] as const satisfies ReadonlyArray<readonly [number, number, number]>
  const band = Math.floor(rand(seed, 7) * 4)
  const [lo, span, level] = at([...BANDS], band)
  const epsGrowth = +(lo + rand(seed, 10) * span).toFixed(0)

  const direction = at(
    [...(['decel', 'flat', 'accel'] as const)],
    Math.floor(rand(seed, 8) * 3),
  )
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
    const last = at(candles, -1)
    const yearAgo = at(candles, Math.max(0, candles.length - 240))
    const bases = makeBases(candles)
    const lastBase = at(bases, -1)

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
        const first = at(quarterlyEps, 0).eps
        const lastEps = at(quarterlyEps, -1).eps
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
          const last = at(candles, -1)
          const yearAgo = at(candles, Math.max(0, candles.length - 240))
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

  /**
   * 하루치 스크리닝 판정 목록 (⑤-2 · `DailyScreeningResult`).
   *
   * 계획의 「근거 날짜」가 여기서 고르는 값이다 — **고를 수 있는 날이 무엇인지**를
   * 화면이 알아야 ④ 의 *「며칠 전 판정을 보고 세운 계획이면 그 날짜를 찍어야
   * 근거가 사실과 맞는다」* 가 성립한다.
   *
   * ⚠️ 매일 있지 «않다». ①-1 게이트에 걸린 날은 행이 없다 — 그 빈칸이 정보다.
   */
  http.get('/api/v1/stocks/:code/screening', ({ params, request }) => {
    const q = new URL(request.url).searchParams
    const from = q.get('from')
    const to = q.get('to')
    const results = makeScreening(String(params.code)).filter(
      (r) => (!from || r.date >= from) && (!to || r.date <= to),
    )
    return ok({ results })
  }),

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

  /**
   * 계획을 세울 때 «계획이 아닌 데서» 오는 값들 — 계좌 · 통계 · 종목.
   * **계획이 하나도 없는 종목에서도 온다.** 첫 계획이 여기에 기댄다.
   */
  http.get('/api/v1/stocks/:code/plan-defaults', ({ params }) => {
    const code = String(params.code)
    const last = at(makeCandles(code), -1).closePrice
    return ok({
      ...planDefaults(code, last),
      // 매도 기록 하나가 한 건이다 (⑥). 5건 전에는 「평균 수익률」 후보를 못 고른다
      sampleCount: TRADE_RECORDS.filter((r) => r.side === 'SELL').length,
    })
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

  // 계획 «생성» (④ · Q8). 세운 계획은 「대기」로 난다 — 실행 중으로 만드는 것은 체결이다
  http.post('/api/v1/plans', async ({ request }) => {
    const body = (await request.json()) as Parameters<typeof createPlan>[0]
    const made = createPlan(body)
    // 기록상 현금보다 큰 매수는 «막는다» — 화면만 막으면 우회된다 (④-1-3)
    // 목표 > 진입 > 스톱 순서여야 한다
    if (made === 'bad-goals')
      return fail(400, 'BAD_GOALS', '스톱 사다리의 목표가 올바르지 않습니다')
    if (made === 'price-order')
      return fail(
        400,
        'PRICE_ORDER',
        '목표 > 진입가 > 스톱가격 순서여야 합니다',
      )
    if (made === 'no-cash')
      return fail(
        409,
        'NOT_ENOUGH_CASH',
        '기록상 현금보다 큽니다 — 현금을 고치거나 수량을 줄이세요',
      )
    return ok(made)
  }),

  /**
   * 계획 «폐기» (Q8) — 안 가기로 한 것이다. 상태만 바뀌고 행은 남는다.
   * **삭제와 같은 문턱이다** — 대기 + 체결 0건.
   *
   * **사유가 필수다.** 폐기는 판단이고, 판단에는 이유가 있다 — ⑦가 폐기 비율로
   * 세므로 이유 없이 닫힌 행이 쌓이면 그 비율이 아무것도 못 말한다.
   */
  http.post('/api/v1/plans/:planId/close', async ({ params, request }) => {
    const body = (await request.json()) as { closeReason?: string }
    const reason = body.closeReason?.trim()
    if (!reason)
      return fail(400, 'CLOSE_REASON_REQUIRED', '폐기 사유가 없습니다')

    const r = closePlan(Number(params.planId), reason)
    if (r === 'not-found') return fail(404, 'NOT_FOUND', '계획이 없습니다')
    // 삭제와 «같은 문턱»이다 — 체결이 붙으면 「안 갔다」고 닫을 수 없다
    if (r === 'conflict')
      return fail(
        409,
        'NOT_CLOSABLE',
        '체결이 붙었거나 대기가 아닙니다 — 닫는 것은 체결이 합니다',
      )
    return ok(r)
  }),

  /**
   * 계획 «삭제» (Q8) — 애초에 없어야 했던 것이다. **폐기와 다른 행위다.**
   *
   * 대기 + 체결 0건만 지운다. 그 밖은 409 이고, 화면은 **폐기로 안내해야 한다** —
   * 체결이 붙었으면 돈이 실제로 움직였고 그건 없던 일이 될 수 없다.
   */
  http.delete('/api/v1/plans/:planId', ({ params }) => {
    const r = deletePlan(Number(params.planId))
    if (r === 'not-found') return fail(404, 'NOT_FOUND', '계획이 없습니다')
    if (r === 'conflict')
      return fail(
        409,
        'NOT_DELETABLE',
        '체결이 붙었거나 대기가 아닙니다 — 폐기로 닫습니다',
      )
    return ok(null)
  }),

  // 계획 수정 (④ — 대기이면 고칠 수 있고, 실행 중에도 고칠 수 있다.
  // 이미 찍힌 스냅샷과 체결은 안 바뀐다)
  http.patch('/api/v1/plans/:planId', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const next = patchPlan(Number(params.planId), body)
    if (next === 'price-order')
      return fail(
        400,
        'PRICE_ORDER',
        '목표 > 진입가 > 스톱가격 순서여야 합니다',
      )
    // 닿은 단을 바꾸려 했거나 목표가 오름차순이 아니다 (Q16 6)
    if (next === 'bad-goals')
      return fail(400, 'BAD_GOALS', '닿은 단은 바꿀 수 없습니다')
    if (!next)
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
    return ok(withSamples(next))
  }),

  /**
   * 닿은 단에서 스톱 자리를 고른다 (Q16). 고를 차례인 단만 받고,
   * 가격은 지금 스톱 초과 · 목표 미만이어야 한다 — 화면만 막으면 우회된다.
   */
  http.post('/api/v1/plans/:planId/stop-pick', async ({ params, request }) => {
    const body = (await request.json()) as StopPickBody
    const next = pickStop(Number(params.planId), body.goalIndex, body.pick)
    if (next === 'not-found') return fail(404, 'NOT_FOUND', '계획이 없습니다')
    if (next === 'conflict')
      return fail(409, 'NOT_PICKABLE', '지금 고를 차례인 단이 아닙니다')
    if (next === 'bad-price')
      return fail(400, 'BAD_PRICE', '지금 스톱보다 높고 목표보다 낮아야 합니다')
    return ok(withSamples(next))
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
    return ok(withSamples(plan))
  }),

  // ─────────────── 검색 ───────────────
  // ─────────────── 거래 기록 · 통계 (⑥⑦) ───────────────
  //
  // ⚠️ 백엔드에 TradeRecord API 가 없다. 여기가 유일한 구현이다.

  /** 체결 목록 — 정산표 ①「어느 지점에서 사고팔았는지」가 이것을 그대로 쓴다 */
  http.get('/api/v1/trade-records', ({ request }) => {
    const p = new URL(request.url).searchParams
    const planned = p.get('planned')
    return ok({
      records: filterRecords({
        from: p.get('from') ?? undefined,
        to: p.get('to') ?? undefined,
        stockCode: p.get('stockCode') ?? undefined,
        planned: planned === null ? undefined : planned === 'true',
      }),
    })
  }),

  /**
   * ⑦ 통계 — 정산표 · 자본 감소 · 그룹별 · 조건 고정 · 교차를 «한 번에» 준다.
   * 쪼개면 기간 필터가 어긋난 조합이 한 화면에 설 수 있다.
   */
  http.get('/api/v1/trade-records/stats', ({ request }) => {
    const p = new URL(request.url).searchParams
    const planned = p.get('planned')
    return ok(
      makeStats({
        from: p.get('from') ?? undefined,
        to: p.get('to') ?? undefined,
        stockCode: p.get('stockCode') ?? undefined,
        planned: planned === null ? undefined : planned === 'true',
      }),
    )
  }),

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
          price: at(candles, -1).closePrice,
          regime: regimeOf(s.stockCode),
        }
      }),
    })
  }),
]
