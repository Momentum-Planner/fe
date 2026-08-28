import { useEffect, useRef, useState } from 'react'
import Highcharts from 'highcharts/esm/highstock'
import 'highcharts/esm/indicators/indicators-all'
import 'highcharts/esm/modules/annotations-advanced'
import 'highcharts/esm/modules/drag-panes'
import 'highcharts/esm/modules/full-screen'
import 'highcharts/esm/modules/stock-tools'
import 'highcharts/css/stocktools/gui.css'
import 'highcharts/css/annotations/popup.css'
import {
  dailyBars,
  findBases,
  minute5Bars,
  resample,
  toHighcharts,
} from '../model/mockCandles'
import { measure } from '../model/perf'
import { LiveFeed, TickMeter } from '../model/liveFeed'
import type { Perf } from '../model/perf'
import { LabHeader } from './LabShell'
import type { LabIndicator } from './LabShell'

/** Highcharts 는 지표 이름이 series type 이다. 일목균형표까지 내장. */
const OVERLAY: LabIndicator[] = [
  { name: 'sma', label: 'SMA' },
  { name: 'bb', label: '볼린저밴드' },
  { name: 'ikh', label: '일목균형표 ★' },
]
const PANE: LabIndicator[] = [
  { name: 'macd', label: 'MACD' },
  { name: 'stochastic', label: '스토캐스틱 ★' },
]

const UP = '#FF3636'
const DOWN = '#34ADE4'
const TEXT_DIM = 'rgba(255,255,255,0.55)'
const GRID = 'rgba(255,255,255,0.05)'

export function HighchartsLabPage() {
  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Highcharts.Chart | null>(null)

  const [frame, setFrame] = useState('1d')
  const [size, setSize] = useState(800)
  const [on, setOn] = useState<Record<string, boolean>>({
    sma: true,
    bb: true,
    ikh: false,
    macd: false,
    stochastic: false,
  })
  const [showBases, setShowBases] = useState(true)
  const [showTools, setShowTools] = useState(true)
  // Highcharts Stock 의 기본값은 켜짐. 끄면 화면 폭보다 많은 점을 그리게 되어 급격히 느려진다
  const [grouping, setGrouping] = useState(true)
  // 'pan' = 드래그하면 옆으로 이동(KLineChart 방식) · 'zoom' = 드래그하면 영역 선택 줌(Highcharts 기본)
  const [dragMode, setDragMode] = useState<'pan' | 'zoom'>('pan')
  const [perf, setPerf] = useState<Perf | null>(null)
  const [liveHz, setLiveHz] = useState(0)
  const [liveStat, setLiveStat] = useState('꺼짐')
  const feedRef = useRef<LiveFeed | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return

    const src =
      frame === '5m'
        ? minute5Bars
        : frame === '1w'
          ? resample(dailyBars, 5)
          : frame === '1M'
            ? resample(dailyBars, 21)
            : dailyBars
    const bars = src.slice(Math.max(0, src.length - size))
    const { ohlc, volume } = toHighcharts(bars)

    // ① 지표마다 yAxis 를 따로 만든다 — KLineChart 의 pane 에 해당하지만 높이를 직접 계산해야 한다
    const panes = PANE.filter((p) => on[p.name])
    const mainH = panes.length === 0 ? 78 : panes.length === 1 ? 58 : 44
    const paneH = (94 - mainH) / (panes.length + 1)

    const yAxis: Highcharts.YAxisOptions[] = [
      { height: `${mainH}%`, labels: { align: 'right', x: -3 }, resize: { enabled: true } },
      { top: `${mainH + 2}%`, height: `${paneH - 2}%`, offset: 0, labels: { enabled: false } },
      ...panes.map((_, i) => ({
        top: `${mainH + 2 + paneH * (i + 1)}%`,
        height: `${paneH - 2}%`,
        offset: 0,
        labels: { align: 'right' as const, x: -3 },
      })),
    ]

    const series: Highcharts.SeriesOptionsType[] = [
      {
        type: 'candlestick',
        id: 'main',
        name: '가격',
        data: ohlc,
        yAxis: 0,
      } as Highcharts.SeriesCandlestickOptions,
      {
        type: 'column',
        id: 'vol',
        name: '거래량',
        data: volume,
        yAxis: 1,
      } as Highcharts.SeriesColumnOptions,
      ...OVERLAY.filter((o) => on[o.name]).map(
        (o) =>
          ({
            type: o.name,
            linkedTo: 'main',
            yAxis: 0,
          }) as unknown as Highcharts.SeriesOptionsType,
      ),
      ...panes.map(
        (p, i) =>
          ({
            type: p.name,
            linkedTo: 'main',
            yAxis: i + 2,
          }) as unknown as Highcharts.SeriesOptionsType,
      ),
    ]

    // ② 베이스 박스 — annotations 의 path 네 점. 축 값 기준이라 스크롤을 따라간다
    const annotations: Highcharts.AnnotationsOptions[] = showBases
      ? [
          {
            draggable: '',
            shapes: findBases(bars).map((b) => ({
              type: 'path',
              fill: 'rgba(238,184,45,0.10)',
              stroke: '#EEB82D',
              strokeWidth: 1.5,
              points: [
                { x: b.startTime, y: b.resistancePrice, xAxis: 0, yAxis: 0 },
                { x: b.endTime, y: b.resistancePrice, xAxis: 0, yAxis: 0 },
                { x: b.endTime, y: b.supportPrice, xAxis: 0, yAxis: 0 },
                { x: b.startTime, y: b.supportPrice, xAxis: 0, yAxis: 0 },
                { x: b.startTime, y: b.resistancePrice, xAxis: 0, yAxis: 0 },
              ],
            })),
          } as Highcharts.AnnotationsOptions,
        ]
      : []

    measure(
      el,
      () => {
        chartRef.current = ((window as unknown as Record<string, unknown>).__lab =
          Highcharts.stockChart(el, {
          chart: {
            backgroundColor: 'transparent',
            animation: false,
            // ④ Highcharts Stock 은 navigator(하단 미니맵)로 범위를 조절하는 게 기본이다.
            //    그걸 끄면 마우스로 움직일 방법이 사라져서, 휠 줌·드래그 패닝을 직접 켜야
            //    KLineChart 와 같은 조작이 된다
            // ⑥ 드래그를 「영역 선택 줌」이 아니라 「옆으로 끌기」로 — KLineChart 와 같은 조작.
            //    zooming.type 이 있으면 드래그가 줌 상자가 된다. 빼야 panning 이 드래그를 갖는다.
            //    (panKey 를 주면 그 키를 누른 채로만 패닝되므로 주지 않는다)
            zooming: dragMode === 'pan'
              ? { mouseWheel: { enabled: true } }
              : { mouseWheel: { enabled: true }, type: 'x' as const },
            panning: { enabled: true, type: 'x' },
          },
          credits: { enabled: false },
          navigator: { enabled: false },
          scrollbar: { enabled: false },
          rangeSelector: { enabled: false },
          // ③ Stock Tools — 지표 검색 팝업 · 파라미터 입력 폼 · 좌측 드로잉 툴바가 통째로 딸려온다
          stockTools: { gui: { enabled: showTools } },
          plotOptions: {
            candlestick: {
              color: DOWN,
              upColor: UP,
              lineColor: DOWN,
              upLineColor: UP,
              animation: false,
            },
            series: {
              animation: false,
              // ⑤ 2,340봉을 폭 1,400px 에 그리면 봉 하나가 0.6px 이다 — 눈에 안 보이는 것을
              //    DOM 노드로 만드는 셈이라, 묶어 그리면 렌더 점이 2,340 → 195 로 준다
              dataGrouping: { enabled: grouping, groupPixelWidth: 6 },
            },
          },
          xAxis: {
            gridLineWidth: 0,
            lineColor: GRID,
            tickColor: GRID,
            labels: { style: { color: TEXT_DIM } },
            crosshair: { color: 'rgba(255,255,255,0.2)' },
          },
          yAxis: yAxis.map((a) => ({
            ...a,
            gridLineColor: GRID,
            labels: { ...a.labels, style: { color: TEXT_DIM } },
          })),
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderColor: 'rgba(255,255,255,0.12)',
            style: { color: '#fff' },
            split: false,
            shared: true,
          },
          legend: { enabled: false },
          annotations,
          series,
          }) as Highcharts.Chart)
      },
      (p) => setPerf({ bars: bars.length, ...p }),
    )

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [frame, size, on, showBases, showTools, grouping, dragMode])

  // 실시간 틱 — 마지막 봉만 갱신(point.update) 하거나 새 봉을 붙인다(addPoint)
  useEffect(() => {
    feedRef.current?.stop()
    if (liveHz === 0) {
      setLiveStat('꺼짐')
      return
    }
    const chart = chartRef.current
    if (!chart) return
    const s0 = chart.series[0]
    const pts = s0.points
    if (pts.length === 0) return
    // Point 타입에 OHLC 가 안 선언돼 있어 캔들 포인트로 좁힌다
    const tail = pts[pts.length - 1] as Highcharts.Point & {
      open: number
      high: number
      low: number
      close: number
    }
    const seed = {
      timestamp: tail.x,
      open: tail.open,
      high: tail.high,
      low: tail.low,
      close: tail.close,
      volume: 0,
    }
    const stepMs = frame === '5m' ? 5 * 60_000 : 24 * 60 * 60_000
    const feed = new LiveFeed(seed, stepMs)
    const meter = new TickMeter()
    feedRef.current = feed
    feed.start(liveHz, ({ bar, isNewBar }) => {
      const s = chartRef.current?.series?.[0]
      if (!s) return
      const arr = [bar.timestamp, bar.open, bar.high, bar.low, bar.close]
      if (isNewBar) s.addPoint(arr, true, true, false)
      else {
        const p = s.points[s.points.length - 1]
        p.update({ x: bar.timestamp, open: bar.open, high: bar.high, low: bar.low, close: bar.close }, true, false)
      }
      meter.mark()
      const r = meter.read()
      if (r) setLiveStat(`중앙 ${r.medianMs}ms · 최악 ${r.worstMs}ms · ${r.fps}fps`)
    })
    return () => feed.stop()
  }, [liveHz, frame, size])

  return (
    <div className="flex flex-col gap-3 p-4">
      <LabHeader
        title="Highcharts Stock 13 — SVG"
        other={{ label: 'KLineChart 쪽 보기', href: '/chart-lab' }}
        perf={perf}
        frame={frame}
        onFrame={setFrame}
        size={size}
        onSize={setSize}
        overlay={OVERLAY}
        pane={PANE}
        on={on}
        onToggle={(n) => setOn((p) => ({ ...p, [n]: !p[n] }))}
        extras={[
          { label: '베이스 3구간', active: showBases, onClick: () => setShowBases((v) => !v) },
          { label: '★ Stock Tools 툴바', active: showTools, onClick: () => setShowTools((v) => !v) },
          { label: 'dataGrouping (기본 켜짐)', active: grouping, onClick: () => setGrouping((v) => !v) },
          {
            label: dragMode === 'pan' ? '드래그 = 옆으로 이동' : '드래그 = 영역 줌',
            active: dragMode === 'pan',
            onClick: () => setDragMode((v) => (v === 'pan' ? 'zoom' : 'pan')),
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-body text-[var(--color-fg-secondary)]">실시간 틱</span>
        {[0, 1, 5, 20, 60].map((hz) => (
          <button
            key={hz}
            type="button"
            onClick={() => setLiveHz(hz)}
            className={`rounded-[var(--radius-pill)] border px-3 py-1 text-sm ${
              liveHz === hz
                ? 'border-[var(--color-success,#39d353)] text-[var(--color-fg-primary)]'
                : 'border-[var(--color-border-subtle)] text-[var(--color-fg-secondary)]'
            }`}
          >
            {hz === 0 ? '끔' : `${hz}/초`}
          </button>
        ))}
        <span className="t-num text-[var(--color-fg-secondary)]">{liveStat}</span>
      </div>

      <div
        ref={boxRef}
        style={{ height: 620 }}
        className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
      />
      <p className="t-body text-[var(--color-fg-secondary)]">
        ★ = KLineChart 에 내장이 없는 것. 좌측 툴바의 「Indicators」를 누르면 지표
        검색 팝업과 <b>기간 입력 폼</b>이 뜬다 — 20일선·50일선을 사용자가 직접 바꾸는
        화면이 이것이다.
      </p>
    </div>
  )
}
