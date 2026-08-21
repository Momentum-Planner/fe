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
} from '@/pages/stocks/model/stockChart'
import { pastSnapshots } from '../model/snapshotChart'

const esc = (str: string) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Snapshot-flow comparison chart drawn with lightweight-charts: candles + volume
 * (bottom overlay scale) + 3 moving averages + right-axis price tags. The yellow
 * S/R boxes and the past-snapshot / "지금" markers are drawn in a coordinate-synced
 * SVG overlay on top of the chart.
 */
type SnapshotChartProps = {
  /** 지지선/저항선 — show the yellow S/R boxes */
  showSR: boolean
  /** 이동평균선 — per-line visibility (50 / 150 / 200) */
  maVisible: boolean[]
  /** per past-snapshot marker visibility (checked in the 과거 스냅샷 list) */
  markerVisible: boolean[]
}

export function SnapshotChart({
  showSR,
  maVisible,
  markerVisible,
}: SnapshotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const maSeriesRef = useRef<ISeriesApi<'Line'>[]>([])
  const drawRef = useRef<() => void>(() => {})
  const showSRRef = useRef(showSR)
  const markerVisibleRef = useRef(markerVisible)

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

    // Volume in a separate bottom pane — own right axis ("42M"), with a separator.
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

    // Moving averages
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

    const drawOverlay = () => {
      const W = container.clientWidth
      const H = container.clientHeight
      const ts = chart.timeScale()
      const cx = (i: number) => ts.timeToCoordinate(stockCandles[i].time)
      const cy = (price: number) => candle.priceToCoordinate(price)

      const c0 = cx(0)
      const c1 = cx(1)
      const halfW = c0 != null && c1 != null ? Math.abs(c1 - c0) / 2 : 4

      let s = `<svg width="${W}" height="${H}" style="position:absolute;inset:0;overflow:visible">`

      // base boxes (지지/저항 — toggled)
      if (showSRRef.current) {
        for (const box of stockBaseBoxes) {
          const x1 = cx(box.fromIndex)
          const x2 = cx(box.toIndex)
          const yHigh = cy(box.high)
          const yLow = cy(box.low)
          if (x1 == null || x2 == null || yHigh == null || yLow == null)
            continue
          const bx = x1 - halfW
          const bw = x2 - x1 + halfW * 2
          s += `<rect x="${bx}" y="${yHigh}" width="${bw}" height="${yLow - yHigh}" fill="rgba(238,184,45,0.10)"/>`
          s += `<line x1="${bx}" x2="${bx + bw}" y1="${yHigh}" y2="${yHigh}" stroke="#EEB82D" stroke-width="1.2"/>`
          s += `<line x1="${bx}" x2="${bx + bw}" y1="${yLow}" y2="${yLow}" stroke="#EEB82D" stroke-width="1.2"/>`
        }
      }

      // past snapshot markers — only checked ones; dashed line + top label.
      // Label box + text scale with zoom (candle spacing) so they shrink on zoom-out.
      const labelScale = Math.min(1, Math.max(0.45, (halfW * 2) / 18))
      const lw = 130 * labelScale
      const lh = 22 * labelScale
      const fs = 11 * labelScale
      const ty = 2 + lh / 2 + fs * 0.36
      pastSnapshots.forEach((m, i) => {
        if (markerVisibleRef.current[i] === false) return
        const x = cx(m.idx)
        if (x == null) return
        s += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="${m.stroke}" stroke-width="1" stroke-dasharray="4 4" opacity=".75"/>`
        s += `<rect x="${x - lw / 2}" y="2" width="${lw}" height="${lh}" rx="${lh / 2}" fill="${m.stroke}" opacity=".18" stroke="${m.stroke}"/>`
        s += `<text x="${x}" y="${ty}" text-anchor="middle" font-family="Pretendard" font-size="${fs}" font-weight="700" fill="${m.color}">${esc(m.label)}</text>`
      })

      s += '</svg>'
      overlay.innerHTML = s
    }
    drawRef.current = drawOverlay

    const raf = requestAnimationFrame(drawOverlay)
    chart.timeScale().subscribeVisibleLogicalRangeChange(drawOverlay)

    const ro = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
      requestAnimationFrame(drawOverlay)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      chart.remove()
      maSeriesRef.current = []
    }
  }, [])

  // Live toggles: MA visibility + S/R boxes + checked markers
  useEffect(() => {
    maSeriesRef.current.forEach((s, i) => {
      s.applyOptions({ visible: maVisible[i] ?? true })
    })
    showSRRef.current = showSR
    markerVisibleRef.current = markerVisible
    drawRef.current()
  }, [showSR, maVisible, markerVisible])

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
