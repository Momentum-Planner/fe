import { describe, expect, it } from 'vitest'
import { at as pick } from '@/shared/lib/at'
import { viewWindow } from './viewWindow'

const DAY = 86_400_000
/** 거래일 200개 — 주말을 건너뛰어 간격이 «불규칙»하다 */
const times = (() => {
  const out: number[] = []
  let t = Date.UTC(2025, 0, 6) // 월요일
  for (let i = 0; i < 200; i++) {
    out.push(t)
    t += (i + 1) % 5 === 0 ? 3 * DAY : DAY
  }
  return out
})()

const BARS = 90
/** 봉 번호 → 시각. `noUncheckedIndexedAccess` 아래서 `times[i]` 는 undefined 를 낀다 */
const bar = (i: number) => pick(times, i)
/** 시각 → 봉 번호. ordinal 축은 «봉 개수»로 자리를 잡으므로 여기서도 그렇게 센다 */
const idx = (t: number) => times.findIndex((x) => x >= t)

/**
 * 구간 안에서 앵커가 «몇 %» 지점에 서는가.
 *
 * 보이는 칸 수 = 그려진 봉 + 뒤에 붙인 «빈 봉». ordinal 축이 둘을 똑같이 한 칸으로
 * 세므로 여기서도 그렇게 재야 화면과 맞는다.
 */
const at = (anchor: number) => {
  const { from, to, padBars } = viewWindow(times, anchor, BARS)
  const slots = idx(to) - idx(from) + padBars
  return ((idx(anchor) - idx(from)) / slots) * 100
}

/** 앵커가 서는 자리 — 오른쪽 «끝» */
const ANCHOR_PCT = 100

describe('차트가 보여줄 구간', () => {
  it('계획이 오른쪽 «끝»에 선다 — 그날 본 화면이 그랬다', () => {
    expect(at(bar(100))).toBeCloseTo(ANCHOR_PCT, 0)
  })

  /**
   * 이 둘이 진짜다 — 봉 개수로만 잡으면 여기서 앵커가 끝으로 밀린다.
   * 「차트 상단 가운데로 안 온다」가 바로 이 경우였다.
   */
  it('«가장 최근» 계획도 같은 자리에 선다', () => {
    expect(at(bar(times.length - 1))).toBeCloseTo(ANCHOR_PCT, 0)
  })

  /**
   * 왼쪽은 «여유를 안 만든다» — 데이터 이전은 비어 있는 게 아니라 «없는» 것이라,
   * 자리를 만들어 주면 거짓이 된다. 그래서 첫 계획은 왼쪽 끝에 선다.
   */
  it('자리를 «옮길 수» 있다 — 0.5 면 한가운데', () => {
    const { from, to, padBars } = viewWindow(times, bar(100), BARS, 0.5)
    const slots = idx(to) - idx(from) + padBars
    expect(((100 - idx(from)) / slots) * 100).toBeCloseTo(50, 0)
  })

  it('«가장 오래된» 계획은 왼쪽 끝에서 시작한다', () => {
    const { from } = viewWindow(times, bar(0), BARS)
    expect(from).toBe(bar(0))
  })

  /**
   * ⚠️ 이것이 「날짜가 겹쳐 찍히던」 버그의 회귀 검사다.
   * `stockChart` 의 X축은 ordinal 이라 «데이터 밖» 시각을 범위로 주면 좌표 매핑이
   * 깨져 라벨이 뒤죽박죽 겹친다. 범위는 항상 실제 봉 위에 있어야 한다.
   */
  it('축 범위가 «데이터 밖»으로 나가지 않는다', () => {
    for (const t of [bar(0), bar(100), bar(199)]) {
      const { from, to } = viewWindow(times, t, BARS)
      expect(times, `min ${from} 이 봉 위에 없다`).toContain(from)
      expect(times, `max ${to} 이 봉 위에 없다`).toContain(to)
    }
  })

  /**
   * ⚠️ 여유는 «봉 수»다. `xAxis.overscroll` 은 ESM 빌드에 없어 무시되고, `max` 를
   * 데이터 밖으로 늘리면 ordinal 축이 빈 구간만 압축 없이 그려 1.4배 과해진다.
   * 값이 빈 봉을 붙이는 것만이 「정확히 n칸」을 만든다.
   */
  it('여유는 «봉 수»다 — 자리를 안쪽으로 옮겼을 때만 붙는다', () => {
    // 오른쪽 끝(기본)이면 뒤에 그릴 것이 없으므로 여유도 없다
    expect(viewWindow(times, bar(199), BARS).padBars).toBe(0)
    // 자리를 2/3 로 옮기면 뒤가 모자란 만큼 붙는다
    expect(viewWindow(times, bar(100), BARS, 2 / 3).padBars).toBe(0)
    expect(viewWindow(times, bar(199), BARS, 2 / 3).padBars).toBeGreaterThan(0)
  })

  it('데이터 밖의 날짜도 무너지지 않는다', () => {
    const future = bar(times.length - 1) + 30 * DAY
    const w = viewWindow(times, future, BARS)
    expect(w.to).toBeGreaterThan(w.from)
    expect(w.from).toBeLessThan(bar(times.length - 1))
  })

  const slots = (a: number) => {
    const { from, to, padBars } = viewWindow(times, a, BARS)
    return idx(to) - idx(from) + padBars
  }

  it('왼쪽에 봉이 충분하면 «칸 수»가 같다', () => {
    expect(slots(bar(199))).toBe(slots(bar(100)))
    expect(slots(bar(150))).toBe(slots(bar(100)))
  })

  /**
   * 데이터 시작 근처의 계획은 왼쪽이 모자라 구간이 좁아진다. **그게 사실이다** —
   * 그 이전 봉은 「비어 있는」 게 아니라 «없는» 것이라, 자리를 만들면 거짓이 된다.
   */
  it('왼쪽이 모자라면 그만큼 «좁아진다»', () => {
    expect(slots(bar(50))).toBe(50)
    expect(slots(bar(50))).toBeLessThan(slots(bar(100)))
  })

  it('봉이 없어도 안 터진다', () => {
    const w = viewWindow([], Date.UTC(2026, 0, 1), BARS)
    expect(w.to).toBeGreaterThan(w.from)
  })

  it('Q12 앵커가 마지막 봉이면 오른쪽에 빈칸을 둔다 — 새 계획이 그 자리에 그려진다', () => {
    const last = bar(199)
    expect(viewWindow(times, last, BARS, 1, 15).padBars).toBe(15)
  })

  it('Q12 과거 계획에는 빈칸을 안 붙인다 — 그 뒤에는 실제 봉이 있다', () => {
    expect(viewWindow(times, bar(100), BARS, 1, 15).padBars).toBe(0)
  })

  it('Q12 이미 세운 계획을 볼 때는 2/3 에 선다 — 그 뒤가 보인다', () => {
    const { from, to, padBars } = viewWindow(times, bar(100), BARS, 2 / 3)
    const cells = idx(to) - idx(from) + padBars
    expect(((100 - idx(from)) / cells) * 100).toBeCloseTo(66.7, 0)
  })
})
