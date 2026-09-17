import { REGIMES, TREND_CONDITIONS } from '@/shared/lib/snapshots'
import type {
  DailyScreening,
  FundamentalsRaw,
  TrendRaw,
} from '@/shared/lib/snapshots'
import { makeCandles, rand, seedOf } from './stocks'
import type { MockCandle } from './stocks'

/**
 * 하루치 스크리닝 판정 (`DailyScreeningResult`) 목 — **종목 × 일자로 쌓는다.**
 *
 * ⚠️ **캔들과 «같은 씨앗»을 쓴다.** 판정을 따로 난수로 만들면 봉은 오르는데
 *    「하방이탈」이 뜨는 식으로 화면이 거짓말을 한다. 계획을 세우는 화면에서
 *    근거와 그림이 어긋나면 그 화면은 아무 말도 못 하는 것이 된다.
 *
 * ⚠️ 판정이 **매일 있지는 않다.** ①-1 게이트에 걸린 날은 행이 없다 —
 *    후보가 아니었던 날이다. 화면에서 그 «빈칸»이 정보가 된다
 *    (디자인 3장 ⑤ — 「간극이 정보다」).
 */

const ENTRY_STATES = ['EARLY', 'BREAKOUT', 'PULLBACK', 'BLOCKED'] as const

const sma = (candles: MockCandle[], i: number, period: number) => {
  const from = Math.max(0, i - period + 1)
  const win = candles.slice(from, i + 1)
  return Math.round(win.reduce((s, c) => s + c.closePrice, 0) / win.length)
}

/**
 * 트렌드 템플릿 원값 (Q12) — **그날 봉까지의 캔들로** 잰다.
 * 차트에 그려지는 이평선과 같은 값이어야 화면이 한 이야기를 한다.
 *
 * ⚠️ 캔들이 400일치라 앞쪽 날짜는 200일선·52주 창이 모자란다. 있는 만큼으로 잰다.
 */
function trendAt(candles: MockCandle[], i: number, seed: number): TrendRaw {
  const c = candles[i]
  const close = c?.closePrice ?? 0
  const ma200At = (k: number) => sma(candles, k, 200)
  let rising = 0
  for (let k = i; k > 0 && ma200At(k) > ma200At(k - 1); k -= 5) rising += 5
  const year = candles.slice(Math.max(0, i - 250), i + 1)
  const low = Math.min(...year.map((x) => x.lowPrice))
  const high = Math.max(...year.map((x) => x.highPrice))
  const rsDown = rand(seed, Math.floor(i / 10) + 601) < 0.2
  return {
    close,
    ma50: sma(candles, i, 50),
    ma150: sma(candles, i, 150),
    ma200: ma200At(i),
    ma200RisingMonths: Math.floor(rising / 21),
    fromLow52: +(((close - low) / low) * 100).toFixed(1),
    fromHigh52: +(((close - high) / high) * 100).toFixed(1),
    rs: 70 + Math.floor(rand(seed, Math.floor(i / 5) + 501) * 29),
    rsTrendWeeks: rsDown
      ? -(1 + Math.floor(rand(seed, i + 611) * 4))
      : 1 + Math.floor(rand(seed, Math.floor(i / 5) + 621) * 14),
  }
}

/**
 * 공시일 — 분기 실적은 이 날짜에 «바뀐다». 잠정 실적은 안 쓴다 (④-0).
 * 날짜와 그때 가장 최근 분기의 짝이다.
 */
const DISCLOSURES: Array<
  [monthDay: string, quarter: 1 | 2 | 3 | 4, yearShift: number]
> = [
  ['02-14', 4, -1],
  ['05-15', 1, 0],
  ['08-14', 2, 0],
  ['11-14', 3, 0],
]

/**
 * 펀더멘털 원값 (Q12) — 그날 이전 마지막 공시의 세 분기.
 * 분기 번호로 씨앗을 잡아 **같은 분기는 어느 날 봐도 같은 값**이 나온다.
 */
export function fundamentalsAt(code: string, date: string): FundamentalsRaw {
  const seed = seedOf(code)
  const year = Number(date.slice(0, 4))
  const md = date.slice(5)
  const hits = DISCLOSURES.filter(([d]) => d <= md)
  const [pubMd, q, shift] = hits.at(-1) ?? ['11-14', 3, 0]
  const pubYear = hits.length ? year : year - 1
  const qYear = pubYear + (hits.length ? shift : 0)
  const abs = qYear * 4 + (q - 1)

  const quarters = [abs - 2, abs - 1, abs].map((n) => ({
    label: `${String(Math.floor(n / 4)).slice(2)}.${(n % 4) + 1}Q`,
    epsGrowth: Math.round(12 + rand(seed, n + 701) * 30),
    revenueGrowth: Math.round(5 + rand(seed, n + 711) * 15),
    margin: +(8 + rand(seed, n + 721) * 5).toFixed(1),
  }))
  return { disclosedAt: `${pubYear}-${pubMd}`, quarters }
}

/** 그날 봉의 자리 — 날짜가 봉에 없으면(주말·휴장) 그 이전 마지막 봉 */
function barIndex(candles: MockCandle[], date: string) {
  let idx = -1
  candles.forEach((c, k) => {
    if (c.tradeDate <= date) idx = k
  })
  return idx < 0 ? candles.length - 1 : idx
}

/**
 * 한 종목 · 한 날짜의 원값 둘. 계획 목이 손으로 박은 스냅샷에 이것을 붙인다 —
 * 요약값만 손으로 박고 원값은 캔들에서 «만들어» 와야 둘이 어긋나지 않는다.
 */
export function rawOn(code: string, date: string) {
  const candles = makeCandles(code)
  const i = barIndex(candles, date)
  return {
    trend: trendAt(candles, i, seedOf(code)),
    fundamentals: fundamentalsAt(code, date),
  }
}

/**
 * 한 종목의 판정 이력.
 *
 * 캔들을 그대로 받아 **그날 봉의 자리**로 판정을 만든다 — 최근 고점에 가까울수록
 * 돌파, 멀면 진입 불가. 그래야 띠와 차트가 같은 이야기를 한다.
 */
export function makeScreening(code: string, days = 180): DailyScreening[] {
  const seed = seedOf(code)
  const candles = makeCandles(code)
  const offset = candles.length - Math.min(days, candles.length)
  const out: DailyScreening[] = []

  for (let k = offset; k < candles.length; k++) {
    const c = candles[k]
    if (!c) continue
    const i = k - offset
    // 게이트에 걸린 날 — 행이 «없다». 후보가 아니었던 날이다
    if (rand(seed, i + 101) < 0.18) continue

    // 최근 60봉의 고점 대비 어디인가 — 진입 상태를 이 자리가 정한다
    const win = candles.slice(Math.max(offset, k - 60), k + 1)
    const high = Math.max(...win.map((x) => x.highPrice))
    const pos = ((c.closePrice - high) / high) * 100

    const entryState =
      pos >= -1
        ? 'BREAKOUT'
        : pos >= -4
          ? 'PULLBACK'
          : pos >= -9
            ? 'EARLY'
            : 'BLOCKED'

    // 트렌드는 «대개 8/8» 이다 — ①-1 게이트가 그것을 요구한다.
    // 어긋나는 날은 드물고, 어긋나면 이름이 붙는다
    const miss = rand(seed, i + 211) < 0.15 ? 1 : 0
    const failIdx = Math.floor(rand(seed, i + 307) * TREND_CONDITIONS.length)

    out.push({
      dailyScreeningResultId: seed * 1000 + i,
      date: c.tradeDate,
      entryState: ENTRY_STATES[ENTRY_STATES.indexOf(entryState)] ?? 'BLOCKED',
      // 펀더멘털은 «천천히» 움직인다 — 분기 실적이라 날마다 안 바뀐다
      fundamentalScore: Math.min(
        7,
        Math.max(0, 3 + Math.round(rand(seed, Math.floor(i / 45) + 11) * 4)),
      ),
      damageScore: rand(seed, i + 401) < 0.08 ? 1 : 0,
      damageAt: `${c.tradeDate} 15:30`,
      entryPosition: +pos.toFixed(1),
      regime:
        REGIMES[Math.floor(rand(seed, Math.floor(i / 20) + 5) * 4)] ?? 'none',
      trendPassed: 8 - miss,
      trendFailed: miss ? [TREND_CONDITIONS[failIdx] ?? 'RS 70 이상'] : [],
      trend: trendAt(candles, k, seed),
      fundamentals: fundamentalsAt(code, c.tradeDate),
    })
  }

  return out
}
