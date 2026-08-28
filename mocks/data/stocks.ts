/**
 * 목 데이터 원본. 백엔드가 안 떠 있어도 화면이 돌게 한다.
 *
 * 규칙 둘:
 *   ① 종목코드를 seed 로 쓴다 — 같은 종목은 새로고침해도 같은 차트가 나온다.
 *   ② 값은 백엔드 DTO 형태 그대로다(`entities/stock/model/types.ts`).
 *      래핑(`{ meta, data }`)은 핸들러가 씌운다.
 */

export type MockStock = { stockCode: string; stockName: string }

export const STOCKS: MockStock[] = [
  { stockCode: '000660', stockName: 'SK하이닉스' },
  { stockCode: '005930', stockName: '삼성전자' },
  { stockCode: '041510', stockName: '에스엠' },
  { stockCode: '035420', stockName: 'NAVER' },
  { stockCode: '035720', stockName: '카카오' },
  { stockCode: '207940', stockName: '삼성바이오로직스' },
  { stockCode: '051910', stockName: 'LG화학' },
  { stockCode: '006400', stockName: '삼성SDI' },
]

export const stockName = (code: string) =>
  STOCKS.find((s) => s.stockCode === code)?.stockName ?? `종목 ${code}`

/** 종목코드 → 정수 seed. */
function seedOf(code: string): number {
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 100_000
  return h
}

/** seed 기반 결정적 난수 (0~1). */
function rand(seed: number, i: number): number {
  const x = Math.sin(seed + i * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const DAY = 86_400_000

/** 'YYYY-MM-DD' (로컬 기준). */
function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export type MockCandle = {
  tradeDate: string
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
  volume: number
}

/**
 * 일봉 생성. 주말은 건너뛴다.
 *
 * 모양은 「베이스 두 번 → 돌파」로, 불타기가 찾는 패턴이 눈에 보이게 만든다
 * (지지/저항 박스가 얹힐 자리가 실제로 생기도록).
 */
export function makeCandles(code: string, days = 400): MockCandle[] {
  const seed = seedOf(code)
  const startPrice = 40_000 + (seed % 60) * 1_000
  const out: MockCandle[] = []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let price = startPrice
  for (let i = days; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // 주말 제외

    const t = (days - i) / days // 0 → 1 로 흐르는 진행도
    // 상승 → 횡보(베이스) → 상승 → 횡보 → 돌파
    let drift: number
    if (t < 0.25) drift = 0.0035
    else if (t < 0.45) drift = 0.0002 // 1차 베이스
    else if (t < 0.6) drift = 0.004
    else if (t < 0.82) drift = 0.0003 // 2차 베이스
    else drift = 0.005 // 최종 돌파

    const noise = (rand(seed, i) - 0.5) * 0.022
    price = price * (1 + drift + noise)

    const open = Math.round(price * (1 + (rand(seed, i + 7) - 0.5) * 0.006))
    const close = Math.round(price)
    const high = Math.round(Math.max(open, close) * (1 + rand(seed, i + 13) * 0.012))
    const low = Math.round(Math.min(open, close) * (1 - rand(seed, i + 21) * 0.012))

    out.push({
      tradeDate: ymd(d),
      openPrice: open,
      highPrice: high,
      lowPrice: low,
      closePrice: close,
      volume: Math.round(300_000 + rand(seed, i + 31) * 900_000),
    })
  }
  return out
}

/** 단순이동평균. 앞쪽 워밍업 구간(period-1개)은 값이 없으므로 빼고 내려준다. */
export function makeMovingAverage(candles: MockCandle[], period: number) {
  const out: Array<{ tradeDate: string; price: number }> = []
  for (let i = period - 1; i < candles.length; i++) {
    const win = candles.slice(i - period + 1, i + 1)
    const avg = win.reduce((s, c) => s + c.closePrice, 0) / period
    out.push({ tradeDate: candles[i].tradeDate, price: Math.round(avg) })
  }
  return out
}

/**
 * 지지/저항 박스. 위 makeCandles 가 만든 두 베이스 구간(t 0.25~0.45, 0.6~0.82)을
 * 그대로 집어 실제 고·저로 박스를 만든다.
 */
export function makeBases(candles: MockCandle[]) {
  const spans: Array<[number, number]> = [
    [0.26, 0.44],
    [0.61, 0.81],
  ]
  return spans.map(([a, b]) => {
    const from = Math.floor(candles.length * a)
    const to = Math.floor(candles.length * b)
    const slice = candles.slice(from, to)
    return {
      startDate: candles[from].tradeDate,
      endDate: candles[to - 1].tradeDate,
      supportPrice: Math.min(...slice.map((c) => c.lowPrice)),
      resistancePrice: Math.max(...slice.map((c) => c.highPrice)),
    }
  })
}

export const REGIMES = [
  'BREAKOUT_SUCCESS',
  'BREAKOUT_READY',
  'BREAKOUT_FAILED',
  'DOWNSIDE_BREAK',
  'DIRECTION_UNDETERMINED',
] as const

/** 종목마다 고정된 레짐 — 새로고침해도 안 바뀐다. */
export function regimeOf(code: string) {
  return REGIMES[seedOf(code) % REGIMES.length]
}

export { seedOf, rand }
