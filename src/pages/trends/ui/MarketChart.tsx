import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
} from 'lightweight-charts'
import { formatChartDate } from '@/shared/lib/chartHistory'
import {
  VISIBLE_BARS,
  baseBoxes,
  currentPrice,
  marketCandles,
} from '../model/marketData'

/**
 * Candlestick chart (Korean convention: red = up, blue = down) rendered with
 * lightweight-charts. The yellow S/R consolidation boxes are drawn as an
 * absolutely-positioned overlay using the chart's coordinate conversions, so
 * they stay glued to the candles on resize.
 */
export function MarketChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const overlay = overlayRef.current
    if (!container || !overlay) return

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.45)',
        fontFamily: "'DM Sans', sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255,255,255,0.05)', style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: { borderVisible: false },
      localization: { timeFormatter: formatChartDate },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelVisible: true, color: 'rgba(255,255,255,0.2)' },
        horzLine: { color: 'rgba(255,255,255,0.2)' },
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#FF3636',
      downColor: '#34ADE4',
      borderVisible: false,
      wickUpColor: '#FF3636',
      wickDownColor: '#34ADE4',
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })
    series.setData(marketCandles)
    series.createPriceLine({
      price: currentPrice,
      color: '#FF367C',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '',
    })
    const total = marketCandles.length
    chart
      .timeScale()
      .setVisibleLogicalRange({ from: total - VISIBLE_BARS, to: total + 2 })

    const drawBoxes = () => {
      const ts = chart.timeScale()
      const c0 = ts.timeToCoordinate(marketCandles[0].time)
      const c1 = ts.timeToCoordinate(marketCandles[1].time)
      const halfW = c0 != null && c1 != null ? Math.abs(c1 - c0) / 2 : 4

      let html = ''
      for (const box of baseBoxes) {
        const x1 = ts.timeToCoordinate(marketCandles[box.fromIndex].time)
        const x2 = ts.timeToCoordinate(marketCandles[box.toIndex].time)
        const yHigh = series.priceToCoordinate(box.high)
        const yLow = series.priceToCoordinate(box.low)
        if (x1 == null || x2 == null || yHigh == null || yLow == null) continue

        const left = x1 - halfW
        const width = x2 - x1 + halfW * 2
        const height = yLow - yHigh
        html +=
          `<div style="position:absolute;left:${left}px;top:${yHigh}px;` +
          `width:${width}px;height:${height}px;` +
          `border-top:1.5px solid #EEB82D;border-bottom:1.5px solid #EEB82D;` +
          `background:rgba(238,184,45,0.12)"></div>`
      }
      overlay.innerHTML = html
    }

    const raf = requestAnimationFrame(drawBoxes)
    chart.timeScale().subscribeVisibleLogicalRangeChange(drawBoxes)

    const ro = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
      requestAnimationFrame(drawBoxes)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      chart.remove()
    }
  }, [])

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[440px] w-full" />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0" />
    </div>
  )
}
