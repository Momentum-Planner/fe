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

const toTime = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

export function PlanChart({
  stockCode,
  entryPrice,
  stopPrice,
  candidates,
  writtenAt,
}: {
  stockCode: string
  entryPrice: number
  stopPrice: number
  candidates: StopCandidate[]
  /** 이 계획을 «세운 날». 차트가 그 시점으로 따라간다 */
  writtenAt: string
}) {
  const [showSR, setShowSR] = useState(true)
  const [layers, setLayers] = useState<Layer[]>(defaultLayers)

  const range = useMemo(
    () => ({ from: toLocalDate(daysAgo(365)), to: toLocalDateTime() }),
    [],
  )
  const { data: rawCandles = [], isLoading } = useDailyCandles(stockCode, range)
  const { data: bases } = useBases(stockCode, range)

  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Highcharts.Chart | null>(null)

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
    const { from, to, overscroll } = viewWindow(
      data.map((d) => d[0]),
      writtenT,
      VISIBLE_BARS,
    )

    // 고른 선은 stopPrice 로 따로 그리므로 여기서 뺀다 — 같은 자리에 두 번 긋지 않는다
    const others = candidates.filter((c) => !c.chosen)

    // 공용 바탕의 X축 설정. 타입이 `XAxisOptions | XAxisOptions[]` 라 한 번 좁혀 둔다
    const baseX = baseStockOptions().xAxis as Highcharts.XAxisOptions

    const chart = Highcharts.stockChart(el, {
      ...baseStockOptions({ height: box.total }),
      xAxis: {
        ...baseX,
        min: from,
        max: to,
        // 모자란 오른쪽은 «여유»로 — 범위를 데이터 밖으로 넘기면 ordinal 매핑이 깨진다
        overscroll,
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
            if (Number(this.value) > data[data.length - 1][0]) return ''
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
              textAlign: 'left',
              rotation: 0,
              y: 12,
              x: 6,
              style: { color: 'rgba(255,255,255,0.45)', fontSize: '10px' },
            },
          },
        ],
      },
      yAxis: [
        priceAxis({
          height: box.price.height,
          // 진입가와 스톱가격 «사이»가 1R 이다. 위험노출 막대가 %로 말하는 것을
          // 여기서는 «가격»으로 말한다 — 같은 값의 두 축이라 둘 다 있어야 한다
          plotBands: [
            {
              from: Math.min(entryPrice, stopPrice),
              to: Math.max(entryPrice, stopPrice),
              color: 'rgba(52,173,228,0.08)',
              zIndex: 0,
            },
          ],
          plotLines: [
            // 후보 선 — 값이 있는 «그 자리»에 이름을 둔다 (디자인 7장)
            ...others.map((c) => ({
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
            {
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
            },
            {
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
            },
          ],
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
            top: box.own[i].top,
            height: box.own[i].height,
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
        { type: 'candlestick', id: 'candles', name: '일봉', data, yAxis: 0 },
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
      /**
       * 툴팁 — 이 차트는 계획을 고르면 «자동으로» 툴팁을 띄운다. 종가 하나만 나오면
       * 띄울 이유가 없으므로 시고저종을 다 적고, 그날이 계획을 세운 날이면 그렇다고 쓴다.
       */
      tooltip: {
        ...baseStockOptions().tooltip,
        useHTML: true,
        formatter(this: Highcharts.Point) {
          const p = this as unknown as {
            x: number
            open?: number
            high?: number
            low?: number
            close?: number
          }
          if (p.close == null) return false
          const d = new Date(p.x)
          const day = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
          const row = (a: string, b: number) =>
            `<span style="color:rgba(255,255,255,0.45)">${a}</span> ${b.toLocaleString('ko-KR')}`
          return `<div style="font-size:11px;line-height:1.6">
            <div style="color:rgba(255,255,255,0.55)">${day}</div>
            <div>${row('시', p.open ?? 0)}  ${row('고', p.high ?? 0)}</div>
            <div>${row('저', p.low ?? 0)}  ${row('종', p.close)}</div>
          </div>`
        },
      },
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
     * 그 날짜의 봉을 **마우스로 짚은 것처럼** 세워 둔다.
     *
     * 계획을 고르면 구간이 그리로 옮겨가지만, 옮겨간 «어디»가 그날인지는 세로 점선
     * 하나로는 약하다. 크로스헤어와 툴팁을 미리 띄워 두면 그날의 시고저종이 바로 나온다 —
     * 사용자가 매번 그 자리를 찾아 마우스를 올릴 필요가 없다.
     *
     * 마우스를 차트에 올리면 그때부터는 사용자를 따라간다. 처음 한 번만 대신 짚는다.
     */
    const candleSeries = chart.get('candles') as Highcharts.Series | undefined
    const pts = candleSeries?.points ?? []
    const target = pts.length
      ? pts.reduce((best, p) =>
          Math.abs(p.x - writtenT) < Math.abs(best.x - writtenT) ? p : best,
        )
      : undefined
    if (target) {
      chart.xAxis[0].drawCrosshair(undefined, target)
      chart.tooltip.refresh(target)
      target.setState('hover')
    }

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [rawCandles, bases, entryPrice, stopPrice, candidates, writtenAt, layers])

  useEffect(() => {
    // `annotations` 는 annotations 모듈이 런타임에 붙이는 배열이라 타입 선언에 없다
    const chart = chartRef.current as unknown as {
      annotations?: { setVisibility?: (v: boolean) => void }[]
    } | null
    chart?.annotations?.[0]?.setVisibility?.(showSR)
  }, [showSR, rawCandles])

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
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
        <div className="flex h-[408px] items-center justify-center text-[12px] text-white/30">
          불러오는 중…
        </div>
      ) : (
        <div ref={boxRef} className="w-full" />
      )}
    </div>
  )
}

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
