import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
} from 'lightweight-charts'
import type { ISeriesApi } from 'lightweight-charts'
import { formatChartDate } from '@/shared/lib/chartHistory'
import {
  VISIBLE_BARS,
  movingAverages,
  stockBaseBoxes,
  stockCandles,
  stockPriceTags,
  stockVolume,
} from '../model/stockChart'

type StockChartProps = {
  /** 지지선/저항선 — show the yellow S/R boxes */
  showSR: boolean
  /** 이동평균선 — per-line visibility (50 / 150 / 200) */
  maVisible: boolean[]
}

/**
 * Stock-detail candlestick chart (lightweight-charts): candles + 3 moving
 * averages + right-axis price tags + yellow S/R overlay boxes. MA lines and the
 * S/R boxes are toggled live via props. Pannable history sits to the left.
 */
export function StockChart({ showSR, maVisible }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const maSeriesRef = useRef<ISeriesApi<'Line'>[]>([])
  const drawRef = useRef<() => void>(() => {})
  const showSRRef = useRef(showSR)

  useEffect(() => {
    const container = containerRef.current
    const overlay = overlayRef.current
    if (!container || !overlay) return

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.55)',
        fontFamily: "'DM Sans', sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.1 },
      },
      timeScale: { borderVisible: false },
      localization: { timeFormatter: formatChartDate },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelVisible: true, color: 'rgba(255,255,255,0.2)' },
        horzLine: { color: 'rgba(255,255,255,0.2)' },
      },
    })

    // Volume in a separate bottom pane — its own right axis (numbers as "42M"),
    // with a separator line between it and the candle pane.
    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceScaleId: 'right',
        priceFormat: {
          type: 'custom',
          minMove: 1,
          formatter: (v: number) => `${Math.round(v)}M`,
        },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1,
    )
    volume.priceScale().applyOptions({
      borderVisible: false,
      scaleMargins: { top: 0.15, bottom: 0.05 },
    })
    volume.setData(stockVolume)

    // Hover tooltip showing the volume value at the cursor
    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current
      if (!tooltip) return
      const v = param.seriesData.get(volume) as { value?: number } | undefined
      if (!param.point || param.time == null || !v || v.value == null) {
        tooltip.style.display = 'none'
        return
      }
      tooltip.style.display = 'block'
      tooltip.textContent = `거래량 ${Math.round(v.value)}M`
      tooltip.style.left = `${param.point.x + 12}px`
      tooltip.style.top = `${param.point.y + 12}px`
    })

    maSeriesRef.current = movingAverages.map((ma, i) => {
      const line = chart.addSeries(LineSeries, {
        color: ma.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: maVisible[i] ?? true,
      })
      line.setData(ma.data)
      return line
    })

    const candle = chart.addSeries(CandlestickSeries, {
      priceScaleId: 'right',
      upColor: '#FF3636',
      downColor: '#34ADE4',
      borderVisible: false,
      wickUpColor: '#FF3636',
      wickDownColor: '#34ADE4',
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    candle.setData(stockCandles)

    // Candle pane large, volume pane ~2.5:1
    const panes = chart.panes()
    if (panes.length > 1) {
      panes[0].setStretchFactor(2.5)
      panes[1].setStretchFactor(1)
    }

    for (const tag of stockPriceTags) {
      candle.createPriceLine({
        price: tag.price,
        color: tag.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        lineVisible: false,
        axisLabelVisible: true,
      })
    }

    const total = stockCandles.length
    chart
      .timeScale()
      .setVisibleLogicalRange({ from: total - VISIBLE_BARS, to: total + 2 })

    const drawBoxes = () => {
      if (!showSRRef.current) {
        overlay.innerHTML = ''
        return
      }
      const ts = chart.timeScale()
      const c0 = ts.timeToCoordinate(stockCandles[0].time)
      const c1 = ts.timeToCoordinate(stockCandles[1].time)
      const halfW = c0 != null && c1 != null ? Math.abs(c1 - c0) / 2 : 4

      let html = ''
      for (const box of stockBaseBoxes) {
        const x1 = ts.timeToCoordinate(stockCandles[box.fromIndex].time)
        const x2 = ts.timeToCoordinate(stockCandles[box.toIndex].time)
        const yHigh = candle.priceToCoordinate(box.high)
        const yLow = candle.priceToCoordinate(box.low)
        if (x1 == null || x2 == null || yHigh == null || yLow == null) continue
        html +=
          `<div style="position:absolute;left:${x1 - halfW}px;top:${yHigh}px;` +
          `width:${x2 - x1 + halfW * 2}px;height:${yLow - yHigh}px;` +
          `border-top:1.5px solid #EEB82D;border-bottom:1.5px solid #EEB82D;` +
          `background:rgba(238,184,45,0.10)"></div>`
      }
      overlay.innerHTML = html
    }
    drawRef.current = drawBoxes

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
      maSeriesRef.current = []
    }
  }, [])

  // Live toggles: MA visibility + S/R boxes
  useEffect(() => {
    maSeriesRef.current.forEach((s, i) => {
      s.applyOptions({ visible: maVisible[i] ?? true })
    })
    showSRRef.current = showSR
    drawRef.current()
  }, [showSR, maVisible])

  return (
    <div className="chartArea">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          display: 'none',
          pointerEvents: 'none',
          zIndex: 3,
          padding: '4px 8px',
          borderRadius: 6,
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: 11,
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: 'nowrap',
        }}
      />
    </div>
  )
}
