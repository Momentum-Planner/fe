/**
 * 보조지표 사전.
 *
 * `indicators-all` 이 45종을 다 들고 있지만, 여기 적힌 것만 화면에 나온다 —
 * 목록이 45줄이면 «고르는» 화면이 아니라 «찾는» 화면이 된다.
 *
 * 갈림은 **어느 축에 앉는가** 하나다.
 *   `price`  가격 축에 겹친다 (이동평균선 · 볼린저 밴드 · 엔벨로프)
 *   `own`    자기 칸을 하나 받는다 (MACD · RSI · …)
 *
 * 파라미터는 **기간뿐**이다. Highcharts 의 `params` 는 지표마다 이름이 다르므로
 * (`period` / `periods` / `shortPeriod`…) 여기서 그 이름을 적어 둔다.
 */

import { SERIES_COLORS, SR_LINE } from '@/shared/lib/chartOptions'

export type Pane = 'price' | 'own'

export type ParamSpec = {
  /** Highcharts `params` 안의 키 */
  key: string
  label: string
  def: number
  min: number
  max: number
  /**
   * 그 키가 «배열»일 때 몇 번째인가. 스토캐스틱이 `periods: [%K, %D]` 로 받는다 —
   * 여기를 안 맞추면 `period` 로 보내게 되는데, 그 지표는 `period: void 0` 라
   * **조용히 무시되고 기본값이 쓰인다.** 값이 안 먹는데 에러도 안 난다.
   */
  at?: number
  /** 소수 파라미터의 증분 (엔벨로프의 밴드 폭 0.1 = 10%) */
  step?: number
}

export type IndicatorSpec = {
  /** Highcharts 시리즈 타입 그대로 */
  id: string
  label: string
  /** 패널의 설명 한 줄 */
  hint: string
  pane: Pane
  params: ParamSpec[]
  /**
   * 색을 «정하지 않는다» — `SERIES_COLORS` 에서 켜는 순서대로 붙는다.
   * 여기 적는 것은 그 기본을 «벗어나야» 하는 지표뿐이다.
   */
  color?: string
  /**
   * 여러 벌을 겹칠 수 있는가. 이동평균선은 20·50·150·200 을 «동시에» 보므로 참이고,
   * MACD 는 두 벌을 겹칠 이유가 없다.
   */
  multi?: boolean
  /**
   * 밴드형 지표의 «선들». 볼린저 밴드는 선이 하나가 아니라 셋(상한·중간·하한)이고,
   * 색을 하나만 주면 셋이 같은 색으로 겹쳐 나온다 — 어느 선이 상한인지 알 수 없다.
   * 이 목록이 있으면 패널이 선마다 색과 표시를 따로 준다.
   */
  lines?: { key: BandLine; label: string }[]
  /** 밴드 안쪽을 채울 수 있는가 */
  fill?: boolean
}

export type BandLine = 'top' | 'mid' | 'bottom'

const period = (def: number, min = 2, max = 400): ParamSpec => ({
  key: 'period',
  label: '기간',
  def,
  min,
  max,
})

export const INDICATORS: IndicatorSpec[] = [
  {
    id: 'sma',
    label: '이동평균선',
    hint: '지난 n일 종가의 평균을 이은 선',
    pane: 'price',
    params: [period(50)],
    multi: true,
  },
  {
    id: 'ema',
    label: '지수이동평균',
    hint: '최근 값에 가중치를 준 이동평균',
    pane: 'price',
    params: [period(21)],
    multi: true,
  },
  {
    id: 'bb',
    label: '볼린저 밴드',
    hint: '이동평균 ± 표준편차. 변동성의 폭을 띠로',
    pane: 'price',
    params: [
      period(20),
      {
        key: 'standardDeviation',
        label: '표준편차',
        def: 2,
        min: 1,
        max: 4,
      },
    ],
    lines: [
      { key: 'top', label: '상한선' },
      { key: 'mid', label: '중간선' },
      { key: 'bottom', label: '하한선' },
    ],
    fill: true,
  },
  {
    id: 'priceenvelopes',
    label: '엔벨로프',
    hint: '이동평균에서 위아래 일정 비율로 띠를 그린다',
    pane: 'price',
    params: [
      period(20),
      { key: 'topBand', label: '위', def: 0.1, min: 0.01, max: 1, step: 0.01 },
      {
        key: 'bottomBand',
        label: '아래',
        def: 0.1,
        min: 0.01,
        max: 1,
        step: 0.01,
      },
    ],
    lines: [
      { key: 'top', label: '상한선' },
      { key: 'mid', label: '중간선' },
      { key: 'bottom', label: '하한선' },
    ],
    fill: true,
  },
  {
    id: 'vbp',
    label: '매물대',
    hint: '가격대별 거래량. 어디서 손이 바뀌었나',
    pane: 'price',
    // ⚠️ `period` 를 «안 받는다» (`period: void 0`). 구간 수만 정한다
    params: [{ key: 'ranges', label: '구간', def: 12, min: 4, max: 40 }],
  },
  {
    id: 'macd',
    label: 'MACD',
    hint: '두 지수이동평균의 차와 그 신호선',
    pane: 'own',
    params: [
      { key: 'shortPeriod', label: '단기', def: 12, min: 2, max: 100 },
      { key: 'longPeriod', label: '장기', def: 26, min: 3, max: 200 },
      { key: 'signalPeriod', label: '시그널', def: 9, min: 2, max: 100 },
    ],
  },
  {
    id: 'rsi',
    label: 'RSI',
    hint: '상승폭과 하락폭의 비. 과열·침체 판정',
    pane: 'own',
    params: [period(14)],
  },
  {
    id: 'stochastic',
    label: '스토캐스틱',
    hint: '최근 고저 범위에서 종가의 자리',
    pane: 'own',
    // ⚠️ `period` 가 아니라 `periods: [%K, %D]` 다
    params: [
      { key: 'periods', label: '%K', def: 14, min: 2, max: 100, at: 0 },
      { key: 'periods', label: '%D', def: 3, min: 1, max: 50, at: 1 },
    ],
  },
  {
    id: 'atr',
    label: 'ATR',
    hint: '평균 변동폭. 손절폭을 재는 자',
    pane: 'own',
    params: [period(14)],
  },
  {
    id: 'obv',
    label: 'OBV',
    hint: '거래량을 등락 방향으로 누적',
    pane: 'own',
    params: [],
  },
  {
    id: 'cci',
    label: 'CCI',
    hint: '평균 대비 얼마나 벗어났나',
    pane: 'own',
    params: [period(20)],
  },
]

/** 켜져 있는 지표 한 벌. `multi` 지표는 같은 `id` 로 여럿이 선다 */
export type Layer = {
  /** 이 벌의 고유 키 — Highcharts 시리즈 id 가 된다 */
  key: string
  id: string
  color: string
  /** 배열 파라미터(스토캐스틱의 `periods`)가 있어 값이 number 만은 아니다 */
  params: Record<string, number | number[]>
  /** 밴드형 지표의 선별 색. 없으면 `color` 하나를 쓴다 */
  colors?: Partial<Record<BandLine, string>>
  /** 끈 선들 — 지우지 않고 «숨긴다». 다시 켜면 색이 그대로다 */
  off?: BandLine[]
  /** 밴드 안쪽 채우기 */
  fillOn?: boolean
}

/** 밴드형 지표의 기본 색 — 상·하한은 같은 색, 중간선만 다르게 */
export const bandColors = (mid: string): Partial<Record<BandLine, string>> => ({
  top: SR_LINE,
  mid,
  bottom: SR_LINE,
})

/** 배열 파라미터 한 칸 읽기 */
export const readParam = (l: Layer, p: ParamSpec): number => {
  const v = l.params[p.key]
  if (p.at != null) return (Array.isArray(v) ? v[p.at] : undefined) ?? p.def
  return typeof v === 'number' ? v : p.def
}

/** 배열 파라미터 한 칸 쓰기 */
export function writeParam(
  l: Layer,
  p: ParamSpec,
  n: number,
): Record<string, number | number[]> {
  const clamped = Math.min(p.max, Math.max(p.min, n))
  if (p.at == null) return { ...l.params, [p.key]: clamped }
  const cur = l.params[p.key]
  const arr = Array.isArray(cur) ? [...cur] : []
  arr[p.at] = clamped
  return { ...l.params, [p.key]: arr }
}

export const specOf = (id: string) => INDICATORS.find((d) => d.id === id)

let seq = 0
/**
 * @param at  몇 번째로 켜는 지표인가 — 색이 `SERIES_COLORS` 에서 이 순번으로 붙는다
 */
export function makeLayer(
  spec: IndicatorSpec,
  override?: number,
  at = 0,
): Layer {
  seq += 1
  // 나머지 연산이라 항상 범위 안인데 «타입은 그것을 모른다» — 첫 색을 바닥으로 둔다
  const color =
    spec.color ?? SERIES_COLORS[at % SERIES_COLORS.length] ?? SERIES_COLORS[0]
  const params: Record<string, number | number[]> = {}
  for (const p of spec.params) {
    const v = p.key === 'period' && override != null ? override : p.def
    if (p.at == null) params[p.key] = v
    else {
      const arr = Array.isArray(params[p.key])
        ? (params[p.key] as number[])
        : []
      arr[p.at] = v
      params[p.key] = arr
    }
  }
  return {
    key: `${spec.id}-${seq}`,
    id: spec.id,
    color,
    params,
    ...(spec.lines ? { colors: bandColors(color), off: [], fillOn: true } : {}),
  }
}

/** `#RRGGBB` 를 알파 붙은 rgba 로. 밴드 채우기에 쓴다 */
export function withAlpha(hex: string, a: number): string {
  const body = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1]
  if (!body) return hex
  const n = parseInt(body, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/**
 * 밴드형 지표의 Highcharts 옵션.
 *
 * `topLine` / `bottomLine` 은 «스타일 객체»로 받고 중간선은 시리즈의 `color` 다 —
 * 셋이 받는 자리가 서로 달라서 한 곳에 적어 두지 않으면 매번 헷갈린다.
 * 끈 선은 지우는 게 아니라 `lineWidth: 0` 으로 숨긴다.
 */
export function bandOptions(l: Layer): Record<string, unknown> {
  const c = l.colors ?? {}
  const off = l.off ?? []
  const line = (k: BandLine) => ({
    styles: {
      lineColor: c[k] ?? l.color,
      lineWidth: off.includes(k) ? 0 : 1,
    },
  })
  return {
    color: off.includes('mid') ? 'transparent' : (c.mid ?? l.color),
    topLine: line('top'),
    bottomLine: line('bottom'),
    fillColor: l.fillOn ? withAlpha(c.mid ?? l.color, 0.06) : 'transparent',
  }
}

/**
 * 거래량 시리즈의 id. **OBV 와 매물대가 이 id 로 거래량을 찾는다** —
 * 안 맞으면 «차트가 통째로 예외를 던진다»(`Series volume not found!`).
 * 지표 하나가 안 나오는 게 아니라 화면이 빈다. 그래서 상수로 한 자리에 둔다.
 */
export const VOLUME_SERIES_ID = 'volume'

/**
 * 첫 화면의 기본값 — 이동평균 세 선.
 *
 * 50 · 150 · 200 인 것은 트렌드 템플릿 8조건이 그 셋을 보기 때문이다(①-1).
 * 지표를 «하나도» 안 켜 두면 판정의 근거가 화면에 없고, 그렇다고 열 개를 켜 두면
 * 화면이 먼저 말을 한다 — 판정이 실제로 쓰는 셋만 켠다.
 */
export function defaultLayers(): Layer[] {
  // 사전의 첫 항목이 이동평균선이다 — 이름으로 찾아야 순서가 바뀌어도 안 깨진다
  const sma = INDICATORS.find((d) => d.id === 'sma')
  if (!sma) return []
  return [50, 150, 200].map((n, i) => makeLayer(sma, n, i))
}

/* ── 칸 배치 ───────────────────────────────────────────────────────────── */

export const PRICE_H = 300
export const VOL_H = 78
export const IND_H = 108
/**
 * X축 라벨이 설 자리.
 *
 * ⚠️ yAxis 를 «픽셀»로 배치하면 축이 차트 바닥까지 꽉 차서 **날짜 라벨이 마지막 칸
 * 안에 겹쳐 그려진다.** Highcharts 가 알아서 비켜 주지 않는다 — 축 높이를 내가 정했으니
 * 라벨 자리도 내가 빼 줘야 한다.
 */
export const AXIS_H = 30
/** 칸 사이 틈 */
const PAD = 8

export type Pane_ = { top: number; height: number }

/**
 * 지표 n 개를 켰을 때의 칸 배치.
 *
 * 계산을 함수로 «빼 둔» 이유 — jsdom 에서 Highcharts 는 컨테이너 크기를 못 재서
 * `plotHeight` 가 NaN 이 된다. 렌더된 좌표로는 검증이 안 되므로, 적어도 «식»은
 * 테스트로 못 박는다.
 */
export function panes(ownCount: number): {
  total: number
  price: Pane_
  volume: Pane_
  own: Pane_[]
} {
  return {
    total: PRICE_H + VOL_H + ownCount * IND_H + AXIS_H,
    price: { top: 0, height: PRICE_H },
    volume: { top: PRICE_H + PAD, height: VOL_H - PAD },
    own: Array.from({ length: ownCount }, (_, i) => ({
      top: PRICE_H + VOL_H + i * IND_H + PAD,
      height: IND_H - 2 * PAD,
    })),
  }
}
