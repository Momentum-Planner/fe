import type { CandlestickData, UTCTimestamp } from 'lightweight-charts'

const DAY = 86_400

/**
 * Generates `count` synthetic daily candles ending just before `endTimeSec`,
 * trending up from ~half of `endPriceWon` to `endPriceWon` so they sit
 * continuously before a designed candle series. Deterministic (sine-based) so
 * the chart looks stable across renders. Lets the user drag a chart left and
 * actually see "past" data instead of empty space (placeholder until a real
 * historical-data API is wired in).
 */
/** Formats a lightweight-charts time (UTC seconds) as YYYY-MM-DD for crosshair labels. */
export function formatChartDate(time: unknown): string {
  const d = new Date((time as number) * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function makeHistory(
  count: number,
  endTimeSec: number,
  endPriceWon: number,
): CandlestickData[] {
  const out: CandlestickData[] = []
  const wiggle = (i: number) =>
    Math.sin(i / 7) * endPriceWon * 0.02 +
    Math.sin(i / 17) * endPriceWon * 0.015

  for (let i = 0; i < count; i++) {
    const time = (endTimeSec - (count - i) * DAY) as UTCTimestamp
    const base = endPriceWon * (0.5 + (0.5 * i) / count)
    const open = base + wiggle(i)
    const close = base + wiggle(i + 1)
    const high = Math.max(open, close) + endPriceWon * 0.012
    const low = Math.min(open, close) - endPriceWon * 0.012
    out.push({ time, open, high, low, close })
  }
  return out
}
