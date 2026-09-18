import { describe, expect, it } from 'vitest'
import { parseWhole } from './NewFillForm'

describe('숫자 칸 — 소수점 뒤는 버리고 알린다 (Q23 · 10장 D)', () => {
  it.each([
    ['201500', 201500, false],
    ['201,500원', 201500, false],
    ['201,500.00', 201500, true],
    ['201500.5', 201500, true],
    ['201,500.', 201500, false],
    ['20주', 20, false],
    ['', 0, false],
  ])('%s → %d (버림 %s)', (raw, n, cut) => {
    expect(parseWhole(raw)).toEqual({ n, cut })
  })
})
