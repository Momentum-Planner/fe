import type { CandlestickData, UTCTimestamp } from 'lightweight-charts'
import { makeHistory } from '@/shared/lib/chartHistory'

/**
 * Hand-authored candle pattern lifted from the design: a two-base
 * consolidation breakout.
 *   1) climb 520k → 800k
 *   2) first base (sideways 800–870k)
 *   3) breakout to ~950k
 *   4) second base (sideways 940–1060k)
 *   5) final breakout to the current price ₩1,150,482
 * Tuples are [open, close, high, low] in thousands of KRW.
 */
const rawCandles: Array<[number, number, number, number]> = [
  // ── Phase 1: rise 520 → 800 ──
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
  // ── Phase 2: first base / sideways 800–870 ──
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
  [850, 845, 862, 835],
  [845, 855, 868, 835],
  [855, 845, 865, 835],
  [845, 860, 870, 840],
  // ── Phase 3: breakout to 950 ──
  [860, 895, 905, 855],
  [895, 940, 955, 890],
  // ── Phase 4: second base / sideways 940–1060 ──
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
  [1035, 1025, 1050, 1015],
  [1025, 1040, 1055, 1015],
  [1040, 1030, 1050, 1020],
  [1030, 1045, 1055, 1020],
  // ── Phase 5: final breakout to current price ──
  [1045, 1150, 1160, 1040],
]

const DAY_SECONDS = 86_400
const startSeconds = Date.UTC(2026, 0, 5) / 1000 // 2026-01-05

const designedCandles: CandlestickData[] = rawCandles.map(
  ([open, close, high, low], i) => ({
    time: (startSeconds + i * DAY_SECONDS) as UTCTimestamp,
    open: open * 1000,
    high: high * 1000,
    low: low * 1000,
    close: close * 1000,
  }),
)

/** Generated past history prepended so dragging the chart left reveals older data. */
const HISTORY_LEN = 160
const history = makeHistory(
  HISTORY_LEN,
  designedCandles[0].time as number,
  designedCandles[0].open,
)

export const marketCandles: CandlestickData[] = [...history, ...designedCandles]

/** Default view = the designed (recent) window; older history is to the left. */
export const VISIBLE_BARS = designedCandles.length + 6

/** Yellow support/resistance boxes framing each consolidation base (indices offset past history). */
export const baseBoxes = [
  {
    fromIndex: 15 + HISTORY_LEN,
    toIndex: 30 + HISTORY_LEN,
    low: 800_000,
    high: 875_000,
  },
  {
    fromIndex: 33 + HISTORY_LEN,
    toIndex: 47 + HISTORY_LEN,
    low: 940_000,
    high: 1_065_000,
  },
] as const

export const currentPrice = 1_150_482

export type RankingRow = {
  name: string
  momentum: number
  stability: string
  price: number
}

/** 오늘의 추세 목록 행 (돌파 성공). */
export const rankingRows: RankingRow[] = [
  {
    name: 'SK하이닉스',
    momentum: 28.4,
    stability: '0.58',
    price: 1_150_482,
  },
  { name: '삼성전자', momentum: 24.1, stability: '0.55', price: 89_200 },
  { name: '한미반도체', momentum: 21.7, stability: '0.52', price: 142_500 },
  { name: '현대로템', momentum: 19.3, stability: '0.49', price: 61_800 },
  {
    name: 'HD현대일렉트릭',
    momentum: 17.6,
    stability: '0.47',
    price: 412_000,
  },
  {
    name: 'LG에너지솔루션',
    momentum: 15.2,
    stability: '0.44',
    price: 398_500,
  },
  {
    name: '두산에너빌리티',
    momentum: 13.8,
    stability: '0.41',
    price: 24_150,
  },
  { name: '삼성SDI', momentum: 11.4, stability: '0.38', price: 315_000 },
  { name: 'NAVER', momentum: 9.7, stability: '0.35', price: 198_400 },
  { name: '카카오', momentum: 7.2, stability: '0.31', price: 42_300 },
  { name: '셀트리온', momentum: 5.9, stability: '0.28', price: 176_800 },
]
