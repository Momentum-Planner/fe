import type {
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts'
import { makeHistory } from '@/shared/lib/chartHistory'

/**
 * Stock-detail chart data for lightweight-charts. The candle pattern (two-base
 * breakout) is carried over from the design; here it's served as real series
 * data so the chart is drawn by the library, not hand-built SVG. Swap
 * `stockCandles` for an API response to go live.
 */

type Tuple = [open: number, close: number, high: number, low: number]

const rawCandles: Tuple[] = [
  [540, 530, 555, 510],
  [530, 525, 540, 510],
  [525, 545, 555, 515],
  [545, 575, 590, 540],
  [575, 600, 615, 570],
  [600, 595, 615, 580],
  [595, 630, 645, 590],
  [630, 660, 680, 625],
  [660, 690, 705, 655],
  [690, 715, 730, 685],
  [715, 700, 725, 690],
  [700, 740, 755, 695],
  [740, 770, 785, 735],
  [770, 790, 800, 760],
  [790, 815, 825, 785],
  [815, 840, 850, 810],
  [840, 830, 855, 825],
  [830, 845, 860, 820],
  [845, 825, 860, 815],
  [825, 850, 865, 820],
  [850, 835, 860, 825],
  [835, 855, 870, 830],
  [855, 840, 865, 830],
  [840, 855, 868, 830],
  [855, 845, 865, 835],
  [845, 860, 870, 835],
  [860, 850, 870, 840],
  [850, 895, 905, 845],
  [895, 940, 955, 890],
  [940, 1010, 1030, 920],
  [1010, 985, 1015, 965],
  [985, 1020, 1040, 970],
  [1020, 995, 1030, 975],
  [995, 1015, 1040, 980],
  [1015, 1005, 1035, 985],
  [1005, 1025, 1045, 990],
  [1025, 1010, 1035, 995],
  [1010, 1030, 1050, 995],
  [1030, 1020, 1045, 1010],
  [1020, 1035, 1050, 1010],
  [1035, 1150, 1160, 1030],
]

const DAY = 86_400
const START = Date.UTC(2026, 0, 5) / 1000

const designedCandles: CandlestickData[] = rawCandles.map(
  ([open, close, high, low], i) => ({
    time: (START + i * DAY) as UTCTimestamp,
    open: open * 1000,
    high: high * 1000,
    low: low * 1000,
    close: close * 1000,
  }),
)

const HISTORY_LEN = 160
// 손으로 박은 상수 배열이라 첫 봉이 늘 있다. 타입만 그것을 모른다
const firstDesigned = designedCandles[0]
const history = firstDesigned
  ? makeHistory(HISTORY_LEN, firstDesigned.time as number, firstDesigned.open)
  : []

export const stockCandles: CandlestickData[] = [...history, ...designedCandles]

/** Default view = the designed (recent) window; older history is to the left. */
export const VISIBLE_BARS = designedCandles.length + 6

const VOL_UP = 'rgba(255,54,54,0.55)'
const VOL_DOWN = 'rgba(52,173,228,0.55)'

/** Volume bars (bottom overlay scale), colored by up/down candle. */
export const stockVolume: HistogramData[] = stockCandles.map((c, i) => ({
  time: c.time,
  value: 14 + Math.abs(Math.sin(i * 1.3) * 22) + (i % 5),
  color: c.close >= c.open ? VOL_UP : VOL_DOWN,
}))

/** Simple moving average over candle closes; returns lightweight-charts LineData. */
function sma(period: number): LineData[] {
  const out: LineData[] = []
  for (let i = 0; i < stockCandles.length; i++) {
    const start = Math.max(0, i - period + 1)
    let sum = 0
    let n = 0
    for (let j = start; j <= i; j++) {
      sum += stockCandles[j]?.close ?? 0
      n++
    }
    const c = stockCandles[i]
    if (c) out.push({ time: c.time, value: sum / n })
  }
  return out
}

/** 3 moving averages (periods kept short to read well on this sample; labelled 50/150/200). */
export const movingAverages = [
  { period: 5, color: '#34DE7B' }, // 50일 — 초록
  { period: 10, color: '#FF3636' }, // 150일 — 빨강
  { period: 15, color: '#F46B1A' }, // 200일 — 주황
].map((m) => ({ ...m, data: sma(m.period) }))

/** Yellow support/resistance boxes framing each consolidation base. */
export const stockBaseBoxes = [
  {
    fromIndex: 15 + HISTORY_LEN,
    toIndex: 26 + HISTORY_LEN,
    low: 805_000,
    high: 875_000,
  },
  {
    fromIndex: 29 + HISTORY_LEN,
    toIndex: 38 + HISTORY_LEN,
    low: 950_000,
    high: 1_060_000,
  },
] as const

/** Right-gutter price tag — current price only (MA prices intentionally omitted). */
export const stockPriceTags = [{ price: 1_150_482, color: '#FF367C' }]
