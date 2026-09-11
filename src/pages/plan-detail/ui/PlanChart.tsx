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
  defaultLayers,
  panes,
  specOf,
} from './indicators'
import type { Layer } from './indicators'
import { viewWindow } from './viewWindow'
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

const ENTRY = '#FF367C'
const STOP = '#34ADE4'
const SR_TONE = '#EEB82D'

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
  editing = false,
  picking,
  onPick,
}: {
  stockCode: string
  /** 0 이면 «안 그린다» — 새 계획은 아직 값이 없다 */
  entryPrice: number
  stopPrice: number
  candidates: StopCandidate[]
  /** 이 계획을 «세운 날». 차트가 그 시점으로 따라간다 */
  writtenAt: string
  /** 차트를 눌러서 «집는» 중인 칸. 집는 동안 커서가 십자가 된다 */
  picking?: 'entry' | 'stop' | null
  /** 누른 자리의 «가격». y축 값을 그대로 준다 */
  onPick?: (price: number) => void
  /**
   * 스톱가격을 «고치는 중»인가. 후보 선은 이때만 뜬다 —
   * 고르는 순간에만 필요한 선이고, 늘 떠 있으면 넷이 캔들을 시끄럽게 만든다.
   */
  editing?: boolean
}) {
  const [showSR, setShowSR] = useState(true)
  const [layers, setLayers] = useState<Layer[]>(defaultLayers)
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
  const marksRef = useRef({ entryPrice, stopPrice, origin })
  marksRef.current = { entryPrice, stopPrice, origin }

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
    const { from, to, padBars } = viewWindow(times, writtenT, VISIBLE_BARS)

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
        // 켜진 지표마다 칸 하나. 이름을 칸 왼쪽 위에 박아 범례를 없앤다 (디자인 2장 ⑦)
        ...own.map((l, i) =>
          priceAxis({
            id: `pane-${l.key}`,
            top: box.own[i]?.top,
            height: box.own[i]?.height,
            offset: 0,
            labels: { enabled: false },
            title: {
              text: specOf(l.id)?.label,
              align: 'high',
              rotation: 0,
              y: -4,
              x: 4,
              textAlign: 'left',
              style: { color: 'rgba(255,255,255,0.40)', fontSize: '10px' },
            },
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
                setBar(toBar(sorted, this.index))
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
            // 밴드형(볼린저·엔벨로프)은 색이 «셋»이라 따로 매핑한다
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
      setBar(toBar(sorted, target.index))
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
  }, [rawCandles, bases, candidates, writtenAt, layers, editing])

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
    const axis = chartRef.current?.yAxis[0]
    if (!axis) return

    const ids = ['pl-entry', 'pl-stop']
    for (const id of ids) axis.removePlotLine(id)
    axis.removePlotBand('pb-r')

    // 값이 «아직 없으면» 안 그린다 — 0 에 선을 그으면 축이 통째로 눌린다
    if (entryPrice > 0)
      axis.addPlotLine({
        id: 'pl-entry',
        value: entryPrice,
        color: ENTRY,
        width: 1.5,
        dashStyle: 'Dash',
        zIndex: 4,
        label: {
          text: `진입 ${entryPrice.toLocaleString('ko-KR')}`,
          align: 'right',
          x: -8,
          y: -4,
          style: { color: ENTRY, fontSize: '11px' },
        },
      })
    if (stopPrice > 0)
      axis.addPlotLine({
        id: 'pl-stop',
        value: stopPrice,
        color: STOP,
        width: 1.5,
        zIndex: 4,
        label: {
          text: `스톱가격 ${stopPrice.toLocaleString('ko-KR')}`,
          align: 'right',
          x: -8,
          y: 12,
          style: { color: STOP, fontSize: '11px' },
        },
      })

    // 진입~스톱 사이가 1R 이다 — 위험노출이 %로 말하는 것을 가격으로 말한다
    if (entryPrice > 0 && stopPrice > 0)
      axis.addPlotBand({
        id: 'pb-r',
        from: Math.min(entryPrice, stopPrice),
        to: Math.max(entryPrice, stopPrice),
        color: 'rgba(52,173,228,0.08)',
        zIndex: 0,
      })

    /**
     * **계획 선을 축이 «항상» 품는다.** 봉만 보고 축을 잡으면 봉 위에 정상적으로
     * 있는 선(익절 목표 등)이 영구히 안 보인다. `soft` 라서 봉이 더 넓으면 봉을 따른다.
     * 0 은 「아직 없다」이지 가격이 아니라 «빼고» 잰다.
     */
    const marks = [
      entryPrice,
      stopPrice,
      ...candidates.map((c) => c.price),
    ].filter((v) => v > 0)
    axis.update(
      marks.length
        ? { softMin: Math.min(...marks), softMax: Math.max(...marks) }
        : { softMin: undefined, softMax: undefined },
      true,
    )
  }, [entryPrice, stopPrice, candidates, rawCandles, layers])

  useEffect(() => {
    // `annotations` 는 annotations 모듈이 런타임에 붙이는 배열이라 타입 선언에 없다
    const chart = chartRef.current as unknown as {
      annotations?: { setVisibility?: (v: boolean) => void }[]
    } | null
    chart?.annotations?.[0]?.setVisibility?.(showSR)
  }, [showSR, rawCandles])

  return (
    <div>
      {/* 헤더 — **값이 안 변하는 것만** 둔다. 시고저종은 차트 위에 얹는다.
          💀 여기 같이 넣었더니 값이 길어질 때 `flex-wrap` 이 줄을 접어
             헤더가 높아지고 차트가 그만큼 밀렸다 — 마우스를 옮길 때마다 들썩였다 */}
      <div className="flex items-center gap-x-3 px-1">
        <span className="text-[11px] font-bold tracking-wide text-white/45">
          차트
        </span>
        {/* 칩이 켜지면 그 계열의 색이 들어온다. 색이 곧 범례다 (디자인 2장 ⑦) */}
        <div className="ml-auto flex items-center gap-1.5">
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
        /* ── 시고저종을 차트 «좌측 최상단»에 얹는다 ──────────────────────
           겹쳐 놓는데도 봉을 안 가리는 이유는 `chartOptions` 의 `marginTop` 이
           **플롯 밖에 그만큼 자리를 비워 두기** 때문이다. 줄이 앉는 자리와
           봉이 그려지는 자리가 애초에 안 겹친다.

           💀 한때 헤더에 «따로 한 줄»로 뺐더니 값이 길어질 때마다 그 줄이
              접히고 차트가 밀렸다. 겹쳐 두면 아래를 밀 수가 없다.
           ⚠️ `pointer-events-none` — 이 줄이 마우스를 먹으면 그 밑의 봉을
              짚을 수 없어 값이 갱신되지 않는다. */
        <div className="relative mt-2">
          {/* 집는 중에만 십자 — 평소에는 끌어서 옮기는 판이다 */}
          <div
            ref={boxRef}
            className={cn('w-full', picking && 'cursor-crosshair')}
          />
          {bar && (
            <div className="pointer-events-none absolute top-0 left-2 z-10">
              <BarRow bar={bar} />
            </div>
          )}
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
    <div className="font-number flex items-baseline gap-x-3 text-[11px] tabular-nums">
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
