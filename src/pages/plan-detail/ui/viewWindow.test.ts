import { describe, expect, it } from 'vitest'
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
/**
 * 구간 안에서 앵커가 «몇 %» 지점에 서는가.
 * 오른쪽 여유(`overscroll`)까지 더한 «보이는 폭» 기준이어야 실제 화면과 같다.
 */
const at = (anchor: number) => {
  const { from, to, overscroll } = viewWindow(times, anchor, BARS)
  return ((anchor - from) / (to + overscroll - from)) * 100
}

describe('차트가 보여줄 구간', () => {
  it('가운데의 계획은 한가운데에 선다', () => {
    expect(at(times[100])).toBeCloseTo(50, 0)
  })

  /**
   * 이 둘이 진짜다 — 봉 개수로만 잡으면 여기서 앵커가 끝으로 밀린다.
   * 「차트 상단 가운데로 안 온다」가 바로 이 경우였다.
   */
  it('«가장 최근» 계획도 한가운데에 선다', () => {
    expect(at(times[times.length - 1])).toBeCloseTo(50, 0)
  })

  /**
   * 왼쪽은 «여유를 안 만든다» — 데이터 이전은 비어 있는 게 아니라 «없는» 것이라,
   * 자리를 만들어 주면 거짓이 된다. 그래서 첫 계획은 왼쪽 끝에 선다.
   */
  it('«가장 오래된» 계획은 왼쪽 끝에서 시작한다', () => {
    const { from } = viewWindow(times, times[0], BARS)
    expect(from).toBe(times[0])
  })

  /**
   * ⚠️ 이것이 「날짜가 겹쳐 찍히던」 버그의 회귀 검사다.
   * `stockChart` 의 X축은 ordinal 이라 «데이터 밖» 시각을 범위로 주면 좌표 매핑이
   * 깨져 라벨이 뒤죽박죽 겹친다. 범위는 항상 실제 봉 위에 있어야 한다.
   */
  it('축 범위가 «데이터 밖»으로 나가지 않는다', () => {
    for (const t of [times[0], times[100], times[199]]) {
      const { from, to } = viewWindow(times, t, BARS)
      expect(times, `min ${from} 이 봉 위에 없다`).toContain(from)
      expect(times, `max ${to} 이 봉 위에 없다`).toContain(to)
    }
  })

  it('오른쪽이 모자라면 «여유»로 채운다', () => {
    expect(viewWindow(times, times[100], BARS).overscroll).toBe(0)
    expect(viewWindow(times, times[199], BARS).overscroll).toBeGreaterThan(0)
  })

  it('데이터 밖의 날짜도 무너지지 않는다', () => {
    const future = times[times.length - 1] + 30 * DAY
    const w = viewWindow(times, future, BARS)
    expect(w.to).toBeGreaterThan(w.from)
    expect(w.from).toBeLessThan(times[times.length - 1])
  })

  it('구간의 «너비»가 대체로 일정하다', () => {
    const w = (a: number) => {
      const { from, to, overscroll } = viewWindow(times, a, BARS)
      return to + overscroll - from
    }
    const mid = w(times[100])
    for (const t of [times[199], times[50]])
      expect(
        Math.abs(w(t) - mid) / mid,
        '구간 너비가 자리마다 들쭉날쭉하다',
      ).toBeLessThan(0.35)
  })

  it('봉이 없어도 안 터진다', () => {
    const w = viewWindow([], Date.UTC(2026, 0, 1), BARS)
    expect(w.to).toBeGreaterThan(w.from)
  })
})
