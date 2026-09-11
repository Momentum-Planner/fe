import { useEffect, useRef, useState } from 'react'
import { dispose, init } from 'klinecharts'
import type { Chart, Crosshair, KLineData, PeriodType } from 'klinecharts'
import {
  dailyBars,
  minute5Bars,
  findBases,
  resample,
} from '../model/mockCandles'
import { BASE_BOX, registerBaseBox } from '../model/baseOverlay'
import { measure } from '../model/perf'
import { LiveFeed, TickMeter } from '../model/liveFeed'
import type { Perf } from '../model/perf'
import { LabHeader } from './LabShell'
import type { LabIndicator } from './LabShell'

registerBaseBox()

const PERIODS: Record<string, { type: PeriodType; span: number }> = {
  '5m': { type: 'minute', span: 5 },
  '1d': { type: 'day', span: 1 },
  '1w': { type: 'week', span: 1 },
  '1M': { type: 'month', span: 1 },
}

const OVERLAY: LabIndicator[] = [
  { name: 'MA', label: 'MA' },
  { name: 'BOLL', label: '볼린저밴드' },
]
const PANE: LabIndicator[] = [
  { name: 'VOL', label: '거래량' },
  { name: 'MACD', label: 'MACD' },
  { name: 'KDJ', label: 'KDJ (스토캐스틱)' },
]

const UP = '#FF3636'
const DOWN = '#34ADE4'
const TEXT_DIM = 'rgba(255,255,255,0.55)'
const GRID = 'rgba(255,255,255,0.05)'

const chartStyles = {
  grid: { horizontal: { color: GRID }, vertical: { show: false } },
  candle: {
    // ① 한국식으로 뒤집기 — 기본은 상승 초록/하락 빨강
    bar: {
      upColor: UP,
      downColor: DOWN,
      upBorderColor: UP,
      downBorderColor: DOWN,
      upWickColor: UP,
      downWickColor: DOWN,
    },
    tooltip: {
      title: { color: TEXT_DIM, family: "'DM Sans', sans-serif" },
      legend: { color: '#fff', family: "'DM Sans', sans-serif" },
    },
  },
  indicator: {
    // ② 지표 막대(거래량)는 candle.bar 설정이 안 와서 따로 뒤집어야 한다
    bars: [
      {
        upColor: 'rgba(255,54,54,0.55)',
        downColor: 'rgba(52,173,228,0.55)',
        noChangeColor: 'rgba(255,255,255,0.2)',
      },
    ],
    ohlc: { upColor: UP, downColor: DOWN, noChangeColor: TEXT_DIM },
    tooltip: {
      title: { color: TEXT_DIM, family: "'DM Sans', sans-serif" },
      legend: { color: '#fff', family: "'DM Sans', sans-serif" },
    },
  },
  xAxis: { tickText: { color: TEXT_DIM, family: "'DM Sans', sans-serif" } },
  yAxis: { tickText: { color: TEXT_DIM, family: "'DM Sans', sans-serif" } },
  crosshair: {
    horizontal: { line: { color: 'rgba(255,255,255,0.2)' } },
    vertical: { line: { color: 'rgba(255,255,255,0.2)' } },
  },
  separator: { color: GRID },
}

function source(frame: string): KLineData[] {
  if (frame === '5m') return minute5Bars
  if (frame === '1w') return resample(dailyBars, 5)
  if (frame === '1M') return resample(dailyBars, 21)
  return dailyBars
}

export function ChartLabPage() {
  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const [frame, setFrame] = useState('1d')
  const [size, setSize] = useState(800)
  const [on, setOn] = useState<Record<string, boolean>>({
    MA: true,
    BOLL: true,
    VOL: true,
    MACD: false,
    KDJ: false,
  })
  const [showBases, setShowBases] = useState(true)
  // 사용자가 기간을 바꾸는 화면이 없어서 직접 만든 것 — Highcharts 는 이게 내장이다
  const [maParams, setMaParams] = useState([20, 50])
  const [perf, setPerf] = useState<Perf | null>(null)
  const [loaded, setLoaded] = useState(0)
  const [picked, setPicked] = useState<string>('봉을 클릭해 보세요')
  const [liveHz, setLiveHz] = useState(0)
  const [liveStat, setLiveStat] = useState<string>('꺼짐')
  const feedRef = useRef<LiveFeed | null>(null)
  const pushRef = useRef<((b: KLineData) => void) | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return

    const src = source(frame)
    const bars = src.slice(Math.max(0, src.length - size))
    let chart: Chart | null = null

    measure(
      el,
      () => {
        chart = init(el, { styles: chartStyles })
        if (!chart) return
        chartRef.current = chart
        // 실험용: 콘솔에서 렌더 비용을 재려고 인스턴스를 노출한다. 결정이 끝나면 이 랩과 함께 지운다
        ;(window as unknown as Record<string, unknown>).__lab = chart
        chart.setSymbol({
          ticker: 'LAB',
          pricePrecision: 0,
          volumePrecision: 0,
        })
        const period = PERIODS[frame]
        if (period) chart.setPeriod(period)

        // ③ 무한 스크롤 — 왼쪽 끝에 닿으면 forward 로 다시 불린다.
        //    lightweight-charts 에는 이게 없어서 makeHistory() 로 가짜 과거를 만들고 있다
        // ⑦ Canvas 에서도 봉 하나하나를 집을 수 있다. SVG 는 브라우저가 히트테스트를
        //    해주고, Canvas 는 라이브러리가 좌표 → 봉 인덱스를 역산해 콜백으로 준다
        chart.subscribeAction('onCandleBarClick', (raw) => {
          const data = raw as Crosshair
          const k = data.kLineData
          if (!k) return
          const d = new Date(k.timestamp)
          setPicked(
            `#${data.dataIndex} · ${d.toLocaleString('ko-KR')} · 시 ${k.open.toLocaleString()} 고 ${k.high.toLocaleString()} 저 ${k.low.toLocaleString()} 종 ${k.close.toLocaleString()}`,
          )
        })

        let servedOlder = 0
        chart.setDataLoader({
          getBars: ({ type, callback }) => {
            if (type === 'init') {
              setLoaded(bars.length)
              callback(bars, { forward: src.length > bars.length })
              return
            }
            const end = src.length - size - servedOlder
            const start = Math.max(0, end - 200)
            const page = src.slice(start, end)
            servedOlder += page.length
            setLoaded((n) => n + page.length)
            callback(page, { forward: start > 0 })
          },
          // ⑧ 실시간 — 틱이 들어오면 이 callback 으로 마지막 봉을 갈아끼운다.
          //    timestamp 가 같으면 갱신, 크면 새 봉으로 붙는다
          subscribeBar: ({ callback }) => {
            pushRef.current = (bar) => callback(bar)
          },
          unsubscribeBar: () => {
            pushRef.current = null
          },
        })
      },
      (p) => setPerf({ bars: bars.length, ...p }),
    )

    return () => {
      chartRef.current = null
      dispose(el)
    }
  }, [frame, size])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    for (const { name } of OVERLAY) {
      // ④ 켤 때도 먼저 지운다 — isStack 은 있든 없든 새로 얹어서 겹쳐 쌓인다
      chart.removeIndicator({ paneId: 'candle_pane', name })
      if (on[name]) {
        chart.createIndicator(
          // ⑤ 파라미터는 calcParams 로 넘긴다. 바꾸면 즉시 재계산 — 왕복이 없다
          {
            name,
            paneId: 'candle_pane',
            calcParams: name === 'MA' ? maParams : undefined,
          },
          true,
        )
      }
    }
    for (const { name } of PANE) {
      chart.removeIndicator({ paneId: `pane_${name}`, name })
      if (on[name]) chart.createIndicator({ name, paneId: `pane_${name}` })
    }
  }, [on, frame, size, maParams])

  // 실시간 틱 — 켜면 마지막 봉이 계속 흔들린다
  useEffect(() => {
    feedRef.current?.stop()
    if (liveHz === 0) {
      setLiveStat('꺼짐')
      return
    }
    const src = source(frame)
    const last = src.at(-1)
    if (!last) return
    const stepMs = frame === '5m' ? 5 * 60_000 : 24 * 60 * 60_000
    const feed = new LiveFeed(last, stepMs)
    const meter = new TickMeter()
    feedRef.current = feed
    feed.start(liveHz, ({ bar }) => {
      pushRef.current?.(bar)
      meter.mark()
      const r = meter.read()
      if (r)
        setLiveStat(`중앙 ${r.medianMs}ms · 최악 ${r.worstMs}ms · ${r.fps}fps`)
    })
    return () => feed.stop()
  }, [liveHz, frame, size])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.removeOverlay({ name: BASE_BOX })
    if (!showBases) return
    const src = source(frame)
    for (const b of findBases(src.slice(Math.max(0, src.length - size)))) {
      chart.createOverlay({
        name: BASE_BOX,
        lock: true, // ⑥ 사용자가 끌어서 못 옮기게
        points: [
          { timestamp: b.startTime, value: b.resistancePrice },
          { timestamp: b.endTime, value: b.supportPrice },
        ],
      })
    }
  }, [showBases, frame, size])

  return (
    <div className="flex flex-col gap-3 p-4">
      <LabHeader
        title="KLineChart 10 — Canvas"
        other={{ label: 'Highcharts 쪽 보기', href: '/chart-lab-hc' }}
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
          {
            label: '베이스 3구간',
            active: showBases,
            onClick: () => setShowBases((v) => !v),
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <span className="t-body text-[var(--color-fg-secondary)]">
          MA 기간 (직접 만든 UI)
        </span>
        {[
          [5, 10, 30, 60],
          [20, 50],
          [50, 150, 200],
        ].map((p) => (
          <button
            key={p.join()}
            type="button"
            onClick={() => setMaParams(p)}
            className={`rounded-[var(--radius-pill)] border px-3 py-1 text-sm ${
              maParams.join() === p.join()
                ? 'border-[var(--color-brand-yellow)] text-[var(--color-fg-primary)]'
                : 'border-[var(--color-border-subtle)] text-[var(--color-fg-secondary)]'
            }`}
          >
            {p.join(' · ')}
          </button>
        ))}
        <span className="t-body text-[var(--color-fg-secondary)]">
          · 로드됨 {loaded.toLocaleString()}봉
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="t-body text-[var(--color-fg-secondary)]">
          실시간 틱
        </span>
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
        <span className="t-num text-[var(--color-fg-secondary)]">
          {liveStat}
        </span>
      </div>

      <div className="t-num rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] px-3 py-2 text-[var(--color-fg-secondary)]">
        클릭한 봉 ▸ <b className="text-[var(--color-fg-primary)]">{picked}</b>
      </div>

      <div
        ref={boxRef}
        style={{ height: 620 }}
        className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
      />
      <p className="t-body text-[var(--color-fg-secondary)]">
        위 「MA 기간」 버튼은 <b>직접 만든 것</b>이다. 라이브러리는{' '}
        <code>calcParams</code> 를 받아 즉시 재계산해 줄 뿐, 그 값을 고르는
        화면은 주지 않는다 — 검색 팝업·입력 폼·삭제·순서 변경까지 전부 우리
        몫이다.
      </p>
    </div>
  )
}
