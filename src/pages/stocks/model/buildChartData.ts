import type {
  CandlestickData,
  HistogramData,
  LineData,
  Time,
} from 'lightweight-charts'
import type { BaseItem, DailyCandle, MovingAverageItem } from '@/entities/stock'
import type { ChartBaseBox } from '../ui/StockChart'

const UP = 'rgba(255,54,54,0.55)'
const DOWN = 'rgba(52,173,228,0.55)'

/** lightweight-charts 는 'YYYY-MM-DD' 문자열을 BusinessDay time 으로 받는다. */
function asTime(tradeDate: string): Time {
  return tradeDate as Time
}

/** 일봉 → 캔들 시리즈 (날짜 오름차순 정렬). */
export function toCandles(candles: DailyCandle[]): CandlestickData[] {
  return [...candles]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .map((c) => ({
      time: asTime(c.tradeDate),
      open: c.openPrice,
      high: c.highPrice,
      low: c.lowPrice,
      close: c.closePrice,
    }))
}

/** 거래량 → 히스토그램 (백만 단위, 등락색). */
export function toVolume(candles: DailyCandle[]): HistogramData[] {
  return [...candles]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .map((c) => ({
      time: asTime(c.tradeDate),
      value: c.volume / 1_000_000,
      color: c.closePrice >= c.openPrice ? UP : DOWN,
    }))
}

/** 이동평균 응답 → 라인 시리즈. */
export function toMaLine(points: MovingAverageItem[]): LineData[] {
  return [...points]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    .map((p) => ({ time: asTime(p.tradeDate), value: p.price }))
}

/**
 * 베이스(지지/저항 박스) → 차트 오버레이 좌표용 인덱스 박스.
 * startDate/endDate 를 캔들 인덱스로 매핑한다(범위를 벗어나면 클램프).
 */
export function toBaseBoxes(
  bases: BaseItem[],
  candles: CandlestickData[],
): ChartBaseBox[] {
  const indexByDate = new Map<string, number>()
  candles.forEach((c, i) => indexByDate.set(String(c.time), i))

  const lastIndex = candles.length - 1
  const resolve = (date: string, fallback: number) => {
    const exact = indexByDate.get(date)
    if (exact != null) return exact
    // 정확히 일치하는 거래일이 없으면 가장 가까운(작거나 같은) 인덱스를 찾는다.
    let idx = fallback
    for (let i = 0; i <= lastIndex; i++) {
      if (String(candles[i].time) <= date) idx = i
      else break
    }
    return idx
  }

  return bases
    .map((b) => {
      const fromIndex = resolve(b.startDate, 0)
      const toIndex = resolve(b.endDate, lastIndex)
      return {
        fromIndex,
        toIndex: Math.max(toIndex, fromIndex),
        low: b.supportPrice,
        high: b.resistancePrice,
      }
    })
    .filter((box) => box.fromIndex <= lastIndex)
}
