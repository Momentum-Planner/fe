import type { BaseItem, DailyCandle, MovingAverageItem } from '@/entities/stock'
import type { ChartBaseBox } from '../ui/StockChart'

const UP = 'rgba(255,54,54,0.55)'
const DOWN = 'rgba(52,173,228,0.55)'

/** 'YYYY-MM-DD' → UTC 밀리초. Highcharts 는 timestamp 를 쓴다. */
export function toTime(tradeDate: string): number {
  // `split` 결과는 길이를 모르므로 셋 다 undefined 를 낀다 — 바닥값을 둔다
  const [y = 0, m = 1, d = 1] = tradeDate.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

const byDate = <T extends { tradeDate: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))

/** 일봉 → 캔들 시리즈 [t, o, h, l, c]. */
export function toCandles(
  candles: DailyCandle[],
): Array<[number, number, number, number, number]> {
  return byDate(candles).map((c) => [
    toTime(c.tradeDate),
    c.openPrice,
    c.highPrice,
    c.lowPrice,
    c.closePrice,
  ])
}

/** 거래량 → 히스토그램 (백만 단위, 등락색). */
export function toVolume(
  candles: DailyCandle[],
): Array<{ x: number; y: number; color: string }> {
  return byDate(candles).map((c) => ({
    x: toTime(c.tradeDate),
    y: c.volume / 1_000_000,
    color: c.closePrice >= c.openPrice ? UP : DOWN,
  }))
}

/** 이동평균 응답 → 라인 시리즈 [t, v]. */
export function toMaLine(points: MovingAverageItem[]): Array<[number, number]> {
  return byDate(points).map((p) => [toTime(p.tradeDate), p.price])
}

/**
 * 베이스(지지/저항 박스) → annotation 좌표.
 *
 * 예전에는 캔들 인덱스로 옮겨 픽셀을 직접 계산했는데, annotation 은 축 값에 붙으므로
 * 날짜를 그대로 timestamp 로 넘기면 된다. 캔들 배열을 참조할 일이 없어졌다.
 */
export function toBaseBoxes(bases: BaseItem[]): ChartBaseBox[] {
  return bases.map((b) => ({
    from: toTime(b.startDate),
    to: toTime(b.endDate),
    low: b.supportPrice,
    high: b.resistancePrice,
  }))
}
