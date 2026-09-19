import { useEffect, useRef } from 'react'
import {
  CANDLE_DOWN,
  CANDLE_UP,
  Highcharts,
  baseBoxAnnotation,
  baseStockOptions,
  priceAxis,
} from '@/shared/lib/chartOptions'
import type { BaseItem, DailyCandle } from '@/entities/stock'

// 머리글을 한 줄로 접어 47px 을 되찾았고 그만큼을 차트에 돌려줬다.
// 차트 «폭»은 Q0 이 지킨 값이라 건드리지 않는다 — 이 상수는 세로의 «바닥»이다.
// 화면이 크면 판을 따라 늘어난다 (2026-09-19) — 높이는 담는 칸이 정한다
const HEIGHT = 440
/** 처음 보이는 봉 수 — 왼쪽으로 끌면 과거가 나온다 */
const VISIBLE_BARS = 90

const toTime = (d: string) => {
  const [y = 0, m = 1, day = 1] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

/**
 * 오늘의 후보 화면의 캔들 차트 (한국식 — 상승 빨강 / 하락 파랑).
 *
 * **목록에서 고른 종목을 그린다** (2026-09-19 · 4장 ① 가). 전에는 `marketData.ts` 의
 * 손으로 박은 상수(SK하이닉스 모양)였다 — 실제 일봉 · 베이스 API 로 갈아끼웠다.
 *
 * 설정은 전부 `shared/lib/chartOptions` 에서 온다 (Q2).
 * 지지/저항 박스는 annotation 이라 축 값에 붙어 있다.
 */
export function MarketChart({
  candles,
  bases,
}: {
  candles: DailyCandle[] | undefined
  bases: BaseItem[] | undefined
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el || !candles?.length) return

    const sorted = [...candles].sort((a, b) =>
      a.tradeDate.localeCompare(b.tradeDate),
    )
    const data = sorted.map((c) => [
      toTime(c.tradeDate),
      c.openPrice,
      c.highPrice,
      c.lowPrice,
      c.closePrice,
    ])
    const from = data[Math.max(0, data.length - VISIBLE_BARS)]?.[0]
    const to = data.at(-1)?.[0]
    const last = sorted.at(-1)?.closePrice
    if (from === undefined || to === undefined || last === undefined) return

    const chart = Highcharts.stockChart(el, {
      ...baseStockOptions(),
      xAxis: {
        ...baseStockOptions().xAxis,
        min: from,
        max: to,
      },
      yAxis: [
        priceAxis({
          plotLines: [
            {
              value: last,
              color: '#FF367C',
              width: 1,
              dashStyle: 'Dash',
              zIndex: 3,
              label: {
                text: last.toLocaleString('ko-KR'),
                align: 'right',
                x: -8,
                y: -4,
                style: { color: '#FF367C', fontSize: '11px' },
              },
            },
          ],
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
      tooltip: {
        ...baseStockOptions().tooltip,
        pointFormatter() {
          const p = this as unknown as {
            open: number
            high: number
            low: number
            close: number
          }
          const color = p.close >= p.open ? CANDLE_UP : CANDLE_DOWN
          return (
            `시 ${p.open.toLocaleString('ko-KR')} · 고 ${p.high.toLocaleString('ko-KR')}<br/>` +
            `저 ${p.low.toLocaleString('ko-KR')} · <span style="color:${color}">종 ${p.close.toLocaleString('ko-KR')}</span>`
          )
        },
      },
      series: [
        {
          type: 'candlestick',
          name: '가격',
          data,
        } as Highcharts.SeriesCandlestickOptions,
      ],
    })

    // 칸 높이가 바뀌면(창 크기) 다시 맞춘다
    // 💀 reflow() 는 폭만 따라가고 높이는 처음 값(466)에 멈췄다 — 칸이 646 인데도. 크기를 직접 준다
    const frame = frameRef.current ?? el
    const ro = new ResizeObserver(() =>
      chart.setSize(frame.clientWidth, frame.clientHeight, false),
    )
    ro.observe(frame)
    return () => {
      ro.disconnect()
      chart.destroy()
    }
  }, [candles, bases])

  // 차트는 칸 안에 «띄운다»(absolute) — 흐름 안에 두면 차트의 높이가 칸을 붙잡아
  // 창을 줄여도 646 에 멈췄다. 칸의 높이는 판이 정하고 차트는 그것을 따른다
  return (
    <div
      ref={frameRef}
      className="relative w-full flex-1"
      style={{ minHeight: HEIGHT }}
    >
      <div ref={boxRef} className="absolute inset-0" />
    </div>
  )
}
