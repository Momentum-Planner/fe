import type { EntryState, Regime } from '@/shared/lib/snapshots'
import { REGIMES, REGIME_LABEL, TREND_CONDITIONS } from '@/shared/lib/snapshots'
import {
  RISK_BANDS,
  SAMPLE_MIN,
  SELL_REASONS,
  SELL_REASON_LABEL,
  riskBandOf,
} from '@/entities/tradeRecord'
import type {
  CapitalCurve,
  GroupAxis,
  GroupCell,
  KpiTrends,
  MonthlyPeak,
  PlanPair,
  RiskBand,
  SellReason,
  Settlement,
  StatTargets,
  TradeRecord,
  TradeSnapshot,
  TradeStats,
  TrendPoint,
} from '@/entities/tradeRecord'
import { STOP_LIMIT_BASIS } from './plans'
import { STOCKS, rand } from './stocks'

/**
 * 거래 기록 목 — **⑦ 을 띄워 보려면 쌓인 것이 있어야 한다.**
 *
 * ⚠️ **백엔드에 TradeRecord API 가 없다.** 이 파일이 유일한 구현이다.
 *
 * ⚠️ **「개발자의 46건」은 예시 데이터다** — *「남의 기본값으로 쓰지 않는다」* (⑦).
 *    화면을 판단하려고 띄워 두는 것이고, 사용자의 초기값이 되어선 안 된다.
 *
 * 손으로 박는 것은 **R 배수 하나**다. 나머지는 전부 계산한다 —
 * 수익률 · 손익금액 · 위험노출 · 승률 · 손익비 · 누적 R. 목에서부터 어긋나면
 * 화면이 거짓말을 배운다 (`plans.ts` 와 같은 규칙).
 */

/** 위험노출의 분모. `plans.ts` 와 «같은 값»이어야 한다 (F7 — 사용자에 하나) */
const ACCOUNT_TOTAL = 80_000_000

/**
 * 계획 있음 — **배열 하나가 계획 하나, 원소 하나가 매도 기록 하나**다.
 *
 * `[-1, 1.8]` 은 절반이 손절되고 나머지가 나중에 잘 팔린 계획이다.
 * *「묶어서 「+3.85% 한 건, 승률 100%」로 만들지 않는다 … 묶으면 손절을
 * 숨기게 된다」* (⑥) — 그래서 목에서도 두 건으로 둔다.
 *
 * **벽(−1R) 왼쪽에 셋을 심어 뒀다** (−1.35 · −2.1 · −1.1). 갭 하락과 훼손
 * 무시로 실제로 생기는 값이고, **이것이 있어야 F1 이 할 말이 생긴다.**
 */
const PLANNED_R: number[][] = [
  [-1],
  [1.2],
  [-1],
  [2.4],
  [-1.35],
  [-0.6],
  [1.1, 3.2],
  [-1],
  [-1, 1.8],
  [3.8],
  [-1],
  [-2.1],
  [2.0, 5.1],
  [-1],
  [4.4],
  [-0.5, 2.6],
  [-1, 0.9],
  [6.2],
  [-1],
  [2.8, 1.4],
  [-1, -1.1],
  [0.6, 3.0, 7.3],
  [-1],
  [1.9],
  [5.6],
]

/**
 * 계획 없음 — **R 배수가 없다.** 1R 이 없으니 R 축에 올라오지 않고, 수익률로만
 * 센다 (⑦: *「계획 없는 매매는 1R이 없어 축에 올라오지 않는다. 건수만 따로 적는다」*).
 */
const UNPLANNED_RET = [
  -11.2, -6.8, 3.4, -14.5, -2.1, 8.9, -9.7, -4.3, 12.6, -8.1, -1.4, 5.2,
]

/**
 * 계획 없는 거래의 «투입 비중» %.
 *
 * ⚠️ **해석이 하나 들어간다.** ⑥ 은 *「계획 없는 거래도 계좌 총액을 받는다 —
 *    위험노출%를 비우지 않는다. 잘못한 거래일수록 **계좌를 몇 % 걸었는지**를
 *    봐야 한다」* 고 하는데, 위험노출의 식은 `(진입가 − 손절가) × 수량 ÷ 계좌총액`
 *    이고 **계획이 없으면 손절가가 없다.**
 *
 *    그래서 **손절가가 없으면 전액이 걸린 것으로 본다** — 자를 자리를 안 정했으면
 *    실제로 그 포지션 전체가 위험이다. 그 결과 계획 없는 매매가 「2.5% 초과」로
 *    몰리는데, 교차가 *「계획 없는 매매가 어느 구간에 몰리는지가 여기서만
 *    보인다」* 고 한 것이 바로 그 모양이다.
 *
 *    ⚠️ **최종미지에 근거가 없는 자리다.** 확정되면 여기부터 고친다.
 *
 * `null` 은 CSV 로 들어와 손절가도 투입도 못 맞춘 행이다 — *「산출 불가한
 * 위험노출은 비운다」*. 0 으로 채우지 않는다 (4장 ⑤ — 없는 이유가 다르면 표식도 다르다).
 */
const UNPLANNED_WEIGHT: (number | null)[] = [
  6.4,
  2.1,
  4.8,
  8.9,
  1.7,
  5.2,
  null,
  7.3,
  3.6,
  9.5,
  2.4,
  null,
]

const DAY = 86_400_000
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10)

/**
 * 첫 진입일. 46건이 2025-06 ~ 2026-06 에 퍼져 월별 표가 «두 해»가 된다.
 *
 * ⚠️ **오늘보다 뒤로 가면 안 된다.** 계획 하나가 11일 간격이고 수익 거래는
 *    최대 69일을 들고 있으므로 마지막 매도가 2026-06 안에 떨어진다.
 */
const FIRST_ENTRY = Date.parse('2025-06-02')
/** 계획 사이 간격(일). 이것과 보유일수가 마지막 매도일을 정한다 */
const PLAN_GAP = 11

/** 계획 시점의 종목 상태를 결정적으로 뽑는다. seed 는 계획 번호다 */
function snapshotOf(
  i: number,
  sumR: number,
  planned: boolean,
  /** 판정이 난 날 — **매수일이다.** 계획 번호에서 역산하면 계획 없는 거래의
   *  스냅샷이 매수보다 «뒤» 날짜로 찍힌다 (F4 가 무너지는 자리) */
  entryAt: number,
): TradeSnapshot {
  const r = (k: number) => rand(i * 7 + 13, k)

  // 결과와 «느슨하게» 묶는다. 완전히 갈리면 그룹별 성과가 거짓으로 깨끗해진다 —
  // 실제 데이터는 그렇게 안 나온다
  const tier = sumR > 1.5 ? 2 : sumR > -0.5 ? 1 : 0
  const noise = r(3) < 0.25 ? 1 - tier : 0
  const t = Math.max(0, Math.min(2, tier + noise))

  const states: EntryState[][] = [
    ['EARLY', 'BLOCKED', 'PULLBACK'],
    ['PULLBACK', 'BREAKOUT', 'EARLY'],
    ['BREAKOUT', 'PULLBACK', 'BREAKOUT'],
  ]
  const regimes: Regime[][] = [
    ['fail', 'none', 'prep'],
    ['prep', 'start', 'none'],
    ['start', 'start', 'prep'],
  ]

  const trendPassed = planned ? (r(6) < 0.8 ? 8 : 7) : 6 + Math.floor(r(6) * 3)

  return {
    dailyScreeningResultId: 91_000 + i,
    date: ymd(entryAt),
    entryState: states[t]![Math.floor(r(4) * 3)]!,
    regime: regimes[t]![Math.floor(r(5) * 3)]!,
    // ①-1 게이트가 8/8 을 요구하므로 계획이 선 것은 대개 8/8 이다.
    // 계획 없이 산 것은 애초에 게이트를 안 지났다 — 그게 이 축의 발견이다
    // 계획 없이 산 것도 «간혹» 8/8 이다. 그래야 조건 고정이 성립한다 —
    // 「트렌드 통과 매매 안에서 계획 있음 vs 없음」은 두 쪽에 다 표본이 있어야 답이 된다
    trendPassed,
    // 어긴 «자리»도 결정적으로 고른다. 8조건 표가 세로로 훑는 것이 이 이름이다
    trendFailed: TREND_CONDITIONS.filter(
      (_, k) => (k + i + Math.floor(r(20) * 8)) % 8 < 8 - trendPassed,
    ),
    baseNo: t === 2 ? 1 + Math.floor(r(7) * 2) : 2 + Math.floor(r(7) * 4),
    vcp: planned ? r(8) < 0.35 + t * 0.25 : r(8) < 0.3,
    fundamentalScore: Math.min(7, 2 + t + Math.floor(r(9) * 4)),
    damageScore:
      t === 2 ? 0 : t === 1 ? Math.floor(r(10) * 2) : 1 + Math.floor(r(11) * 2),
    entryPosition: +(r(12) * 7.5).toFixed(1),
  }
}

/** 매도 사유. R 배수가 사유를 «거의» 정한다 — 손절가에 닿았으면 그렇게 적힌다 */
function reasonsOf(r: number, i: number, k: number): SellReason[] {
  const x = rand(i * 31 + k, 21)
  if (r <= -0.95) return x < 0.25 ? ['STOP_HIT', 'TREND_DAMAGE'] : ['STOP_HIT']
  if (r < 0) return x < 0.5 ? ['TREND_DAMAGE'] : ['STOP_RAISED']
  if (r < 2) return x < 0.45 ? ['STOP_RAISED'] : ['TAKE_PROFIT']
  return x < 0.3 ? ['STOP_RAISED', 'TAKE_PROFIT'] : ['TAKE_PROFIT']
}

/** 주식 수를 «호가 단위»로 접는다. 목표 위험노출에서 역산한 뒤 반올림한다 */
const roundQty = (q: number) => Math.max(1, Math.round(q / 5) * 5)
const roundPrice = (p: number) => Math.round(p / 10) * 10

let nextId = 4_100

function buildPlanned(): TradeRecord[] {
  const out: TradeRecord[] = []

  PLANNED_R.forEach((exits, i) => {
    const stock = STOCKS[i % STOCKS.length]!
    const r = (k: number) => rand(i * 17 + 3, k)

    const entryAt = FIRST_ENTRY + i * PLAN_GAP * DAY
    const entryPrice = roundPrice(18_000 + r(1) * 180_000)
    /**
     * 최초 손절폭 % — **이것이 1R 이다.** 손절폭 상한 2.36%(`plans.ts`) 아래로
     * 두되 초기 둘은 넘긴다. 상한은 ⑦ 이 낸 값이라 «그전에는 없었다»
     */
    const stopPct = i < 2 ? 2.6 + r(2) * 0.5 : +(1.15 + r(2) * 1.15).toFixed(2)
    /** 목표 위험노출 %. 뒤로 갈수록 낮아진다 — ⑧ 이 줄여 온 모양이다 */
    const targetRisk =
      i < 4 ? 2.2 + r(13) * 1.1 : +(0.55 + r(13) * 1.6).toFixed(2)

    const qty = roundQty(
      ((targetRisk / 100) * ACCOUNT_TOTAL) / (entryPrice * (stopPct / 100)),
    )
    const stopPrice = roundPrice(entryPrice * (1 - stopPct / 100))
    /** 파생이다 — 반올림된 수량과 손절가로 «다시» 낸다 */
    const riskPct = +(
      (((entryPrice - stopPrice) * qty) / ACCOUNT_TOTAL) *
      100
    ).toFixed(2)

    const sumR = exits.reduce((a, b) => a + b, 0)
    const snapshot = snapshotOf(i, sumR, true, entryAt)
    const planId = 9_100 + i
    const planTitle = `${snapshot.entryState === 'PULLBACK' ? '눌림' : '돌파'} ${entryPrice.toLocaleString()}`

    out.push({
      recordId: nextId++,
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      side: 'BUY',
      price: entryPrice,
      quantity: qty,
      filledAt: ymd(entryAt),
      sellReasons: [],
      reason: snapshot.vcp
        ? 'VCP 마지막 수축에서 피봇 돌파'
        : '베이스 상단 돌파',
      planId,
      planTitle,
      accountTotal: ACCOUNT_TOTAL,
      estimated: false,
      derived: null,
      snapshot,
    })

    // 분할 매도면 수량을 나눈다. 마지막 조각이 잔량을 받는다 — 합이 어긋나면
    // 보유수량이 음수가 된다 (모델 노트 5-2)
    let left = qty
    let day = entryAt
    exits.forEach((rMul, k) => {
      const last = k === exits.length - 1
      const q = last ? left : roundQty(qty / exits.length)
      left -= q
      // 수익은 오래, 손실은 짧게 — 정산표 ④ 가 둘을 «따로» 내는 이유다
      const hold =
        rMul > 0
          ? 16 + Math.floor(r(30 + k) * 54)
          : 3 + Math.floor(r(30 + k) * 12)
      day += hold * DAY
      const sellPrice = roundPrice(entryPrice * (1 + (rMul * stopPct) / 100))

      out.push({
        recordId: nextId++,
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        side: 'SELL',
        price: sellPrice,
        quantity: q,
        filledAt: ymd(day),
        sellReasons: reasonsOf(rMul, i, k),
        reason: '',
        planId,
        planTitle,
        accountTotal: ACCOUNT_TOTAL,
        estimated: false,
        derived: {
          entryPrice,
          returnPct: +(((sellPrice - entryPrice) / entryPrice) * 100).toFixed(
            2,
          ),
          profit: (sellPrice - entryPrice) * q,
          holdingDays: Math.round((day - entryAt) / DAY),
          // 분모는 «최초» 손절폭이다. 손절가가 갱신돼도 안 변한다 (③-2-1)
          rMultiple: +(
            (sellPrice - entryPrice) /
            (entryPrice * (stopPct / 100))
          ).toFixed(2),
          riskPct,
          riskBand: riskBandOf(riskPct),
        },
        snapshot,
      })
    })
  })

  return out
}

function buildUnplanned(): TradeRecord[] {
  const out: TradeRecord[] = []

  UNPLANNED_RET.forEach((ret, j) => {
    const i = PLANNED_R.length + j
    const stock = STOCKS[(i * 3) % STOCKS.length]!
    const r = (k: number) => rand(i * 17 + 3, k)

    const entryAt = FIRST_ENTRY + (40 + j * 26) * DAY
    const entryPrice = roundPrice(21_000 + r(1) * 150_000)
    // `!` 를 쓰면 `null` 까지 벗겨져 「CSV 행인가」 판정이 늘 false 가 된다 —
    // 범위 밖(undefined)만 null 로 접는다
    const weight = UNPLANNED_WEIGHT[j] ?? null
    const estimated = weight === null

    // 투입 비중에서 수량을 역산한다. CSV 행은 비중을 모르니 임의 수량이다
    const qty = roundQty(
      estimated
        ? (0.03 * ACCOUNT_TOTAL) / entryPrice
        : ((weight / 100) * ACCOUNT_TOTAL) / entryPrice,
    )
    const riskPct = estimated
      ? null
      : +(((entryPrice * qty) / ACCOUNT_TOTAL) * 100).toFixed(2)

    // ⑥: 「CSV 는 ④-0 스냅샷이 없다 — 매수일의 트렌드·VCP·레짐·베이스 번호를
    // DB에서 조회해 채운다」. 그래서 계획 없는 행도 스냅샷을 «든다» —
    // 이것이 없으면 조건 고정(트렌드 통과 안에서 계획 있음 vs 없음)이 성립하지 않는다
    const snapshot = snapshotOf(i, ret / 4, false, entryAt)
    const sellAt = entryAt + (2 + Math.floor(r(14) * 9)) * DAY
    const sellPrice = roundPrice(entryPrice * (1 + ret / 100))

    out.push({
      recordId: nextId++,
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      side: 'BUY',
      price: entryPrice,
      quantity: qty,
      filledAt: ymd(entryAt),
      sellReasons: [],
      reason: estimated ? '' : '급등 보고 따라 들어감',
      planId: null,
      planTitle: null,
      accountTotal: ACCOUNT_TOTAL,
      estimated,
      derived: null,
      snapshot,
    })

    out.push({
      recordId: nextId++,
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      side: 'SELL',
      price: sellPrice,
      quantity: qty,
      filledAt: ymd(sellAt),
      sellReasons: ['UNPLANNED'],
      reason: '',
      planId: null,
      planTitle: null,
      accountTotal: ACCOUNT_TOTAL,
      estimated,
      derived: {
        entryPrice,
        returnPct: +(((sellPrice - entryPrice) / entryPrice) * 100).toFixed(2),
        profit: (sellPrice - entryPrice) * qty,
        holdingDays: Math.round((sellAt - entryAt) / DAY),
        // **1R 이 없다.** 계획이 없으면 최초 손절폭이 없다 (⑦)
        rMultiple: null,
        riskPct,
        riskBand: riskPct === null ? null : riskBandOf(riskPct),
      },
      snapshot,
    })
  })

  return out
}

/** 체결 전부. 체결일 내림차순 — 목록의 기본 정렬이다 */
export const TRADE_RECORDS: TradeRecord[] = [
  ...buildPlanned(),
  ...buildUnplanned(),
].sort((a, b) => (a.filledAt < b.filledAt ? 1 : -1))

// ─────────────── ⑦ 통계 ───────────────
//
// **서버가 할 일을 목이 대신한다.** 이 계산이 프런트에 살면 안 되는 이유는
// ⑥ 이 `TradeRecordDerived` 를 «저장하는» 이유와 같다 — 분모가 세 군데에
// 흩어져 있어 조회마다 조인이 붙는다. 여기 있는 것은 목이기 때문이다.

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const round2 = (n: number) => +n.toFixed(2)

const AVG_MIN = SAMPLE_MIN.AVG

/**
 * 그룹 한 칸. **`rs` 를 접지 않고 담는다** — 세 표식의 점 도표가 이 배열로
 * 그려진다 (디자인 3장 ⑧).
 *
 * 승률·평균수익률은 **5건 미만이면 `null`** 이다. 방향조차 말하지 않는다 (⑦).
 */
function cellOf(key: string, label: string, rows: TradeRecord[]): GroupCell {
  const d = rows.flatMap((r) => (r.derived ? [r.derived] : []))
  const wins = d.filter((x) => x.returnPct > 0).length
  const enough = d.length >= AVG_MIN
  // 축은 «수익률 %»다. 계획 없는 매도도 여기 올라온다 — R 축은 빼고 있었다
  const rets = d.map((x) => ({
    pct: x.returnPct,
    broke: x.rMultiple !== null && x.rMultiple < -1,
  }))

  return {
    key,
    label,
    count: d.length,
    wins,
    losses: d.length - wins,
    winRate: enough ? round2((wins / d.length) * 100) : null,
    avgReturn: enough ? round2(mean(d.map((x) => x.returnPct))) : null,
    rets,
    // 벽 침범은 **1건부터 사실이다** — 게이트가 안 걸린다
    wallBreaks: rets.filter((x) => x.broke).length,
  }
}

/** 정산표 ②③④ + 파생 셋. **5건 미만이면 통째로 `null`** 이다 */
function settlementOf(sells: TradeRecord[]): Settlement | null {
  const d = sells.flatMap((r) => (r.derived ? [r.derived] : []))
  if (d.length < AVG_MIN) return null

  const wins = d.filter((x) => x.returnPct > 0)
  const losses = d.filter((x) => x.returnPct <= 0)
  const avgWin = wins.length ? mean(wins.map((x) => x.returnPct)) : 0
  // **음수로 둔다.** 절댓값으로 접으면 화면이 손실을 수익처럼 그리게 된다
  const avgLoss = losses.length ? mean(losses.map((x) => x.returnPct)) : 0
  const rs = d.flatMap((x) => (x.rMultiple === null ? [] : [x.rMultiple]))

  return {
    winRate: round2((wins.length / d.length) * 100),
    avgWin: round2(avgWin),
    avgLoss: round2(avgLoss),
    // 수익과 손실을 «따로» 낸다 — 하나로 묶으면 「오래 들고 있었다」가
    // 이긴 것 때문인지 진 것 때문인지 사라진다 (정산표 ④)
    holdWin: wins.length ? Math.round(mean(wins.map((x) => x.holdingDays))) : 0,
    holdLoss: losses.length
      ? Math.round(mean(losses.map((x) => x.holdingDays)))
      : 0,
    payoff: avgLoss ? round2(avgWin / Math.abs(avgLoss)) : 0,
    expectancy: Math.round(mean(d.map((x) => x.profit))),
    // 예측치는 **계획 있는 것만** — 1R 이 없으면 R 배수가 없다
    predictor: rs.length ? round2(mean(rs)) : 0,
  }
}

/** 정산표 ⑤ — **평균이 아니라 최대**다. 그래서 1건도 사실이다 */
function monthlyOf(sells: TradeRecord[]): MonthlyPeak[] {
  const byMonth = new Map<string, number[]>()
  for (const s of sells) {
    if (!s.derived) continue
    const m = s.filledAt.slice(0, 7)
    byMonth.set(m, [...(byMonth.get(m) ?? []), s.derived.returnPct])
  }
  return [...byMonth.entries()]
    .map(([month, rets]) => ({
      month,
      best: round2(Math.max(...rets)),
      worst: round2(Math.min(...rets)),
      count: rets.length,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
}

/**
 * 자본 감소. **사실이라 1건도 유효하다** (⑦).
 *
 * 곡선은 **R 축**이다 — *「최대 누적 감소   고점 대비 얼마나 밀렸나 (R)」*.
 * 계획 없는 매도는 R 이 없어 곡선에 못 올라간다.
 *
 * ⚠️ **최장 연속 손실은 «전부»로 센다.** 손실은 계획 없이도 손실이고,
 *    ⑧ 이 *「손실이 이어지면 줄인다」* 고 할 때 그 손실에 예외를 두지 않는다.
 */
function capitalOf(sells: TradeRecord[]): CapitalCurve {
  const points: CapitalCurve['points'] = []
  let cum = 0
  let peak = 0
  let maxDd = 0

  for (const s of sells) {
    const r = s.derived?.rMultiple
    if (r === null || r === undefined) continue
    cum = round2(cum + r)
    peak = Math.max(peak, cum)
    maxDd = Math.max(maxDd, peak - cum)
    points.push({ date: s.filledAt, cumR: cum, peakR: round2(peak) })
  }

  let streak = 0
  let longest = 0
  for (const s of sells) {
    if (!s.derived) continue
    if (s.derived.returnPct <= 0) {
      streak += 1
      longest = Math.max(longest, streak)
    } else streak = 0
  }

  return {
    points,
    maxDrawdown: round2(maxDd),
    currentDrawdown: round2(peak - cum),
    longestLossStreak: longest,
  }
}

const bandLabel: Record<RiskBand, string> = {
  UNDER_1: '1% 미만',
  MID: '1~2.5%',
  OVER_25: '2.5% 초과',
}

/** 그룹 축 아홉 (⑦) */
function groupsOf(sells: TradeRecord[]): GroupAxis[] {
  const by = (f: (r: TradeRecord) => boolean) => sells.filter(f)
  const snap = (r: TradeRecord) => r.snapshot

  const axes: GroupAxis[] = [
    {
      key: 'plan',
      label: '계획 유무',
      desc: '⑦의 첫 분류축 — 계획의 가치를 내 데이터로 증명하는 자리 (F5)',
      cells: [
        cellOf(
          'yes',
          '계획 있음',
          by((r) => r.planId !== null),
        ),
        cellOf(
          'no',
          '계획 없음',
          by((r) => r.planId === null),
        ),
      ],
    },
    {
      key: 'baseNo',
      label: '베이스 번호',
      desc: '몇 번째 베이스에서 들어갔나',
      cells: [
        cellOf(
          '1-2',
          '1~2번째',
          by((r) => (snap(r)?.baseNo ?? 9) <= 2),
        ),
        cellOf(
          '3-4',
          '3~4번째',
          by((r) => [3, 4].includes(snap(r)?.baseNo ?? 9)),
        ),
        cellOf(
          '5+',
          '5번째 이상',
          by((r) => (snap(r)?.baseNo ?? 0) >= 5),
        ),
      ],
    },
    {
      key: 'trend',
      label: '트렌드 템플릿',
      desc: '8조건 중 몇 개를 통과한 상태에서 들어갔나',
      cells: [
        cellOf(
          '8',
          '8/8',
          by((r) => snap(r)?.trendPassed === 8),
        ),
        cellOf(
          '67',
          '6~7',
          by((r) => [6, 7].includes(snap(r)?.trendPassed ?? 0)),
        ),
        cellOf(
          'low',
          '5 이하',
          by((r) => (snap(r)?.trendPassed ?? 9) <= 5),
        ),
      ],
    },
    {
      key: 'vcp',
      label: 'VCP',
      desc: '수축이 잡혔나',
      cells: [
        cellOf(
          'yes',
          '있음',
          by((r) => snap(r)?.vcp === true),
        ),
        cellOf(
          'no',
          '없음',
          by((r) => snap(r)?.vcp === false),
        ),
      ],
    },
    {
      key: 'entryState',
      label: '진입 상태',
      desc: '살 수 있는 셋과 못 사는 하나 (②)',
      cells: [
        cellOf(
          'EARLY',
          '조기',
          by((r) => snap(r)?.entryState === 'EARLY'),
        ),
        cellOf(
          'BREAKOUT',
          '돌파',
          by((r) => snap(r)?.entryState === 'BREAKOUT'),
        ),
        cellOf(
          'PULLBACK',
          '눌림',
          by((r) => snap(r)?.entryState === 'PULLBACK'),
        ),
        cellOf(
          'BLOCKED',
          '진입 불가',
          by((r) => snap(r)?.entryState === 'BLOCKED'),
        ),
      ],
    },
    {
      key: 'damage',
      label: '훼손 점수',
      desc: '진입 시점의 추세 훼손 신호 0~2 (⑤-3)',
      cells: [0, 1, 2].map((n) =>
        cellOf(
          String(n),
          `${n}점`,
          by((r) => snap(r)?.damageScore === n),
        ),
      ),
    },
    {
      key: 'riskBand',
      label: '위험노출 구간',
      desc: '계좌를 몇 % 걸었나 (③-2)',
      cells: [
        ...RISK_BANDS.map((b) =>
          cellOf(
            b,
            bandLabel[b],
            by((r) => r.derived?.riskBand === b),
          ),
        ),
        // 「없음」을 「0」으로 접지 않는다 — 산출 불가한 것과 낮은 것은 다르다
        cellOf(
          'unknown',
          '미상',
          by((r) => r.derived?.riskBand == null),
        ),
      ],
    },
    {
      key: 'regime',
      label: '레짐',
      desc: '그날 시장이 어느 국면이었나',
      cells: REGIMES.map((g) =>
        cellOf(
          g,
          REGIME_LABEL[g],
          by((r) => snap(r)?.regime === g),
        ),
      ),
    },
    {
      key: 'sellReason',
      label: '매도 사유',
      // ⚠️ 한 체결에 사유가 여럿이라 «합이 건수를 넘는다». 표가 그렇다고 말해야 한다
      desc: '왜 팔았나 — 한 체결에 여럿이라 합이 건수를 넘는다',
      cells: SELL_REASONS.map((s) =>
        cellOf(
          s,
          SELL_REASON_LABEL[s],
          by((r) => r.sellReasons.includes(s)),
        ),
      ),
    },
  ]

  // 빈 칸은 «지우지 않는다». 0건도 사실이고, 지우면 축의 모양이 달라 보인다
  return axes
}

/** 조건 고정 — 선별 효과를 지우고 계획 효과만 본다 (⑦ ★★) */
function controlledOf(sells: TradeRecord[]): PlanPair[] {
  const pair = (
    label: string,
    desc: string,
    rows: TradeRecord[],
  ): PlanPair => ({
    label,
    desc,
    withPlan: cellOf(
      'yes',
      '계획 있음',
      rows.filter((r) => r.planId !== null),
    ),
    withoutPlan: cellOf(
      'no',
      '계획 없음',
      rows.filter((r) => r.planId === null),
    ),
  })

  return [
    pair(
      '트렌드 8/8 안에서',
      '종목이 같은 조건을 통과한 것끼리만 놓는다 — 남는 차이가 계획이다',
      sells.filter((r) => r.snapshot?.trendPassed === 8),
    ),
    pair(
      '레짐 「돌파성공」 안에서',
      '시장 국면을 고정한다 — 좋은 장에서 벌었을 뿐인지를 가른다',
      sells.filter((r) => r.snapshot?.regime === 'start'),
    ),
  ]
}

/**
 * 교차 — 계획 유무 × 위험노출 구간.
 * *「계획 없는 매매가 어느 구간에 몰리는지가 여기서만 보인다」* (⑦)
 */
function crossOf(sells: TradeRecord[]): PlanPair[] {
  return [...RISK_BANDS, null].map((b) => {
    const rows = sells.filter((r) => (r.derived?.riskBand ?? null) === b)
    return {
      label: b === null ? '미상' : bandLabel[b],
      desc: b === null ? '손절가가 없어 산출 불가' : '',
      withPlan: cellOf(
        'yes',
        '계획 있음',
        rows.filter((r) => r.planId !== null),
      ),
      withoutPlan: cellOf(
        'no',
        '계획 없음',
        rows.filter((r) => r.planId === null),
      ),
    }
  })
}

/**
 * 1R 의 폭. **계획마다 다르므로 평균과 범위를 같이 낸다.**
 * `returnPct ÷ rMultiple` = 진입가 대비 최초 손절폭 % 다.
 */
function oneROf(sells: TradeRecord[]): TradeStats['oneR'] {
  const widths = sells.flatMap((r) => {
    const d = r.derived
    if (!d || d.rMultiple === null || d.rMultiple === 0) return []
    return [Math.abs(d.returnPct / d.rMultiple)]
  })
  if (!widths.length) return null
  return {
    avgPct: round2(mean(widths)),
    minPct: round2(Math.min(...widths)),
    maxPct: round2(Math.max(...widths)),
  }
}

/**
 * ④ 에 지금 박혀 있는 값 — **판정의 기준** (8장 ①).
 *
 * 💀 **없는 자리를 채우지 않는다.** 최종미지 「아직 안 정한 것」이 그대로
 * ⚪ 로 나온다 — *「손실이 이어질 때 포지션 규모를 어떻게 조정할지 정하기」* ·
 * *「위험 총량을 유지하면서 포지션을 키우는 방법 정하기」* 가 **책 미지**라서
 * 연속 손실과 기대값에는 견줄 값이 없다. 8장이 ⚪ 를 따로 둔 이유가 이것이다 —
 * *「타겟이 없으면 판정 자체가 성립하지 않는다」.*
 *
 * ⚠️ **승률에는 타겟이 없다.** ⑦ 의 궤적에서 승률은 ④ 로 «가는» 값이지
 *    ④ 에서 오는 값이 아니다 (*「승률 ──→ ④-1 손익비 목표」*).
 */
function targetsOf(): StatTargets {
  return {
    // ④-1 에 박혀 있는 손절폭 상한의 근거. ⑦ 이 내는 평균 수익과 어긋나 있다
    avgWin: { value: STOP_LIMIT_BASIS.avgWin, from: '④ 손절폭 상한의 근거' },
    payoff: { value: STOP_LIMIT_BASIS.targetRR, from: '④ 손익비 목표' },
  }
  // 💀 **예측치에 「0R」을 타겟으로 넣었다가 뺐다** (2026-09-12). 0R 은 ④ 에
  //    박힌 값이 아니라 내가 지어낸 바닥선이고, 바닥선을 타겟 자리에 넣으면
  //    «크게 넘어선 것»이 «크게 어긋난 것»과 같은 그림이 된다 — +1.22R 에
  //    경고 색이 꽉 찼다. 타겟이 없는 지표의 판정은 8장 ② 가 이미 답했다:
  //    *「목표는 기간마다 끊임없이 개선하는 것뿐이다 … 추세선이 그 영역이
  //    개선됐는지 부족한지를 표시한다」.*
}

/** `2025-06-02` → `2025-Q2` */
const quarterOf = (filledAt: string) =>
  `${filledAt.slice(0, 4)}-Q${Math.floor(Number(filledAt.slice(5, 7)) / 3.01) + 1}`

/**
 * 지표별 분기 추이 — **「지금」 옆의 「계속」** (8장 ②).
 *
 * *「타겟이 설정돼 있을 때, 추세는 회사가 그 목표를 맞춘 기간과 맞추지 못한
 * **연속 기간의 수**를 보여준다」* (8장 ②). 여기서는 점 하나가 한 분기다.
 *
 * ⚠️ **표본이 모자란 분기는 `value` 가 `null` 이다.** 0 으로 채우면
 *    「그 분기에 잃었다」로 읽힌다 — 없는 것과 0 은 다르다 (8장 ①).
 */
function trendsOf(sells: TradeRecord[]): KpiTrends {
  const byQ = new Map<string, TradeRecord[]>()
  for (const r of sells) {
    if (!r.derived) continue
    const q = quarterOf(r.filledAt)
    byQ.set(q, [...(byQ.get(q) ?? []), r])
  }
  const periods = [...byQ.keys()].sort()

  const line = (pick: (s: Settlement) => number): TrendPoint[] =>
    periods.map((period) => {
      const rows = byQ.get(period) ?? []
      const st = settlementOf(rows)
      return {
        period,
        count: rows.length,
        // settlementOf 가 5건 미만이면 null 을 준다 — 게이트가 여기서도 같다
        value: st ? pick(st) : null,
      }
    })

  const out: KpiTrends = {
    winRate: line((s) => s.winRate),
    avgWin: line((s) => s.avgWin),
    avgLoss: line((s) => s.avgLoss),
    payoff: line((s) => s.payoff),
    expectancy: line((s) => s.expectancy),
    predictor: line((s) => s.predictor),
    holdWin: line((s) => s.holdWin),
    holdLoss: line((s) => s.holdLoss),
  }

  // 자본 감소는 **누적**이라 분기로 자르면 뜻이 달라진다. 분기 안에서 다시
  // 세는 것이 맞다 — 「그 분기에 몇 번 연달아 잃었나」
  out.lossStreak = periods.map((period) => {
    const rows = byQ.get(period) ?? []
    return {
      period,
      count: rows.length,
      value: rows.length ? capitalOf(rows).longestLossStreak : null,
    }
  })
  out.maxDrawdown = periods.map((period) => {
    const rows = byQ.get(period) ?? []
    return {
      period,
      count: rows.length,
      value: rows.length ? capitalOf(rows).maxDrawdown : null,
    }
  })

  return out
}

export interface StatsQuery {
  from?: string
  to?: string
  stockCode?: string
  planned?: boolean
}

export function filterRecords(q: StatsQuery): TradeRecord[] {
  return TRADE_RECORDS.filter((r) => {
    if (q.from && r.filledAt < q.from) return false
    if (q.to && r.filledAt > q.to) return false
    if (q.stockCode && r.stockCode !== q.stockCode) return false
    if (q.planned !== undefined && (r.planId !== null) !== q.planned)
      return false
    return true
  })
}

/**
 * ⑦ 이 내놓는 것 전부.
 *
 * **세는 단위는 매도 기록 하나다** (⑥) — 매수 행은 건수에 안 들어간다.
 * 통계는 **기본 누적 전체**이고 기간은 옵션이다 (⑦).
 */
export function makeStats(q: StatsQuery = {}): TradeStats {
  // 체결일 오름차순 — 자본 곡선과 연속 손실이 «순서»를 쓴다
  const sells = filterRecords(q)
    .filter((r) => r.side === 'SELL')
    .sort((a, b) => (a.filledAt < b.filledAt ? -1 : 1))

  const d = sells.flatMap((r) => (r.derived ? [r.derived] : []))

  // ★ 첫 화면 맨 위 — **평균이 아니라 최대**다
  const byReturn = [...sells].sort(
    (a, b) => (b.derived?.returnPct ?? 0) - (a.derived?.returnPct ?? 0),
  )

  return {
    closed: sells.length,
    planned: sells.filter((r) => r.planId !== null).length,
    unplanned: sells.filter((r) => r.planId === null).length,
    wallBreaks: sells.filter(
      (r) => r.derived?.rMultiple != null && r.derived.rMultiple < -1,
    ).length,
    oneR: oneROf(sells),
    overall: cellOf('all', '전체', sells),
    best: byReturn[0] ?? null,
    worst: byReturn.at(-1) ?? null,
    settlement: settlementOf(sells),
    monthly: monthlyOf(sells),
    capital: capitalOf(sells),
    groups: d.length ? groupsOf(sells) : [],
    controlled: d.length ? controlledOf(sells) : [],
    cross: d.length ? crossOf(sells) : [],
    targets: targetsOf(),
    trends: trendsOf(sells),
  }
}
