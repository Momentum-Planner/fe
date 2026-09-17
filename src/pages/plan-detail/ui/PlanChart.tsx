import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Highcharts,
  baseBoxAnnotation,
  baseStockOptions,
  priceAxis,
} from '@/shared/lib/chartOptions'
import { cn } from '@/shared/lib/cn'
import { daysAgo, toLocalDate, toLocalDateTime } from '@/shared/lib/datetime'
import { useBases, useDailyCandles } from '@/entities/stock'
import { IndicatorPanel } from './IndicatorPanel'
import {
  VOLUME_SERIES_ID,
  bandOptions,
  paneLegend,
  defaultLayers,
  loadLayers,
  saveLayers,
  panes,
  specOf,
} from './indicators'
import type { Layer } from './indicators'
import { VIEW_ANCHOR_AT, viewWindow } from './viewWindow'
import type { StopCandidate } from '@/entities/plan'

/**
 * 계획 화면의 차트 — **종목 상세의 차트를 여기로 가져왔다.**
 *
 * 왜 둘이 아니라 하나인가 — 두 화면이 «같은 것을 두 번» 그리고 있었다.
 * 캔들·이동평균·지지저항은 물론이고, 종목 상세의 「지난 스냅샷」 레일은 계획 사슬과
 * 같은 시간축 이력이고, 8카드는 계획 3층의 「게이트 · VCP · RS · 실적」과 같은 값이다.
 *
 * 그리고 이 화면만 하나 더 갖고 있다 — **진입가와 스톱가격이 축 위에 있다.**
 * ④-1-1-1 · ④-1-1-2 의 📦 자료가 둘 다 「차트」로 시작한다
 * (*"차트를 보고 사용자가 넣는다 — 서비스가 가격을 제시하지 않는다"*).
 * 후보 선은 원래 «차트 위의 선»이라, 목록으로만 두면 「베이스 하단 1,036,000」이
 * 어디인지 알 수 없다. 상한을 넘는 선은 지우지 않고 흐리게 남긴다 —
 * 지우면 「왜 이 선이 없나」를 다시 물어야 한다.
 *
 * 설정은 `shared/lib/chartOptions` 를 그대로 따른다 (Q2).
 */

/** 세로는 «칸마다 픽셀»로 쌓는다 — 지표를 켤 때마다 %를 다시 나누면 가격 칸이 줄어든다 */
/** 계획을 세우는 화면이라 최근이 중요하다. 왼쪽으로 끌면 과거가 나온다 */
const VISIBLE_BARS = 90
/** 오늘이 마지막 봉일 때 오른쪽에 두는 빈칸 — 새 계획의 선과 면이 여기 그려진다 (Q12) */
const FUTURE_BARS = 15

/**
 * 계획의 선 — **손익 구간 둘** (Q12).
 *
 * ```text
 * 진입   흰 실선                  들어가는 기준선
 * 스톱   파랑 점선 + 진입까지 파랑 면   −1R · 잃기로 한 구간
 * 위쪽   발동 가격까지 빨강 면       +R · 여기까지 오르면 스톱을 올린다
 * ```
 *
 * 💀 스톱이 파랑 «실선»이던 때 하락 캔들과 같은 색이라 봉이 선을 지나는 자리에서
 * 선이 끊겨 보였다. 파랑을 선이 아니라 옅은 «면»으로 쓰고 선은 점선으로 바꿨다.
 * 한국식 캔들 색(오름 빨강 · 내림 파랑)과 뜻이 그대로 맞는다.
 */
const ENTRY = '#FFFFFF'
const STOP = '#34ADE4'
const RAISE = '#FF3636'
const SR_TONE = '#EEB82D'
/**
 * 고정한 과거 계획 — 같은 모양을 조금 옅게.
 * 💀 35% · 70% 로는 캔들 위에서 안 보였다. **새 계획과 같은 진하기**로 그린다 —
 *    시간 구간이 달라(과거 계획은 오늘까지, 새 계획은 오늘부터) 섞이지 않는다.
 */
const GHOST = 1

/** 과거 계획 하나 — 새 계획을 쓰는 동안 사슬에서 눌러 고정한다 */
export type GhostPlan = {
  entryPrice: number
  stopPrice: number
  raiseTo: number | null
  /** 살아 있던 구간. `to` 가 null 이면 오른쪽 끝까지 */
  from: string
  to: string | null
  label: string
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/**
 * 계획 하나를 **날짜 구간이 있는 도형**으로 그린다.
 *
 * 💀 축의 `plotLine` · `plotBand` 로 그리면 늘 «전폭»이다. 과거 계획과 지금 계획의
 * 가격이 1.6% 만 달라도 두 벌이 섞였다 (Q12 — 08-18 1,082,000 vs 1,100,000).
 * 차트 가로축이 날짜라는 점을 써서 **시간으로 뗀다** — 그래서 도형이다.
 */
function planMarks(o: {
  id: string
  entryPrice: number
  stopPrice: number
  raiseTo: number | null
  x0: number
  x1: number
  strength: number
  priceLabels: boolean
  title?: string
}): Highcharts.AnnotationsOptions | null {
  const { entryPrice: e, stopPrice: st, raiseTo, x0, x1, strength: a } = o
  if (e <= 0 && st <= 0) return null
  const pt = (x: number, y: number) => ({ x, y, xAxis: 0, yAxis: 0 })
  const rect = (lo: number, hi: number, fill: string) => ({
    type: 'path',
    fill,
    strokeWidth: 0,
    points: [pt(x0, hi), pt(x1, hi), pt(x1, lo), pt(x0, lo), pt(x0, hi)],
  })
  const line = (y: number, stroke: string, width: number, dash?: string) => ({
    type: 'path',
    fill: 'none',
    stroke,
    strokeWidth: width,
    dashStyle: dash,
    points: [pt(x0, y), pt(x1, y)],
  })

  const shapes: object[] = []
  if (e > 0 && st > 0)
    shapes.push(rect(Math.min(e, st), Math.max(e, st), rgba(STOP, 0.16 * a)))
  if (e > 0 && raiseTo != null && raiseTo > e)
    shapes.push(
      rect(e, raiseTo, rgba(RAISE, 0.1 * a)),
      line(raiseTo, rgba(RAISE, 0.7 * a), 1, 'ShortDash'),
    )
  if (e > 0) shapes.push(line(e, rgba(ENTRY, a), a < 1 ? 1.6 : 2))
  if (st > 0) shapes.push(line(st, rgba(STOP, a), a < 1 ? 1.6 : 2, 'Dash'))

  /**
   * 가격 글자 — **선의 왼쪽 끝, 선 바로 위(스톱은 아래)** 에 색 글자로 둔다.
   *
   * 💀 오른쪽 끝에 배경 있는 꼬리표로 붙였더니, 새 계획이 그려지는 빈칸(15봉 ≈ 95px)을
   * 꼬리표 셋(77px)이 통째로 덮어 **선과 면이 안 보였다.** 글자가 선을 덮지 않게
   * 위아래로 비켜 세우고 배경을 걷었다.
   */
  const tag = (y: number, text: string, color: string, below = false) => ({
    point: pt(x0, y),
    text,
    shape: 'rect',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 1,
    align: 'left',
    verticalAlign: below ? 'top' : 'bottom',
    x: 2,
    y: below ? 2 : -2,
    allowOverlap: true,
    crop: false,
    overflow: 'none',
    style: { color, fontSize: '10px', fontWeight: '600' },
  })
  const labels: object[] = []
  if (o.priceLabels) {
    // 진입 = 스톱(본전으로 올린 계획)이면 한 줄로 — 둘을 겹쳐 쓰면 둘 다 안 읽힌다
    /**
     * 스톱이 진입가 «이상»이면 목표에 도착해 **올린** 스톱이다 — 대기 계획은 그렇게 못 세운다
     * (목표 > 진입 > 스톱). 같은 값이면 한 줄로 합친다.
     * 💀 이유(「가격 상승으로 인한 스톱가격 상승」)를 붙였다가 뺐다 — 사용자 「필요 없다」.
     */
    if (e > 0 && e === st)
      labels.push(tag(e, `진입 = 스톱 ${e.toLocaleString('ko-KR')}`, ENTRY))
    else if (e > 0)
      labels.push(tag(e, `진입 ${e.toLocaleString('ko-KR')}`, ENTRY))
    if (st > 0 && st !== e)
      labels.push(
        tag(
          st,
          `스톱 ${st.toLocaleString('ko-KR')}`,
          STOP,
          // 진입 위로 올린 스톱은 진입선과 목표 사이라 «위»에 적는다 — 아래면 진입 라벨과 겹친다
          !(e > 0 && st > e),
        ),
      )
    // 목표는 선 «위»에 — 아래는 최근 캔들이 차 있어 글자가 가려졌다
    if (e > 0 && raiseTo != null && raiseTo > e)
      labels.push(
        tag(
          raiseTo,
          `목표 ${Math.round(raiseTo).toLocaleString('ko-KR')}`,
          RAISE,
        ),
      )
  }
  if (o.title && e > 0)
    labels.push({
      point: pt(x0, Math.max(e, raiseTo ?? e)),
      text: o.title,
      shape: 'rect',
      backgroundColor: 'transparent',
      borderWidth: 0,
      align: 'left',
      verticalAlign: 'bottom',
      x: 0,
      y: -2,
      allowOverlap: true,
      crop: false,
      overflow: 'none',
      style: { color: 'rgba(255,255,255,0.55)', fontSize: '10px' },
    })

  return {
    id: o.id,
    draggable: '',
    shapes,
    labels,
    labelOptions: { useHTML: false },
  } as unknown as Highcharts.AnnotationsOptions
}

/** 헤더 줄이 그리는 한 봉. 등락은 «전일 종가» 대비다 */
type HoveredBar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  rate?: number
}

type Candle = {
  tradeDate: string
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
}

/**
 * 짚은 점의 **시각**으로 봉을 찾는다.
 *
 * 💀 `point.index` 로 찾았더니 헤더가 엉뚱한 날을 보였다 — 십자선은 2026-08-06 인데 헤더는
 *    2025-10-21. `index` 는 «보이는 구간으로 잘린» 배열 안의 순번이라 전체 배열과 어긋난다.
 */
function barAt(sorted: Candle[], x: number): HoveredBar | null {
  return toBar(
    sorted,
    sorted.findIndex((c) => toTime(c.tradeDate) === x),
  )
}

function toBar(sorted: Candle[], i: number): HoveredBar | null {
  const c = sorted[i]
  if (!c) return null
  // 같은 봉의 시가 대비로 재면 다른 값이 된다 — 전일 종가가 기준이다
  const prev = i > 0 ? sorted[i - 1] : undefined
  return {
    date: c.tradeDate,
    open: c.openPrice,
    high: c.highPrice,
    low: c.lowPrice,
    close: c.closePrice,
    rate: prev
      ? ((c.closePrice - prev.closePrice) / prev.closePrice) * 100
      : undefined,
  }
}

const toTime = (d: string) => {
  // `split` 결과는 길이를 모르므로 셋 다 undefined 를 낀다 — 0 을 바닥으로 둔다
  const [y = 0, m = 1, day = 1] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

export function PlanChart({
  stockCode,
  entryPrice,
  stopPrice,
  candidates,
  writtenAt,
  marksFrom,
  raiseTo = null,
  ghosts = [],
  editing = false,
  drafting = false,
  picking,
  onPick,
  pickLine = null,
}: {
  stockCode: string
  /** 0 이면 «안 그린다» — 새 계획은 아직 값이 없다 */
  entryPrice: number
  stopPrice: number
  candidates: StopCandidate[]
  /** 이 계획을 «세운 날». 차트가 그 시점으로 따라간다 */
  writtenAt: string
  /**
   * 계획 선을 **어느 날짜부터** 그리나 — 스냅샷 날짜 (Q12). 없으면 차트 왼쪽 끝부터.
   * 오른쪽은 늘 끝까지다.
   */
  marksFrom?: string
  /** 목표 — 스톱 상향이 발동하는 가격. 위쪽 빨강 면이 여기까지. 없으면 안 칠한다 */
  raiseTo?: number | null
  /** 사슬 마디에 올린 과거 계획 — 유령으로 뜬다 */
  ghosts?: GhostPlan[]
  /** 차트를 눌러서 «집는» 중인 칸. 집는 동안 커서가 십자가 된다 */
  picking?: 'entry' | 'stop' | null
  /** 누른 자리의 «가격». y축 값을 그대로 준다 */
  onPick?: (price: number) => void
  /**
   * 스톱가격을 «고치는 중»인가. 후보 선은 이때만 뜬다 —
   * 고르는 순간에만 필요한 선이고, 늘 떠 있으면 넷이 캔들을 시끄럽게 만든다.
   */
  editing?: boolean
  /**
   * 계획을 «세우는» 중인가. 세울 때는 오늘이 오른쪽 끝에 서고(그날 본 화면),
   * 볼 때는 작성일이 2/3 에 서서 그 뒤가 보인다 (Q12).
   */
  drafting?: boolean
  /**
   * 사다리 목표에 도착해 고른 **새 스톱 자리** (Q16). 스톱과 같은 파랑 점선으로 선다 —
   * 옮기면 그 자리가 곧 스톱이다. 후보를 전부 긋지 않는다: 고른 하나만.
   */
  pickLine?: { label: string; price: number } | null
}) {
  const [showSR, setShowSR] = useState(true)
  const [layers, setLayers] = useState<Layer[]>(
    () => loadLayers(stockCode) ?? defaultLayers(),
  )
  /**
   * 지금 `layers` 가 «어느 종목 것»인가. 종목이 바뀌는 렌더에서 옛 종목 설정을 새 종목 이름으로
   * 저장해 버리지 않게 한다 — 바뀌면 먼저 새 종목 것을 읽고, 그다음부터 저장한다.
   */
  const layersOf = useRef(stockCode)
  useEffect(() => {
    if (layersOf.current === stockCode) return
    layersOf.current = stockCode
    setLayers(loadLayers(stockCode) ?? defaultLayers())
  }, [stockCode])
  useEffect(() => {
    if (layersOf.current === stockCode) saveLayers(stockCode, layers)
  }, [layers, stockCode])
  /**
   * 커서가 짚은 봉. **차트 «밖»에서 그린다.**
   *
   * 💀 Highcharts 툴팁으로 그리던 것을 들어냈다. 캔버스 안에 그리는 한 자리를
   * 어떻게 잡아도 무언가를 덮는다 — 따라다니면 봉을 덮고, 위에 고정하면 여러 줄이
   * 아래로 흘러 덮는다. **밖으로 내보내면 그 문제가 통째로 없어진다.**
   *
   * 같은 병을 세 번 고쳤다: 따라다니는 툴팁 · 다섯 줄 툴팁 · 호버 마커 넷.
   * 셋 다 「커서를 올린 자리에 무언가를 그린다」가 원인이었다.
   */
  const [bar, setBar] = useState<HoveredBar | null>(null)

  const range = useMemo(
    () => ({ from: toLocalDate(daysAgo(365)), to: toLocalDateTime() }),
    [],
  )
  const { data: rawCandles = [], isLoading } = useDailyCandles(stockCode, range)
  const { data: bases } = useBases(stockCode, range)

  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Highcharts.Chart | null>(null)
  /**
   * 차트를 **새로 세울 때마다** 오른다 — 선을 갈아끼우는 효과가 이것을 보고 다시 돈다.
   *
   * 💀 베이스 · 지표가 캔들보다 늦게 오면 차트가 한 번 더 세워지는데, 선 효과의 의존성
   *    (진입 · 스톱 · 목표 …)은 그대로라 **다시 안 돌았다.** 새 차트에는 계획 선이 없었다.
   */
  const [built, setBuilt] = useState(0)
  /**
   * 지표 칸마다 윗변 y(px) — 칸 이름과 범례를 캔버스 «밖» HTML 로 얹는 자리.
   * 💀 축 제목(useHTML)으로 넣었더니 오른쪽 축에서 뻗다가 잘려 「MACD — MACD선 —」 에서 끊겼다.
   */
  const [paneTops, setPaneTops] = useState<Record<string, number>>({})
  /**
   * 집기 콜백을 «ref 로» 든다.
   *
   * ⚠️ 차트는 `useEffect` 안에서 «한 번» 만들어지고, 그때 잡힌 `onPick` 은
   *    그 시점 값에 얼어붙는다(클로저). 칸을 바꿀 때마다 차트를 다시 만들면
   *    보던 구간이 리셋되므로, 최신 콜백을 ref 로 흘려보낸다.
   */
  const pickRef = useRef<((price: number) => void) | null>(null)
  pickRef.current = picking && onPick ? onPick : null

  /**
   * 진입가·스톱가격·이어받는 선을 **차트를 다시 만들지 않고** 갈아끼우기 위한 ref.
   *
   * 💀 이 값들이 차트 생성 `useEffect` 의 의존성에 있었다. 새 계획 칸에서 숫자를
   * 한 자 칠 때마다 **Highcharts 가 통째로 부서지고 다시 섰다** — 보던 구간이
   * 리셋되고, 지표를 다시 계산하고, 화면이 깜빡인다. 테스트가 5초를 넘겨서 알았다.
   *
   * 선은 축의 `plotLine` 이라 «따로» 갈아끼울 수 있다. 그래야 「손을 떼기 전에
   * 결과를 본다」(디자인 9장 ④)가 성립한다 — 칠 때마다 차트가 무너지면 못 본다.
   */
  /** 도형의 x 는 «시간»이다. 오른쪽 끝과 왼쪽 끝을 차트를 세울 때 적어 둔다 */
  const edgesRef = useRef<{
    first: number
    last: number
    /** 일봉의 시각 */
    bars: number[]
  }>({ first: 0, last: 0, bars: [] })

  useEffect(() => {
    const el = boxRef.current
    if (!el || rawCandles.length === 0) return

    const sorted = [...rawCandles].sort((a, b) =>
      a.tradeDate.localeCompare(b.tradeDate),
    )
    const data: Array<[number, number, number, number, number]> = sorted.map(
      (c) => [
        toTime(c.tradeDate),
        c.openPrice,
        c.highPrice,
        c.lowPrice,
        c.closePrice,
      ],
    )
    const volume = sorted.map((c) => ({
      x: toTime(c.tradeDate),
      y: c.volume / 1_000_000,
      color:
        c.closePrice >= c.openPrice
          ? 'rgba(255,54,54,0.55)'
          : 'rgba(52,173,228,0.55)',
    }))
    // 자기 칸을 받는 지표만 세로를 먹는다. 가격 축에 겹치는 것은 자리를 안 쓴다
    const own = layers.filter((l) => specOf(l.id)?.pane === 'own')
    // 세로는 «칸마다 픽셀»로 쌓는다 — %로 나누면 지표를 켤 때마다 가격 칸이 줄어든다
    const box = panes(own.length)

    // 보이는 구간은 **고른 계획을 따라간다** — 작성일이 한가운데에 선다
    const writtenT = toTime(writtenAt)
    const times = data.map((d) => d[0])
    const { from, to, padBars } = viewWindow(
      times,
      writtenT,
      VISIBLE_BARS,
      drafting ? 1 : VIEW_ANCHOR_AT,
      FUTURE_BARS,
    )

    /**
     * 오른쪽 여유 — **값이 빈 봉**을 뒤에 붙인다. ordinal 축은 「x 가 있는 점」을
     * 세므로 한 칸씩 자리를 차지하고, y 가 없어 그려지지는 않는다.
     * 이렇게 해야 앵커가 어느 계획이든 같은 자리(2/3)에 선다.
     */
    const lastT = times.at(-1) ?? to
    const twentyBack = times.at(-21)
    const stepMs =
      twentyBack !== undefined ? (lastT - twentyBack) / 20 : 86_400_000
    const padPoints: Array<[number, null]> = Array.from(
      { length: padBars },
      (_, i) => [lastT + (i + 1) * stepMs, null],
    )
    const axisMax = padPoints.at(-1)?.[0] ?? to
    edgesRef.current = {
      first: times[0] ?? from,
      last: axisMax,
      bars: times,
    }

    // 고른 선은 stopPrice 로 따로 그리므로 여기서 뺀다 — 같은 자리에 두 번 긋지 않는다.
    // 그리고 **고치는 중일 때만** 그린다 (④-1-1-2 는 「고를 때」의 자료다)
    const others = editing ? candidates.filter((c) => !c.chosen) : []

    // 공용 바탕의 X축 설정. 타입이 `XAxisOptions | XAxisOptions[]` 라 한 번 좁혀 둔다
    const baseX = baseStockOptions().xAxis as Highcharts.XAxisOptions

    const chart = Highcharts.stockChart(el, {
      ...baseStockOptions({ height: box.total }),
      chart: {
        ...baseStockOptions({ height: box.total }).chart,
        /**
         * **차트를 눌러서 가격을 집는다** (④-1-1-1 — *「차트를 보고 사용자가
         * 넣는다」*). 숫자를 손으로 쓰는 것보다 «그 자리»를 짚는 것이 진짜 동작에
         * 가깝다 — 진입가도 스톱가격도 차트 위의 «선»이기 때문이다.
         *
         * ⚠️ 집는 중일 때만 커서를 십자로 바꾼다. 평소에는 끌어서 옮기는 판이라
         *    십자가 늘 떠 있으면 「누르는 곳」으로 잘못 읽힌다.
         */
        events: {
          click(this: Highcharts.Chart, e: Highcharts.PointerEventObject) {
            if (!pickRef.current) return
            const y = this.yAxis[0]?.toValue(e.chartY)
            if (y != null && y > 0) pickRef.current(Math.round(y))
          },
        },
      },
      // 툴팁을 끈다 — 시고저종을 헤더 줄이 «캔버스 밖»에서 그린다.
      // ⚠️ `chartOptions` 의 고정 툴팁은 다른 차트가 아직 쓴다
      tooltip: { enabled: false },
      xAxis: {
        ...baseX,
        min: from,
        max: axisMax,

        /**
         * **빈 여유에는 날짜를 안 찍는다.**
         *
         * ordinal 축은 데이터 구간에서 주말을 «압축»하는데, 여유 구간은 압축할
         * 데이터가 없어 실제 시간 그대로 벌어진다 — 같은 14일이 왼쪽에서는 10칸,
         * 오른쪽에서는 14칸이 되어 «최근으로 갈수록 늘어나 보인다».
         *
         * 게다가 거기 찍히는 것은 «아직 오지 않은 날짜»라, 봉이 있는 것처럼 읽힌다.
         * 아무것도 없는 자리이므로 라벨도 없는 것이 맞다.
         */
        labels: {
          ...baseX.labels,
          formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
            const lastBar = data.at(-1)
            if (lastBar && Number(this.value) > lastBar[0]) return ''
            return this.axis.defaultLabelFormatter.call(this)
          },
        },
        // 계획을 «세운 날». 진입선·스톱선이 가격을 말하고 이 선이 시점을 말한다
        plotLines: [
          {
            value: writtenT,
            color: 'rgba(255,255,255,0.22)',
            width: 1,
            dashStyle: 'Dash',
            zIndex: 3,
            /**
             * ⚠️ 라벨을 «차트 위»로 올린다. 기본 자리(축 바로 위)는 X축 날짜가
             * 서는 자리라 두 글자가 그대로 포개진다 — 「9월 8일」 위에 「8월 17일」이
             * 겹쳐 찍히던 것이 이것이다.
             */
            label: {
              text: `계획 ${writtenAt.slice(5)}`,
              verticalAlign: 'top',
              // 세로선이 오른쪽 «끝»에 서므로 라벨을 안쪽으로 접는다 — 왼쪽 정렬이면
              // 플롯 밖으로 나가 잘린다
              textAlign: 'right',
              rotation: 0,
              y: 12,
              x: -6,
              style: { color: 'rgba(255,255,255,0.45)', fontSize: '10px' },
            },
          },
        ],
      },
      yAxis: [
        priceAxis({
          height: box.price.height,
          /**
           * 진입선·스톱선·이어받는 선·밴드·축 범위는 **여기서 안 만든다.**
           * 아래의 별도 `useEffect` 가 갈아끼운다 — 차트를 다시 세우지 않고.
           * 후보 선만 여기 남는다. 그건 «종목»의 값이라 타이핑으로 안 변한다.
           */
          plotLines: others.map((c) => ({
            value: c.price,
            color: c.overLimit
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.28)',
            width: 1,
            dashStyle: 'Dot' as const,
            zIndex: 2,
            label: {
              text: c.label,
              align: 'left' as const,
              x: 8,
              y: -3,
              style: {
                color: c.overLimit
                  ? 'rgba(255,255,255,0.22)'
                  : 'rgba(255,255,255,0.42)',
                fontSize: '10px',
              },
            },
          })),
        }),
        // 거래량 — 종목 상세와 같은 2단 구성
        priceAxis({
          top: box.volume.top,
          height: box.volume.height,
          offset: 0,
          labels: { enabled: false },
        }),
        // 켜진 지표마다 칸 하나. 이름 · 선별 범례는 칸 왼쪽 위 (디자인 2장 ⑦)
        ...own.map((l, i) =>
          priceAxis({
            id: `pane-${l.key}`,
            top: box.own[i]?.top,
            height: box.own[i]?.height,
            offset: 0,
            labels: { enabled: false },
            // 칸 이름 · 범례는 캔버스 밖 HTML 로 얹는다 (아래 `paneTops`)
          }),
        ),
      ],
      series: [
        {
          type: 'candlestick',
          id: 'candles',
          name: '일봉',
          data,
          yAxis: 0,
          // 값을 차트 «밖» 헤더 줄로 올려보낸다. 캔버스 안에는 아무것도 안 그린다
          point: {
            events: {
              mouseOver() {
                setBar(barAt(sorted, this.x))
              },
            },
          },
        },
        /**
         * 오른쪽 여유 — **자리만 차지하는 시리즈**다.
         *
         * ordinal 축은 «모든 시리즈의 x» 를 모아 칸을 만든다. 그래서 값이 빈 점을
         * 뒤에 놓으면 그만큼 칸이 생기고, 캔들 시리즈는 안 건드리므로
         * `linkedTo: 'candles'` 인 지표(이평선·MACD…)의 계산도 그대로다.
         *
         * ⚠️ 캔들 «안»에 빈 봉을 섞으면 지표가 그 빈 값까지 먹어 선이 망가진다.
         *    한 번 그렇게 했다가 이평선이 어긋났다.
         */
        {
          type: 'line',
          id: 'pad',
          data: padPoints,
          yAxis: 0,
          enableMouseTracking: false,
          showInLegend: false,
          dataGrouping: { enabled: false },
        },
        {
          // ⚠️ id 가 «있어야» 한다 — OBV·매물대가 `volumeSeriesID` 로 이 시리즈를 찾는다.
          // 못 찾으면 그 지표만 빠지는 게 아니라 «차트가 통째로 예외를 던진다»
          type: 'column',
          id: VOLUME_SERIES_ID,
          name: '거래량',
          data: volume,
          yAxis: 1,
          borderWidth: 0,
        },
        // 지표 — 전부 «캔들에 물려» 계산된다. 데이터를 따로 받지 않는다
        ...layers.map((l) => {
          const spec = specOf(l.id)
          const ownIdx = own.findIndex((o) => o.key === l.key)
          return {
            type: l.id,
            id: `ind-${l.key}`,
            linkedTo: 'candles',
            yAxis: spec?.pane === 'own' ? 2 + ownIdx : 0,
            color: l.color,
            lineWidth: 1.2,
            marker: { enabled: false },
            // 선이 여럿인 지표(밴드형 · MACD · 스토캐스틱)는 선마다 색을 따로 매핑한다
            ...(spec?.lines ? bandOptions(l) : {}),
            params:
              l.id === 'obv' || l.id === 'vbp'
                ? { ...l.params, volumeSeriesID: VOLUME_SERIES_ID }
                : l.params,
            // ⚠️ 공용 바탕이 dataGrouping 을 켜 둔다 (Q2). 묶인 봉으로 계산하면
            // 「50일선」이 50일선이 아니게 되므로 지표에서는 «끈다»
            dataGrouping: { enabled: false },
          }
        }),
      ],
      annotations: bases?.length
        ? [
            baseBoxAnnotation(
              bases.map((b) => ({
                from: toTime(b.startDate),
                to: toTime(b.endDate),
                low: b.supportPrice,
                high: b.resistancePrice,
              })),
            ),
          ]
        : [],
    })
    chartRef.current = chart
    setBuilt((n) => n + 1)
    setPaneTops(
      Object.fromEntries(
        // 칸 배치는 `panes()` 가 정한 픽셀이다 — 플롯 윗변만 더한다
        own.map((l, i) => [l.key, chart.plotTop + (box.own[i]?.top ?? 0)]),
      ),
    )

    /**
     * 그 날짜의 봉을 **미리 짚어 둔다.**
     *
     * 계획을 고르면 구간이 그리로 옮겨가지만, 옮겨간 «어디»가 그날인지는 세로 점선
     * 하나로는 약하다. 크로스헤어를 세우고 헤더 줄을 그날 값으로 채워 두면,
     * 사용자가 매번 그 자리를 찾아 마우스를 올릴 필요가 없다.
     *
     * 마우스를 올리면 그때부터는 사용자를 따라간다. 처음 한 번만 대신 짚는다.
     */
    const candleSeries = chart.get('candles') as Highcharts.Series | undefined
    const pts = candleSeries?.points ?? []
    const target = pts.length
      ? pts.reduce((best, p) =>
          Math.abs(p.x - writtenT) < Math.abs(best.x - writtenT) ? p : best,
        )
      : undefined
    if (target) {
      chart.xAxis[0]?.drawCrosshair(undefined, target)
      setBar(barAt(sorted, target.x))
    }

    return () => {
      chart.destroy()
      chartRef.current = null
    }
    /**
     * ⚠️ **`entryPrice` · `stopPrice` 가 의존성에 없다.** 값이 바뀔 때마다 차트를
     *    다시 세우면 새 계획을 쓰는 동안 한 자 칠 때마다 화면이 무너진다.
     *    그 둘은 아래 `useEffect` 가 «선만» 갈아끼운다.
     */
  }, [rawCandles, bases, candidates, writtenAt, layers, editing, drafting])

  /**
   * 진입선 · 스톱선 · 이어받는 선 · 밴드 · 축 범위를 **갈아끼운다.**
   *
   * 💀 이 값들이 차트 생성 `useEffect` 의 의존성에 있었다. 새 계획 칸에서 숫자를
   * 한 자 칠 때마다 **Highcharts 가 통째로 부서지고 다시 섰다** — 보던 구간이
   * 리셋되고, 지표를 다시 계산하고, 화면이 깜빡였다. 테스트가 5초를 넘겨서 알았다.
   *
   * 선은 축의 `plotLine` 이라 «따로» 갈아끼울 수 있다. 그래야 「손을 떼기 전에
   * 결과를 본다」(디자인 9장 ④)가 성립한다 — 칠 때마다 차트가 무너지면 못 본다.
   * 차트를 다시 세우지 않으므로 보던 구간도 지표도 그대로다.
   */
  useEffect(() => {
    const chart = chartRef.current
    const axis = chart?.yAxis[0]
    if (!chart || !axis) return

    chart.removeAnnotation('plan-now')
    for (let i = 0; i < 4; i++) chart.removeAnnotation(`plan-ghost-${i}`)

    const { first, last, bars } = edgesRef.current
    const at = (d: string) => Math.max(first, Math.min(last, toTime(d)))
    /** 마지막 일봉 — 이미 선 계획은 여기서 끝난다. 오른쪽 빈칸은 새 계획의 자리다 */
    const lastBar = bars.at(-1) ?? last
    /**
     * 구간은 **작성일(회색 점선)부터 마지막 일봉까지**다 (2026-09-17).
     *
     * 💀 빈칸까지 뻗으면 봉이 없는 자리에 면만 떠 있었다. 짧은 구간을 늘리려고 시작을 왼쪽으로
     *    당겼더니 작성일보다 앞에서 시작해 거짓이 됐고, 끝을 오른쪽 빈칸으로 늘렸더니 다시 봉이
     *    없는 자리에 섰다. **늘리지 않는다.** 작성일이 최근이면 좁은 대로 둔다.
     */
    const span = (x0: number, x1: number) => ({
      x0,
      x1: Math.max(x0, Math.min(x1, lastBar)),
    })

    // 지금 계획 — 스냅샷 날짜부터 (Q12 기간만).
    // 새로 쓰는 계획은 오늘 이후 빈칸이 자리라 자르지 않는다
    const nowSpan = drafting
      ? { x0: marksFrom ? at(marksFrom) : first, x1: last }
      : span(marksFrom ? at(marksFrom) : first, last)
    const now = planMarks({
      id: 'plan-now',
      entryPrice,
      stopPrice,
      raiseTo,
      ...nowSpan,
      strength: 1,
      priceLabels: true,
    })
    if (now) chart.addAnnotation(now)

    // 과거 계획 — 살아 있던 날짜 구간에만, 같은 모양을 옅게 (Q12 유령)
    ghosts.forEach((ghost, i) => {
      const g = planMarks({
        id: `plan-ghost-${i}`,
        entryPrice: ghost.entryPrice,
        stopPrice: ghost.stopPrice,
        raiseTo: ghost.raiseTo,
        ...span(at(ghost.from), ghost.to ? at(ghost.to) : last),
        strength: GHOST,
        priceLabels: true,
        title: ghost.label,
      })
      if (g) chart.addAnnotation(g)
    })

    /**
     * **계획 선을 축이 «항상» 품는다.** 봉만 보고 축을 잡으면 봉 위에 정상적으로
     * 있는 선(목표 가격 등)이 영구히 안 보인다. `soft` 라서 봉이 더 넓으면 봉을 따른다.
     * 0 은 「아직 없다」이지 가격이 아니라 «빼고» 잰다.
     */
    // 고른 새 스톱 — 축의 plotLine 이라 차트를 다시 세우지 않고 갈아끼운다
    axis.removePlotLine('pick-line')
    if (pickLine)
      axis.addPlotLine({
        id: 'pick-line',
        value: pickLine.price,
        color: STOP,
        width: 1.5,
        dashStyle: 'ShortDot',
        zIndex: 5,
        label: {
          text: `새 스톱 ${pickLine.price.toLocaleString('ko-KR')} · ${pickLine.label}`,
          // 왼쪽에 — 오른쪽은 최근 봉과 계획 면이 차 있어 글자가 캔들을 덮는다
          align: 'left',
          x: 8,
          y: -4,
          style: { color: STOP, fontSize: '10px', fontWeight: '600' },
        },
      })

    const marks = [
      entryPrice,
      stopPrice,
      raiseTo ?? 0,
      pickLine?.price ?? 0,
      ...ghosts.flatMap((g) => [g.entryPrice, g.stopPrice]),
      ...candidates.map((c) => c.price),
    ].filter((v) => v > 0)
    axis.update(
      marks.length
        ? { softMin: Math.min(...marks), softMax: Math.max(...marks) }
        : { softMin: undefined, softMax: undefined },
      true,
    )
  }, [
    entryPrice,
    stopPrice,
    raiseTo,
    marksFrom,
    ghosts,
    drafting,
    candidates,
    rawCandles,
    layers,
    pickLine,
    built,
  ])

  useEffect(() => {
    // `annotations` 는 annotations 모듈이 런타임에 붙이는 배열이라 타입 선언에 없다
    const chart = chartRef.current as unknown as {
      annotations?: { setVisibility?: (v: boolean) => void }[]
    } | null
    chart?.annotations?.[0]?.setVisibility?.(showSR)
  }, [showSR, rawCandles])

  return (
    <div>
      {/* 헤더 — 시고저종 | 칩. **한 줄에** 둔다 (2026-09-17).
          💀 예전에 여기 같이 넣었더니 값이 길어질 때 `flex-wrap` 이 줄을 접어
             헤더가 높아지고 차트가 밀렸다. 그래서 차트 위에 따로 얹었는데, 「차트」 글자를
             빼고 나니 한 줄이 비어 있었다. **줄바꿈을 막고 높이를 박아** 같은 줄로 올린다 —
             길면 시고저종 쪽이 잘리지 차트가 밀리지 않는다 */}
      <div className="flex h-7 items-center gap-x-3 px-1">
        <div className="min-w-0 flex-1 overflow-hidden">
          {bar && <BarRow bar={bar} />}
        </div>
        {/* 칩이 켜지면 그 계열의 색이 들어온다. 색이 곧 범례다 (디자인 2장 ⑦) */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip on={showSR} tone={SR_TONE} onClick={() => setShowSR((v) => !v)}>
            지지·저항
          </Chip>
          <IndicatorPanel layers={layers} onChange={setLayers} />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-2 flex h-[408px] items-center justify-center text-[12px] text-white/30">
          불러오는 중…
        </div>
      ) : (
        /* 차트 판. 시고저종은 위 헤더 줄로 올라갔다 (2026-09-17).
           위에 얹는 것은 지표 칸 범례뿐이다 — `pointer-events-none` 이라 봉을 짚는 걸 안 막는다 */
        <div className="relative mt-2">
          {/* 집는 중에만 십자 — 평소에는 끌어서 옮기는 판이다 */}
          <div
            ref={boxRef}
            className={cn('w-full', picking && 'cursor-crosshair')}
          />
          {/* 지표 칸 이름 + 선별 범례 — 칸 왼쪽 위. 색만으로 어느 선인지 읽힌다 */}
          {layers
            .filter((l) => paneTops[l.key] != null)
            .map((l) => {
              const lg = paneLegend(l)
              return (
                <div
                  key={l.key}
                  className="bg-bg-surface/85 pointer-events-none absolute left-2 z-10 flex items-baseline gap-2.5 rounded px-1 text-[10px] whitespace-nowrap"
                  style={{ top: (paneTops[l.key] ?? 0) + 2 }}
                >
                  <span className="text-white/45">{lg.label}</span>
                  {lg.items.map((it) => (
                    <span key={it.label} style={{ color: it.color }}>
                      {it.mark} {it.label}
                    </span>
                  ))}
                </div>
              )
            })}
          {/* CC BY-NC 크레딧 — **차트 카드 오른쪽 아래** (Q12 · CLAUDE.md 「프론트 미정」 닫힘).
              `credits` 는 끈 채로 두고 캔버스 밖에서 적는다 — 안에 두면 봉과 겹친다 */}
          <div className="mt-1 text-right text-[10px] text-white/30">
            Highcharts.com · CC BY-NC
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 시고저종 한 줄 — **캔버스 밖**이다.
 *
 * 차트 안에 그리는 한 자리를 어떻게 잡아도 무언가를 덮는다. 헤더 줄로 내보내면
 * 「가린다」는 문제가 통째로 없어지고, 마우스를 안 올려도 값이 보인다.
 *
 * 가로로 눕힌 이유 — 시·고·저·종은 **같은 단위의 네 값**이라 세로로 쌓을 이유가
 * 없다. 한 줄이면 눈이 좌→우로 한 번만 지나간다 (디자인 7장 ②).
 *
 * ⚠️ `tabular-nums` 를 건다. 자릿수가 달라져도 가로가 안 움직여야 커서를 옮길 때
 *    글자가 덜컥이지 않는다. 줄바꿈도 막는다 — 접히면 아래 차트를 민다.
 */
function BarRow({ bar }: { bar: HoveredBar }) {
  const n = (v: number) => v.toLocaleString('ko-KR')
  const up = (bar.rate ?? 0) >= 0
  return (
    <div className="font-number flex items-baseline gap-x-3 text-[11px] whitespace-nowrap tabular-nums">
      <span className="text-white/40">{bar.date}</span>
      <Cell label="시" value={n(bar.open)} />
      <Cell label="고" value={n(bar.high)} />
      <Cell label="저" value={n(bar.low)} />
      <Cell label="종" value={n(bar.close)} />
      {bar.rate !== undefined && (
        <span className={up ? 'text-candle-up' : 'text-candle-down'}>
          {up ? '+' : ''}
          {bar.rate.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

const Cell = ({ label, value }: { label: string; value: string }) => (
  <span>
    <span className="text-white/35">{label}</span>{' '}
    <span className="text-white/80">{value}</span>
  </span>
)

function Chip({
  on,
  tone,
  onClick,
  children,
}: {
  on: boolean
  tone: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors',
        on ? 'bg-white/[0.10] text-white/80' : 'bg-white/[0.03] text-white/30',
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: on ? tone : 'rgba(255,255,255,0.2)' }}
      />
      {children}
    </button>
  )
}
