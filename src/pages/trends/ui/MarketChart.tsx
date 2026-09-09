import { useEffect, useRef } from 'react'
import {
  CANDLE_DOWN,
  CANDLE_UP,
  Highcharts,
  baseBoxAnnotation,
  baseStockOptions,
  priceAxis,
} from '@/shared/lib/chartOptions'
import {
  VISIBLE_BARS,
  baseBoxes,
  currentPrice,
  marketCandles,
} from '../model/marketData'

// 머리글을 한 줄로 접어 47px 을 되찾았고 그만큼을 차트에 돌려줬다.
// 차트 «폭»은 Q0 이 지킨 값이라 건드리지 않는다 — 이 상수는 세로만 잡는다.
const HEIGHT = 440

/** lightweight-charts 는 초, Highcharts 는 밀리초를 쓴다. */
const ms = (t: unknown) => (t as number) * 1000

/**
 * 오늘의 후보 화면의 캔들 차트 (한국식 — 상승 빨강 / 하락 파랑).
 *
 * 설정은 전부 `shared/lib/chartOptions` 에서 온다. 이유는 `docs/결정/Q11_차트_바탕.md`.
 * 지지/저항 박스는 annotation 이라 축 값에 붙어 있다 — 예전처럼 스크롤할 때마다
 * 좌표를 다시 계산해 DOM div 를 그리지 않는다.
 */
export function MarketChart() {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return

    const data = marketCandles.map((c) => [
      ms(c.time),
      c.open,
      c.high,
      c.low,
      c.close,
    ])
    // 처음 보이는 구간 = 설계된 최근 봉들. 왼쪽으로 끌면 과거가 나온다.
    const from = data[Math.max(0, data.length - VISIBLE_BARS)][0]
    const to = data[data.length - 1][0]

    const chart = Highcharts.stockChart(el, {
      ...baseStockOptions({ height: HEIGHT }),
      xAxis: {
        ...baseStockOptions().xAxis,
        min: from,
        max: to,
      },
      yAxis: [
        priceAxis({
          plotLines: [
            {
              value: currentPrice,
              color: '#FF367C',
              width: 1,
              dashStyle: 'Dash',
              zIndex: 3,
              label: {
                text: currentPrice.toLocaleString('ko-KR'),
                align: 'right',
                x: -8,
                y: -4,
                style: { color: '#FF367C', fontSize: '11px' },
              },
            },
          ],
        }),
      ],
      annotations: [
        baseBoxAnnotation(
          baseBoxes.map((b) => ({
            from: ms(marketCandles[b.fromIndex].time),
            to: ms(marketCandles[b.toIndex].time),
            low: b.low,
            high: b.high,
          })),
        ),
      ],
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

    return () => chart.destroy()
  }, [])

  return <div ref={boxRef} className="w-full" style={{ height: HEIGHT }} />
}
