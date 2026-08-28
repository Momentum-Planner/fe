import type { KLineData } from 'klinecharts'

const MIN = 60_000
const DAY = 24 * 60 * MIN

/** 국내장 09:00~15:30 = 6.5시간 → 5분봉 78개/일. */
export const BARS_PER_SESSION = 78

/**
 * 결정용 합성 캔들. 백엔드 캔들 API가 일봉 하나뿐이라(/chart/daily) 분봉을
 * 못 받는다 — 봉 단위 전환과 무한 스크롤을 눈으로 보려면 데이터가 먼저 필요해서
 * 만든 것이다. sine 기반이라 렌더마다 같은 모양이 나온다(makeHistory와 같은 방식).
 */
function synth(
  count: number,
  endTime: number,
  stepMs: number,
  endPrice: number,
  seed: number,
): KLineData[] {
  const out: KLineData[] = []
  const wiggle = (i: number) =>
    Math.sin((i + seed) / 7) * endPrice * 0.018 +
    Math.sin((i + seed) / 23) * endPrice * 0.026 +
    Math.sin((i + seed) / 61) * endPrice * 0.035

  for (let i = 0; i < count; i++) {
    const timestamp = endTime - (count - i) * stepMs
    const base = endPrice * (0.55 + (0.45 * i) / count)
    const open = base + wiggle(i)
    const close = base + wiggle(i + 2.4) // 몸통이 보이게 위상차를 벌린다
    const high = Math.max(open, close) * (1 + 0.006 + 0.004 * Math.abs(Math.sin(i / 3)))
    const low = Math.min(open, close) * (1 - 0.006 - 0.004 * Math.abs(Math.sin(i / 5)))
    out.push({
      timestamp,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume: Math.round(400_000 + 260_000 * Math.abs(Math.sin(i / 4 + seed))),
    })
  }
  return out
}

/** 자정 정각으로 맞춘 오늘(로컬). 봉 경계가 흔들리지 않게. */
function today(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * 일봉 800개 — MA200 워밍업(200봉)을 눈으로 확인할 만큼 길게 잡았다.
 * 지금 백엔드 요청 기본값은 365일(≈245 거래일)이라 MA200이 46개만 나온다.
 */
export const dailyBars = synth(800, today(), DAY, 88_000, 0)

/** 5분봉 30일치 = 2,340봉. SVG/Canvas 성능 차이가 드러나는 구간. */
export const minute5Bars = synth(
  BARS_PER_SESSION * 30,
  today(),
  5 * MIN,
  88_000,
  11,
)

/** 일봉을 n개씩 묶어 주봉·월봉으로. 시가=첫봉, 종가=끝봉, 고저=최대·최소, 거래량=합. */
export function resample(bars: KLineData[], size: number): KLineData[] {
  const out: KLineData[] = []
  for (let i = 0; i < bars.length; i += size) {
    const group = bars.slice(i, i + size)
    if (group.length === 0) continue
    out.push({
      timestamp: group[0].timestamp,
      open: group[0].open,
      close: group[group.length - 1].close,
      high: Math.max(...group.map((b) => b.high)),
      low: Math.min(...group.map((b) => b.low)),
      volume: group.reduce((s, b) => s + (b.volume ?? 0), 0),
    })
  }
  return out
}

export type BaseBox = {
  startTime: number
  endTime: number
  supportPrice: number
  resistancePrice: number
}

/**
 * 베이스(지지/저항 박스). 실제로는 백엔드 /chart/bases 가 BaseItem 으로 내려주는 것
 * — 여기서는 캔들 구간의 실제 고·저를 읽어 같은 모양을 만든다.
 */
export function findBases(bars: KLineData[]): BaseBox[] {
  // 초기 로드는 뒤쪽 200봉이라 그 안(0.75~1.0)에 잡아야 첫 화면에서 보인다
  const spans = [
    [0.77, 0.83],
    [0.86, 0.91],
    [0.94, 0.99],
  ]
  return spans.map(([a, b]) => {
    const from = Math.floor(bars.length * a)
    const to = Math.floor(bars.length * b)
    const slice = bars.slice(from, to)
    return {
      startTime: bars[from].timestamp,
      endTime: bars[to - 1].timestamp,
      supportPrice: Math.min(...slice.map((c) => c.low)),
      resistancePrice: Math.max(...slice.map((c) => c.high)),
    }
  })
}

/** Highcharts 용 — OHLC 는 [t,o,h,l,c], 거래량은 [t,v]. */
export function toHighcharts(bars: KLineData[]) {
  return {
    ohlc: bars.map((b) => [b.timestamp, b.open, b.high, b.low, b.close]),
    volume: bars.map((b) => [b.timestamp, b.volume ?? 0]),
  }
}
