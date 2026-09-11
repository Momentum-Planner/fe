import Highcharts from 'highcharts/esm/highstock'
import 'highcharts/esm/modules/annotations'
import 'highcharts/esm/indicators/indicators-all'

export { Highcharts }

/**
 * 불타기 차트의 공용 Highcharts 설정.
 *
 * ⚠️ 여기 값 하나하나에 이유가 있다 — `docs/결정/Q2_차트_바탕.md` 의
 * 「설정과 그 이유」 표가 이 파일이다. 기본값으로 되돌리면 그때 잰 숫자가 무너진다.
 *
 * 지표 모듈(`indicators-all`)을 넣었다 (2026-09-10). 계획 화면이 MACD·RSI·스토캐스틱을
 * 켤 수 있어야 하는데, 이들은 «캔들만 있으면 프론트에서 계산되는» 지표라 백엔드를
 * 기다릴 이유가 없다. 개별 import 로 30~40KB 만 무는 길도 있었지만, 지표를 하나 더
 * 볼 때마다 코드를 고치게 되므로 전부 넣는 쪽을 택했다.
 *
 * 실측 — `indicators-all` 이 **별도 청크 456KB (gzip 158KB)** 로 갈린다. 이 파일을
 * 부르는 화면(차트가 있는 곳)에서만 받는다. 첫 화면 번들은 그대로다.
 *
 * ⚠️ 두 화면이 이동평균을 «다르게» 얻는다 — 종목 상세는 백엔드
 * (`/chart/moving-averages`, 50·150·200 세 기간만), 계획 화면은 이 모듈로 프론트에서
 * 계산한다. 계획 화면은 사용자가 기간을 아무 값이나 넣을 수 있어야 해서다.
 * 같은 캔들로 같은 SMA 를 계산하므로 값은 같지만, 「20일선 이탈」 같은 «판정»은
 * 여전히 백엔드 값으로만 난다.
 */

/**
 * 시리즈 기본 팔레트.
 *
 * Highcharts 는 색을 «안 주면» 자기 기본 10색을 순서대로 칠하는데, 그 팔레트가
 * 파스텔 톤이라 이 어두운 화면에서 대비가 약하고 `styles.css` 의 토큰과도 어긋난다.
 * 그렇다고 시리즈마다 색을 손으로 주면 지표를 하나 늘릴 때마다 색을 정해야 한다.
 *
 * **기본값 자체를 한 번 바꾼다** — 그 뒤로는 색을 안 줘도 우리 색이 나온다.
 */
export const SERIES_COLORS = [
  '#34DE7B',
  '#FF3636',
  '#F46B1A',
  '#7B6CFF',
  '#34ADE4',
  '#FFD166',
  '#FF6678',
  '#EEB82D',
] as const

Highcharts.setOptions({ colors: [...SERIES_COLORS] })

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
      // 툴팁 «한 줄»이 앉을 자리를 플롯 밖에 비워 둔다 — 그래야 봉을 안 덮는다
      marginTop: 18,
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
        /**
         * **호버 마커를 끈다.**
         *
         * 💀 커서를 올리면 선마다 도형이 하나씩 찍혔다 — 다이아몬드·사각형·삼각형.
         * Highcharts 가 시리즈마다 기본 심볼을 돌려 쓰는 것인데, 이평선 넷을
         * 켜 두면 **도형 넷이 캔들 위에 얹혀 그 자리를 가린다.** 값을 보려고
         * 올린 커서가 그 값을 덮는 구조라, 고정 툴팁과 같은 병이다.
         *
         * 점을 찍어 줄 이유도 없다 — 어느 시점인지는 세로 십자선이, 가격은
         * 축의 크로스헤어 라벨이 이미 말한다.
         *
         * `marker.enabled: false` «만»으로는 안 꺼진다. 평소에 안 보일 뿐이고
         * 호버 상태는 따로 켜져 있어서 `states.hover` 를 같이 내려야 한다.
         */
        marker: { enabled: false, states: { hover: { enabled: false } } },
        // 점 둘레에 번지는 후광도 끈다 — 선이 굵어 보여 값이 흐려진다
        states: { hover: { halo: { size: 0 }, lineWidthPlus: 0 } },
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
      crosshair: {
        color: 'rgba(255,255,255,0.2)',
        dashStyle: 'Dash',
        /**
         * **커서를 따라 «그대로» 간다.**
         *
         * 💀 기본값이 `snap: true` 라 십자가 가장 가까운 봉으로 끌려간다. 봉
         * 사이를 지날 때마다 선이 «툭툭» 건너뛰어서, 마우스가 조형물에 들러붙어
         * 마음대로 안 움직이는 것처럼 느껴진다.
         *
         * 가격을 읽는 일은 축의 라벨이 하고, 봉의 시고저종은 좌상단 줄이 한다 —
         * 십자가 봉에 붙어 있을 이유가 없다.
         */
        snap: false,
        label: {
          enabled: true,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 3,
          padding: 4,
          style: { color: '#111', fontFamily: FONT, fontSize: '11px' },
          format: '{value:%Y-%m-%d}',
        },
      },
    },
    /**
     * 툴팁을 «플롯 밖 맨 위»의 **한 줄**로 못박는다.
     *
     * 💀 두 번 틀렸다.
     *   ① 기본값은 커서를 따라다닌다 — **읽으려는 봉을 자기가 덮는다.**
     *      시가·종가를 보려고 올린 커서가 그 봉을 가리는 구조다.
     *   ② 위로 올려 놓기만 하고 «줄 수»를 안 줄였다. 캔들 툴팁 기본 서식이
     *      날짜 한 줄 + O·H·L·C 네 줄이라, 위에 붙여도 **아래로 흘러 봉을 덮는다.**
     *      비운 자리(`marginTop`)보다 길면 올려 둔 의미가 없다.
     *
     * 그래서 **한 줄로 만든다.** 가격을 「그 자리」에서 읽는 일은 축의 크로스헤어
     * 라벨이 따로 지므로, 여기는 O·H·L·C 를 훑는 자리다.
     *
     * ⚠️ 지표를 켜도 이 줄은 «캔들만» 쓴다. 지표 값까지 넣으면 줄이 다시 길어지고,
     *    지표는 자기 칸에 이름이 이미 박혀 있다.
     */
    tooltip: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      shadow: false,
      padding: 0,
      style: { color: '#fff', fontFamily: FONT, fontSize: '11px' },
      split: false,
      shared: true,
      followPointer: false,
      followTouchMove: false,
      // 봉 근처에서 «붙잡지» 않는다. 줄은 위에 고정이라 따라올 이유도 없다
      snap: 0,
      useHTML: true,
      positioner: () => ({ x: 8, y: 1 }),
      /**
       * ⚠️ Highcharts 13 은 formatter 의 `this` 를 **`Point`** 로 준다 —
       *    옛 `TooltipFormatterContextObject` 가 없어졌다. `shared` 라
       *    같이 잡힌 점들이 `this.points` 에 온다.
       */
      formatter(this: Highcharts.Point) {
        const p = this.points?.find((x) => x.series.type === 'candlestick') as
          | OHLCPoint
          | undefined
        if (!p?.close) return false

        const n = (v: number) => v.toLocaleString('ko-KR')
        const dim = 'color:rgba(255,255,255,0.40)'
        const cell = (label: string, v: number) =>
          `<span style="${dim}">${label}</span> ${n(v)}`

        // 등락은 «전일 종가» 대비다. 같은 봉의 시가 대비로 재면 다른 값이 된다
        const prev = p.series.points[p.index - 1] as OHLCPoint | undefined
        const base = prev?.close
        const rate =
          base && base > 0 ? ((p.close - base) / base) * 100 : undefined
        const up = (rate ?? 0) >= 0
        const chg =
          rate === undefined
            ? ''
            : ` <span style="color:${up ? CANDLE_UP : CANDLE_DOWN}">${
                up ? '+' : ''
              }${rate.toFixed(2)}%</span>`

        const date = Highcharts.dateFormat('%Y-%m-%d', Number(p.x))
        return (
          `<span style="${dim}">${date}</span>&nbsp;&nbsp;` +
          [
            cell('시', p.open ?? 0),
            cell('고', p.high ?? 0),
            cell('저', p.low ?? 0),
            cell('종', p.close),
          ].join('&nbsp;&nbsp;') +
          chg
        )
      },
    },
  }
}

/** 캔들 점 하나 — `Point` 에 O·H·L·C 가 타입으로 안 붙어 있다 */
type OHLCPoint = Highcharts.Point & {
  open?: number
  high?: number
  low?: number
  close?: number
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
      /**
       * **원 단위로 쓴다.**
       *
       * Highcharts 기본 포매터는 큰 수에 접두어를 붙여 1,240,000 을 「1.24M」 로
       * 줄인다. 이 화면의 값은 «주가»라 자릿수 자체가 정보고, 진입가·스톱가가
       * 원 단위로 적히는데 축만 M 이면 둘을 맞대볼 수 없다.
       */
      formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
        return Number(this.value).toLocaleString('ko-KR')
      },
    },
    /**
     * 가로 십자선 + 축에 붙는 가격표. 세로선은 `xAxis.crosshair` 가 진다.
     * 값을 읽는 자리가 «축»이라 플롯 위에 아무것도 안 덮는다.
     */
    crosshair: {
      color: 'rgba(255,255,255,0.2)',
      dashStyle: 'Dash',
      // 가로선도 커서를 그대로 따라간다 — 세로선과 같은 이유
      snap: false,
      label: {
        enabled: true,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 3,
        padding: 4,
        style: { color: '#111', fontFamily: FONT, fontSize: '11px' },
        format: '{value:,.0f}',
        align: 'left',
      },
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
