import { describe, expect, it } from 'vitest'
import { SAMPLE_MIN, opened, shortBy } from './gate'

describe('표본 경계', () => {
  it('1건이면 사실만 열린다', () => {
    expect(opened(1, 'FACT')).toBe(true)
    expect(opened(1, 'AVG')).toBe(false)
    expect(opened(1, 'SHAPE')).toBe(false)
    expect(opened(1, 'SPLIT')).toBe(false)
  })

  it('0건이면 사실조차 닫힌다 — 벽 침범도 셀 것이 없다', () => {
    expect(opened(0, 'FACT')).toBe(false)
  })

  it('경계값 자체는 «열린» 쪽이다', () => {
    expect(opened(5, 'AVG')).toBe(true)
    expect(opened(10, 'SHAPE')).toBe(true)
    expect(opened(15, 'SPLIT')).toBe(true)
  })

  it('경계가 오름차순이라 층이 겹치지 않는다', () => {
    expect(SAMPLE_MIN.FACT).toBeLessThan(SAMPLE_MIN.AVG)
    expect(SAMPLE_MIN.AVG).toBeLessThan(SAMPLE_MIN.SHAPE)
    expect(SAMPLE_MIN.SHAPE).toBeLessThan(SAMPLE_MIN.SPLIT)
  })

  it('몇 건 모자란지 말한다 — 「앞으로 N건」을 화면이 쓴다', () => {
    expect(shortBy(3, 'AVG')).toBe(2)
    expect(shortBy(9, 'SPLIT')).toBe(6)
    expect(shortBy(20, 'SPLIT')).toBe(0)
  })
})
