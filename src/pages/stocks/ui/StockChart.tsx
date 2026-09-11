import { useEffect, useRef } from 'react'
import {
  CANDLE_UP,
  Highcharts,
  baseBoxAnnotation,
  baseStockOptions,
  priceAxis,
} from '@/shared/lib/chartOptions'

export type ChartBaseBox = {
  from: number
  to: number
  low: number
  high: number
}
export type ChartMovingAverage = {
  color: string
  data: Array<[number, number]>
}
export type ChartPriceTag = { price: number; color: string }
export type ChartCandle = [number, number, number, number, number]
export type ChartVolumeBar = { x: number; y: number; color: string }

type StockChartProps = {
  /** 지지선/저항선 — show the yellow S/R boxes */
  showSR: boolean
  /** 이동평균선 — per-line visibility (50 / 150 / 200) */
  maVisible: boolean[]
  candles: ChartCandle[]
  volume: ChartVolumeBar[]
  movingAverages: ChartMovingAverage[]
  baseBoxes: ChartBaseBox[]
  priceTags: ChartPriceTag[]
  /** 처음에 보일 캔들 개수 (오른쪽 정렬) */
  visibleBars: number
}

const MA_SERIES_ID = (i: number) => `ma-${i}`

/**
 * 종목 상세 캔들 차트 — 캔들+거래량 2단, 이동평균 3선, 지지/저항 오버레이, 현재가 라인.
 *
 * 설정은 `shared/lib/chartOptions` 공용 바탕을 따른다. 이유는 `docs/결정/Q11_차트_바탕.md`.
 * 토글(showSR·maVisible)은 차트를 다시 만들지 않고 `series.setVisible` /
 * `annotation.update` 로만 바꾼다 — 매번 재생성하면 dataGrouping 이 다시 돌아 깜빡인다.
 */
export function StockChart({
  showSR,
  maVisible,
  candles,
  volume,
  movingAverages,
  baseBoxes,
  priceTags,
  visibleBars,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Highcharts.Chart | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || candles.length === 0) return

    // 위에서 «비어 있으면» 이미 나갔으므로 둘 다 있다. 타입만 그것을 모른다
    const from = candles[Math.max(0, candles.length - visibleBars)]?.[0]
    const to = candles.at(-1)?.[0]
    if (from === undefined || to === undefined) return

    const chart = Highcharts.stockChart(el, {
      ...baseStockOptions(),
      xAxis: {
        ...baseStockOptions().xAxis,
        min: from,
        max: to,
      },
      yAxis: [
        priceAxis({
          height: '78%',
          resize: { enabled: true },
          plotLines: priceTags.map((tag) => ({
            value: tag.price,
            color: tag.color,
            width: 1,
            dashStyle: 'Dash',
            zIndex: 3,
          })),
        }),
        priceAxis({
          top: '80%',
          height: '20%',
          offset: 0,
          labels: { enabled: false },
        }),
      ],
      annotations: [baseBoxAnnotation(showSR ? baseBoxes : [])],
      tooltip: {
        ...baseStockOptions().tooltip,
        pointFormatter() {
          const p = this as unknown as {
            series: Highcharts.Series
            open?: number
            high?: number
            low?: number
            close?: number
            y?: number
          }
          if (p.series.type === 'column') {
            return `거래량 ${Math.round(p.y ?? 0).toLocaleString('ko-KR')}M`
          }
          if (p.open == null)
            return `${p.series.name} ${p.y?.toLocaleString('ko-KR')}`
          const color = (p.close ?? 0) >= (p.open ?? 0) ? CANDLE_UP : '#34ADE4'
          return (
            `시 ${p.open.toLocaleString('ko-KR')} · 고 ${p.high?.toLocaleString('ko-KR')}<br/>` +
            `저 ${p.low?.toLocaleString('ko-KR')} · <span style="color:${color}">종 ${p.close?.toLocaleString('ko-KR')}</span>`
          )
        },
      },
      series: [
        {
          type: 'candlestick',
          id: 'main',
          name: '가격',
          data: candles,
          yAxis: 0,
        } as Highcharts.SeriesCandlestickOptions,
        {
          type: 'column',
          name: '거래량',
          // point 를 객체로 주면 등락색을 point 단위로 지정할 수 있다
          data: volume.map((v) => ({ x: v.x, y: v.y, color: v.color })),
          yAxis: 1,
        } as Highcharts.SeriesColumnOptions,
        ...movingAverages.map(
          (ma, i) =>
            ({
              type: 'line',
              id: MA_SERIES_ID(i),
              name: `MA ${i}`,
              data: ma.data,
              color: ma.color,
              lineWidth: 2,
              marker: { enabled: false },
              visible: maVisible[i] ?? true,
              yAxis: 0,
              enableMouseTracking: false,
              dataGrouping: { enabled: true },
            }) as Highcharts.SeriesLineOptions,
        ),
      ],
    })

    chartRef.current = chart
    return () => {
      chart.destroy()
      chartRef.current = null
    }
    // candles/volume/movingAverages/priceTags 는 API 응답이 바뀔 때만 갱신되므로
    // 차트를 다시 만든다. showSR/maVisible 은 아래 별도 effect 가 라이브 토글한다.
  }, [candles, volume, movingAverages, baseBoxes, priceTags, visibleBars])

  // 라이브 토글 — 차트를 다시 만들지 않는다.
  // annotations 모듈은 chart 인스턴스 API(addAnnotation 등)가 공식 타입에 없어서,
  // 타입이 있는 chart.update({ annotations }) 로 통째로 교체한다 — 매번 축소판이라 싸다.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    movingAverages.forEach((_, i) => {
      chart.series
        .find((s) => s.options.id === MA_SERIES_ID(i))
        ?.setVisible(maVisible[i] ?? true, false)
    })
    chart.update(
      { annotations: [baseBoxAnnotation(showSR ? baseBoxes : [])] },
      false,
    )
    chart.redraw(false)
  }, [showSR, maVisible, baseBoxes, movingAverages])

  return (
    <div className="chartArea">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}
