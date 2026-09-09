import Highcharts from 'highcharts/esm/highstock'
import 'highcharts/esm/modules/annotations'

export { Highcharts }

/**
 * 불타기 차트의 공용 Highcharts 설정.
 *
 * ⚠️ 여기 값 하나하나에 이유가 있다 — `docs/결정/Q2_차트_바탕.md` 의
 * 「설정과 그 이유」 표가 이 파일이다. 기본값으로 되돌리면 그때 잰 숫자가 무너진다.
 *
 * 지표 모듈(`indicators-all`)은 일부러 안 넣었다. 지금 두 화면이 그리는 이동평균선은
 * 백엔드(`/chart/moving-averages`)가 계산해 주므로 라인 시리즈면 충분하고,
 * 45종을 통째로 넣으면 번들만 157KB 늘어난다. 프론트 계산 지표가 필요해지면 그때 붙인다.
 */

export const CANDLE_UP = '#FF3636'
export const CANDLE_DOWN = '#34ADE4'
export const SR_LINE = '#EEB82D'
export const SR_FILL = 'rgba(238,184,45,0.10)'

const TEXT_DIM = 'rgba(255,255,255,0.55)'
const GRID = 'rgba(255,255,255,0.05)'
const FONT = "'DM Sans', sans-serif"

/**
 * 「일봉 아래로는 묶지 않는다」.
 *
 * dataGrouping 은 켜 둬야 한다 — 2,340봉에서 끄면 redraw 가 179.8ms, 켜면 0.7ms 다(256배).
 * 폭 1,400px 에 2,340봉이면 봉 하나가 0.6px 이라, 안 보이는 것을 DOM 노드로 만드는 셈이다.
 *
 * 대신 묶이면 **지표 기간이 조용히 늘어난다** — 195개 그룹에서 SMA(14)를 계산하면 실질
 * 168봉 평균이 된다(SMA 93,364.7 → 92,921.8). 「20일선」이 20일선이 아니게 되므로,
 * units 에서 일(day) 미만을 빼서 일봉이 여러 개로 묶이는 것만 막는다.
 */
export const DAILY_UNITS: Highcharts.DataGroupingOptionsObject['units'] = [
  ['day', [1]],
  ['week', [1]],
  ['month', [1, 3, 6]],
  ['year', [1]],
]

/** 분봉 화면용 — 분 단위까지는 묶이게 둔다. */
export const INTRADAY_UNITS: Highcharts.DataGroupingOptionsObject['units'] = [
  ['minute', [1, 5, 15, 30]],
  ['hour', [1, 4]],
  ['day', [1]],
]

export type StockChartOptionsArgs = {
  /** 기본은 일봉 기준. 분봉 화면이면 'intraday'. */
  grain?: 'daily' | 'intraday'
  /** 차트 높이(px). */
  height?: number
}

/**
 * 모든 불타기 차트의 바탕. 화면마다 `series` / `yAxis` 만 얹어 쓴다.
 */
export function baseStockOptions({
  grain = 'daily',
  height,
}: StockChartOptionsArgs = {}): Highcharts.Options {
  return {
    chart: {
      backgroundColor: 'transparent',
      animation: false, // 끝점이 계속 움직이는 화면에서 애니메이션은 잔상만 남긴다
      height,
      spacing: [4, 0, 0, 0],
      // 드래그 = 옆으로 이동, 줌 = 휠. zooming.type 을 주면 드래그가 영역 선택 줌으로
      // 넘어가 버리므로 넣지 않는다. panKey 를 주면 그 키를 누른 채로만 패닝된다.
      zooming: { mouseWheel: { enabled: true } },
      panning: { enabled: true, type: 'x' },
    },
    credits: { enabled: false },
    // Highcharts 기본 탐색 수단들. 자체 룩이 강해 불타기와 부딪히므로 끄고,
    // 위의 드래그 + 휠로 대신한다.
    navigator: { enabled: false },
    scrollbar: { enabled: false },
    rangeSelector: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      candlestick: {
        color: CANDLE_DOWN, // 라이브러리 기본은 한국과 반대(상승 초록/하락 빨강)
        upColor: CANDLE_UP,
        lineColor: CANDLE_DOWN,
        upLineColor: CANDLE_UP,
        animation: false,
      },
      series: {
        animation: false,
        dataGrouping: {
          enabled: true,
          groupPixelWidth: 6,
          units: grain === 'daily' ? DAILY_UNITS : INTRADAY_UNITS,
        },
      },
    },
    xAxis: {
      gridLineWidth: 0,
      lineColor: GRID,
      tickColor: GRID,
      labels: {
        style: { color: TEXT_DIM, fontFamily: FONT, fontSize: '11px' },
      },
      crosshair: { color: 'rgba(255,255,255,0.2)', dashStyle: 'Dash' },
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.85)',
      borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6,
      shadow: false,
      style: { color: '#fff', fontFamily: FONT, fontSize: '11px' },
      split: false,
      shared: true,
    },
  }
}

/** 가격 축 하나의 공통 모양. */
export function priceAxis(
  extra: Highcharts.YAxisOptions = {},
): Highcharts.YAxisOptions {
  return {
    gridLineColor: GRID,
    gridLineDashStyle: 'Dash',
    lineWidth: 0,
    // 축 바깥에 둔다. `align: 'right', x: -6` 으로 플롯 안에 겹쳐 놓으면 가로를
    // 60px 쯤 아끼지만, 끝봉이 라벨 위로 올라타 가격을 가린다 — 끝점이 계속
    // 움직이는 화면이라 항상 겹친다.
    labels: {
      align: 'left',
      x: 6,
      style: { color: TEXT_DIM, fontFamily: FONT, fontSize: '11px' },
    },
    ...extra,
  }
}

/**
 * 지지/저항 박스를 annotation 으로. 축 값 기준이라 스크롤·줌을 알아서 따라간다
 * (lightweight-charts 시절에는 좌표를 직접 계산해 DOM div 를 다시 그렸다).
 */
export function baseBoxAnnotation(
  boxes: Array<{ from: number; to: number; low: number; high: number }>,
): Highcharts.AnnotationsOptions {
  // 세 조각으로 나눈다 — 닫힌 사각형 하나로 그리면 좌우 변까지 선이 생긴다.
  // 저항선(위)·지지선(아래)은 «가격»이라 선이 뜻을 갖지만, 좌우는 «구간의 시작과 끝»
  // 이라 선을 그으면 그 날짜에 뭔가 있는 것처럼 읽힌다.
  const shapes = boxes.flatMap((b) => [
    // ① 바탕 — 채우기만. 테두리 없음
    {
      type: 'path',
      fill: SR_FILL,
      strokeWidth: 0,
      points: [
        { x: b.from, y: b.high, xAxis: 0, yAxis: 0 },
        { x: b.to, y: b.high, xAxis: 0, yAxis: 0 },
        { x: b.to, y: b.low, xAxis: 0, yAxis: 0 },
        { x: b.from, y: b.low, xAxis: 0, yAxis: 0 },
        { x: b.from, y: b.high, xAxis: 0, yAxis: 0 },
      ],
    },
    // ② 저항선 (위)
    {
      type: 'path',
      fill: 'none',
      stroke: SR_LINE,
      strokeWidth: 1.5,
      points: [
        { x: b.from, y: b.high, xAxis: 0, yAxis: 0 },
        { x: b.to, y: b.high, xAxis: 0, yAxis: 0 },
      ],
    },
    // ③ 지지선 (아래)
    {
      type: 'path',
      fill: 'none',
      stroke: SR_LINE,
      strokeWidth: 1.5,
      points: [
        { x: b.from, y: b.low, xAxis: 0, yAxis: 0 },
        { x: b.to, y: b.low, xAxis: 0, yAxis: 0 },
      ],
    },
  ])

  return { draggable: '', shapes } as Highcharts.AnnotationsOptions
}
