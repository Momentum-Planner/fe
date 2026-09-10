import { describe, expect, it } from 'vitest'
import {
  Highcharts,
  baseStockOptions,
  priceAxis,
} from '@/shared/lib/chartOptions'
import {
  AXIS_H,
  INDICATORS,
  IND_H,
  VOLUME_SERIES_ID,
  makeLayer,
  panes,
  readParam,
  specOf,
  writeParam,
} from './indicators'

/**
 * **지표 사전이 Highcharts 와 실제로 맞물리는지**를 잰다.
 *
 * 이 검사가 필요한 이유 — Highcharts 지표는 틀려도 «조용히» 실패한다.
 *   · 타입 이름이 틀리면        시리즈가 안 만들어진다
 *   · 파라미터 이름이 틀리면     `period: void 0` 인 지표는 그냥 «무시»하고 기본값을 쓴다
 * 앞의 둘은 에러도 경고도 안 난다 — 눈으로 봐도 「원래 저런가 보다」로 지나간다.
 * 반대로 `volumeSeriesID` 가 안 맞으면 **차트가 통째로 예외를 던진다**(아래 마지막 검사).
 * 조용한 실패와 요란한 실패가 섞여 있어서, 어느 쪽이든 테스트로 못 박아 둔다.
 */

/** 상승 추세 200봉. 지표가 계산될 만큼 길어야 한다 (200일선까지 있다) */
function candles(n = 320) {
  const out: Array<[number, number, number, number, number]> = []
  let price = 50_000
  for (let i = 0; i < n; i++) {
    price = price * (1 + Math.sin(i / 7) * 0.01 + 0.0015)
    const o = price * 0.998
    const c = price
    out.push([
      Date.UTC(2025, 0, 1) + i * 86_400_000,
      o,
      Math.max(o, c) * 1.004,
      Math.min(o, c) * 0.996,
      c,
    ])
  }
  return out
}

function render(layerIds: string[]) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const data = candles()
  const layers = layerIds.map((id) => {
    const spec = specOf(id)
    if (!spec) throw new Error(`사전에 없는 지표: ${id}`)
    return makeLayer(spec)
  })
  const own = layers.filter((l) => specOf(l.id)?.pane === 'own')

  const chart = Highcharts.stockChart(el, {
    ...baseStockOptions({ height: 400 }),
    yAxis: [
      priceAxis({ height: 200 }),
      priceAxis({ top: 210, height: 60 }),
      ...own.map((_, i) => priceAxis({ top: 280 + i * 60, height: 50 })),
    ],
    series: [
      { type: 'candlestick', id: 'candles', data, yAxis: 0 },
      {
        type: 'column',
        id: VOLUME_SERIES_ID,
        data: data.map((d) => ({ x: d[0], y: 1_000 + (d[0] % 500) })),
        yAxis: 1,
      },
      ...layers.map((l) => {
        const spec = specOf(l.id)!
        const ownIdx = own.findIndex((o) => o.key === l.key)
        return {
          type: l.id,
          id: `ind-${l.key}`,
          linkedTo: 'candles',
          yAxis: spec.pane === 'own' ? 2 + ownIdx : 0,
          color: l.color,
          params:
            l.id === 'obv' || l.id === 'vbp'
              ? { ...l.params, volumeSeriesID: VOLUME_SERIES_ID }
              : l.params,
          dataGrouping: { enabled: false },
        }
      }),
    ],
  } as Highcharts.Options)

  return { chart, layers, cleanup: () => chart.destroy() }
}

describe('보조지표 사전', () => {
  it('사전의 모든 타입이 Highcharts 에 등록돼 있다', () => {
    const registry = Object.keys(
      (Highcharts as unknown as { seriesTypes: Record<string, unknown> })
        .seriesTypes,
    )
    const missing = INDICATORS.filter((d) => !registry.includes(d.id))
    expect(missing.map((d) => d.id)).toEqual([])
  })

  // 지표마다 «점이 실제로 나오는지»를 잰다. 0개면 조용히 실패한 것이다
  for (const spec of INDICATORS) {
    it(`${spec.label}(${spec.id}) 가 점을 만든다`, () => {
      const { chart, layers, cleanup } = render([spec.id])
      const s = chart.get(`ind-${layers[0].key}`) as
        | Highcharts.Series
        | undefined
      expect(s, '시리즈가 안 만들어졌다').toBeTruthy()
      expect(s!.points.length, '점이 0개다').toBeGreaterThan(0)
      cleanup()
    })
  }

  it('파라미터가 실제로 지표에 «먹는다»', () => {
    // SMA 20 과 SMA 200 은 시작 지점이 달라야 한다 — 같으면 기간이 무시된 것이다
    const short = render(['sma'])
    const long = render(['sma'])
    const sSpec = specOf('sma')!
    short.layers[0].params = writeParam(short.layers[0], sSpec.params[0], 20)
    long.layers[0].params = writeParam(long.layers[0], sSpec.params[0], 200)
    short.cleanup()
    long.cleanup()

    const a = render(['sma'])
    const s1 = a.chart.get(`ind-${a.layers[0].key}`) as Highcharts.Series
    const before = s1.points.length
    s1.update({
      type: 'sma',
      params: { period: 200 },
    } as Highcharts.SeriesOptionsType)
    expect(s1.points.length, '기간을 늘렸는데 점 수가 그대로다').toBeLessThan(
      before,
    )
    a.cleanup()
  })

  it('스토캐스틱의 %K 는 배열 자리에 들어간다', () => {
    const spec = specOf('stochastic')!
    const l = makeLayer(spec)
    expect(l.params.periods).toEqual([14, 3])

    const next = writeParam(l, spec.params[0], 21)
    expect(next.periods).toEqual([21, 3])
    expect(readParam({ ...l, params: next }, spec.params[0])).toBe(21)
    // ⚠️ `period` 로 새면 그 지표는 값을 «무시»한다. 그런 키가 생기면 안 된다
    expect(next).not.toHaveProperty('period')
  })

  /**
   * 칸 배치.
   *
   * ⚠️ **렌더된 좌표로는 못 잰다** — jsdom 에서 Highcharts 는 컨테이너 크기를 못 읽어
   *    `plotHeight` 가 NaN 이 된다. 그래서 «식»만 검증한다. 실제로 안 겹치는지는
   *    화면에서 봐야 한다.
   *
   * 이 검사가 있는 이유 — 픽셀로 축을 쌓으면 차트 바닥까지 꽉 차서 X축 날짜가
   * 마지막 칸 «안»에 겹쳐 그려진다. 라벨 자리를 빼 두는 걸 빠뜨렸던 적이 있다.
   */
  for (const n of [0, 1, 3]) {
    it(`칸이 안 겹치고 라벨 자리가 남는다 — 지표 ${n}개`, () => {
      const box = panes(n)
      const stack = [box.price, box.volume, ...box.own]
      expect(box.own.length).toBe(n)

      for (let i = 1; i < stack.length; i++)
        expect(
          stack[i].top,
          `${i}번 칸이 앞 칸을 파고든다`,
        ).toBeGreaterThanOrEqual(stack[i - 1].top + stack[i - 1].height)

      const last = stack[stack.length - 1]
      expect(
        box.total - (last.top + last.height),
        'X축 날짜가 설 자리가 없다 — 마지막 칸 위에 겹친다',
      ).toBeGreaterThanOrEqual(AXIS_H)
    })
  }

  it('지표를 켜도 «가격 칸»은 안 줄어든다', () => {
    // %로 나누면 지표를 켤 때마다 가격이 쪼그라든다. 픽셀로 쌓는 이유가 이것이다
    expect(panes(0).price.height).toBe(panes(3).price.height)
    expect(panes(3).total - panes(0).total).toBe(3 * IND_H)
  })

  it('OBV 는 거래량 시리즈 id 가 없으면 «차트를 통째로 터뜨린다»', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const data = candles()
    // 조용히 안 그려지는 게 «아니라» 예외가 난다. 그래서 VOLUME_SERIES_ID 가
    // 상수로 한 자리에 있어야 한다 — 오타 하나가 화면 전체를 날린다
    expect(() =>
      Highcharts.stockChart(el, {
        ...baseStockOptions({ height: 300 }),
        series: [
          { type: 'candlestick', id: 'candles', data },
          // 거래량에 id 를 «안» 준다
          { type: 'column', data: data.map((d) => ({ x: d[0], y: 1000 })) },
          { type: 'obv', id: 'x', linkedTo: 'candles' },
        ],
      } as Highcharts.Options),
    ).toThrow(/volumeSeriesID/)
  })
})
