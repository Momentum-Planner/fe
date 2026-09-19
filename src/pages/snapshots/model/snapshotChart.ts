import type {
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts'
import { makeHistory } from '@/shared/lib/chartHistory'

/**
 * Snapshot-flow comparison chart data for lightweight-charts: candles + volume
 * + 3 moving averages, plus metadata for the yellow S/R boxes and the
 * past-snapshot / "지금" markers (drawn as a coordinate-synced overlay).
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
  [855, 870, 880, 850],
  [870, 890, 905, 865],
  [890, 875, 900, 870],
  [875, 905, 920, 870],
  [905, 935, 950, 895],
  [935, 970, 985, 925],
  [970, 1010, 1030, 960],
  [1010, 985, 1015, 965],
  [985, 1020, 1040, 970],
  [1020, 995, 1030, 975],
  [995, 1015, 1040, 980],
  [1015, 1005, 1035, 985],
  [1005, 1025, 1045, 990],
  [1025, 1010, 1035, 995],
  [1010, 1030, 1050, 995],
  [1030, 1098, 1112, 1025],
  [1098, 1115, 1125, 1085],
  [1115, 1135, 1150, 1100],
  [1135, 1150, 1160, 1130],
]

const DAY = 86_400
const START = Date.UTC(2025, 11, 21) / 1000 // 2025-12-21

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

export const snapshotCandles: CandlestickData[] = [
  ...history,
  ...designedCandles,
]

/** Default view = the designed (recent) window; older history is to the left. */
export const VISIBLE_BARS = designedCandles.length + 6

const UP = 'rgba(255,54,54,0.55)'
const DOWN = 'rgba(52,173,228,0.55)'

export const snapshotVolume: HistogramData[] = snapshotCandles.map((c, i) => {
  const v = 14 + Math.abs(Math.sin(i * 1.3) * 22) + (i % 5)
  return {
    time: c.time,
    value: v,
    color: c.close >= c.open ? UP : DOWN,
  }
})

function sma(period: number): LineData[] {
  const out: LineData[] = []
  for (let i = 0; i < snapshotCandles.length; i++) {
    const start = Math.max(0, i - period + 1)
    let sum = 0
    let n = 0
    for (let j = start; j <= i; j++) {
      sum += snapshotCandles[j]?.close ?? 0
      n++
    }
    const c = snapshotCandles[i]
    if (c) out.push({ time: c.time, value: sum / n })
  }
  return out
}

export const snapshotMAs = [
  { period: 5, color: '#34DE7B' }, // 50일 — 초록
  { period: 10, color: '#FF3636' }, // 150일 — 빨강
  { period: 15, color: '#F46B1A' }, // 200일 — 주황
].map((m) => ({ ...m, data: sma(m.period) }))

export const snapshotBaseBoxes = [
  {
    fromIndex: 13 + HISTORY_LEN,
    toIndex: 22 + HISTORY_LEN,
    low: 815_000,
    high: 890_000,
  },
  {
    fromIndex: 26 + HISTORY_LEN,
    toIndex: 36 + HISTORY_LEN,
    low: 970_000,
    high: 1_050_000,
  },
] as const

/**
 * Single source for the 과거 스냅샷 list AND the chart markers.
 * Each checked entry plots a 매수/매도/관망 point (dashed line + label) on the
 * chart at `idx`. `di` = offset within the designed (recent) candle window.
 */
type PastJudgment = 'buy' | 'sell' | 'hold'

const JUDGE_LABEL: Record<PastJudgment, string> = {
  buy: '매수',
  sell: '매도',
  hold: '관망',
}
const JUDGE_COLOR: Record<PastJudgment, { color: string; stroke: string }> = {
  buy: { color: '#FF6678', stroke: '#FF3636' },
  sell: { color: '#34ADE4', stroke: '#34ADE4' },
  hold: { color: 'rgba(255,255,255,0.8)', stroke: 'rgba(255,255,255,0.45)' },
}

type PastRaw = {
  date: string
  time: string
  judgment: PastJudgment
  price: string
  di: number
  meta: string
  memo: string
}

const PAST_RAW: PastRaw[] = [
  { date: '2025.12.21', time: '14:00', judgment: 'sell', price: '₩ 870,000', di: 2, meta: '레짐: 돌파실패 · 모멘텀 +24.1% · RS 76', memo: '전고 부근 거래량 부족 + 흐름 안정도 흔들림. 절반 익절로 리스크 관리. 재진입은 50일선 회복 후.' }, // prettier-ignore
  { date: '2026.03.12', time: '14:00', judgment: 'sell', price: '₩ 1,030,000', di: 6, meta: '레짐: 돌파실패 · 모멘텀 +28.4% · RS 80', memo: '이평선 정배열이지만 모멘텀이 +28%대에서 꺾이는 중. 일단 절반 매도로 익절. 재진입 기준: 거래량 40M 돌파 + 상승돌파 확인.' }, // prettier-ignore
  { date: '2026.04.30', time: '15:01', judgment: 'hold', price: '₩ 1,098,000', di: 10, meta: '레짐: 돌파준비 · 모멘텀 +31.2% · RS 82', memo: '박스권 상단 눌림목. 돌파 확인 전까지 관망 유지. 거래량 동반 돌파 시 진입 검토.' }, // prettier-ignore
  { date: '2025.11.15', time: '10:30', judgment: 'hold', price: '₩ 812,000', di: 15, meta: '레짐: 돌파준비 · 모멘텀 +18.0% · RS 70', memo: '베이스 형성 초기 단계, 거래량 수축. 방향 신호 대기.' }, // prettier-ignore
  { date: '2025.10.28', time: '13:20', judgment: 'buy', price: '₩ 760,000', di: 19, meta: '레짐: 돌파성공 · 모멘텀 +15.5% · RS 68', memo: '거래량 동반 베이스 돌파 초입 확인, 분할 매수 시작.' }, // prettier-ignore
  { date: '2025.09.30', time: '11:00', judgment: 'sell', price: '₩ 845,000', di: 23, meta: '레짐: 돌파실패 · 모멘텀 +12.0% · RS 64', memo: '저항 막힘 + 단기 과열. 일부 차익 실현.' }, // prettier-ignore
  { date: '2025.08.12', time: '14:45', judgment: 'hold', price: '₩ 690,000', di: 27, meta: '레짐: 방향미정 · 모멘텀 +6.0% · RS 58', memo: '방향성 모호한 횡보 구간. 추세 확인까지 대기.' }, // prettier-ignore
  { date: '2025.07.05', time: '09:50', judgment: 'buy', price: '₩ 640,000', di: 32, meta: '레짐: 돌파성공 · 모멘텀 +4.2% · RS 55', memo: '지지 확인 후 반등 초입 진입.' }, // prettier-ignore
  { date: '2025.06.18', time: '15:10', judgment: 'sell', price: '₩ 705,000', di: 36, meta: '레짐: 돌파실패 · 모멘텀 +2.0% · RS 51', memo: '상승 둔화로 비중 축소.' }, // prettier-ignore
  { date: '2025.05.02', time: '10:05', judgment: 'buy', price: '₩ 580,000', di: 40, meta: '레짐: 돌파준비 · 모멘텀 -1.0% · RS 48', memo: '저점 반등 시그널 확인, 소량 진입.' }, // prettier-ignore
]

export type PastSnapshot = {
  dt: string
  tag: string
  tagCls: PastJudgment
  price: string
  idx: number
  label: string
  color: string
  stroke: string
  meta: string
  memo: string
}

export const pastSnapshots: PastSnapshot[] = PAST_RAW.map((p) => ({
  dt: `${p.date} · ${p.time}`,
  tag: JUDGE_LABEL[p.judgment],
  tagCls: p.judgment,
  price: p.price,
  idx: HISTORY_LEN + p.di,
  label: `${p.date} · ${JUDGE_LABEL[p.judgment]}`,
  color: JUDGE_COLOR[p.judgment].color,
  stroke: JUDGE_COLOR[p.judgment].stroke,
  meta: p.meta,
  memo: p.memo,
}))

/** Right-gutter price tag — current price only (MA prices intentionally omitted). */
export const snapshotPriceTags = [{ price: 1_150_482, color: '#FF367C' }]
