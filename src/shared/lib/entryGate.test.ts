import { describe, expect, it } from 'vitest'
import { REGIMES, entryGate } from './snapshots'
import type { EntryState, Regime } from './snapshots'

/**
 * 진입 관문 — 레짐과 진입 상태를 «한 뱃지»로 섞은 것 (2026-09-16).
 *
 * 여기서 확인하는 것은 **여섯 칸이 실제로 여섯으로 떨어지는가**다.
 * 화면에서 뱃지 둘을 하나로 줄인 근거가 이것이라, 섞는 규칙이 무너지면
 * 「돌파성공 옆의 돌파」 문제가 조용히 돌아온다.
 *
 * ⚠️ **목에 `BLOCKED` 이 한 건도 없다** — 화면으로는 진입 불가 세 칸을 못 본다.
 *    그래서 여기서 본다.
 */
describe('진입 관문', () => {
  const BUYABLE: EntryState[] = ['EARLY', 'BREAKOUT', 'PULLBACK']

  it('살 수 있는 셋은 «진입 상태»가 뒤에 온다', () => {
    const got = BUYABLE.map((e) => entryGate(e, 'start'))
    expect(got.map((g) => `${g.head} · ${g.detail}`)).toEqual([
      '진입 가능 · 조기',
      '진입 가능 · 돌파',
      '진입 가능 · 눌림',
    ])
    expect(got.every((g) => g.ok)).toBe(true)
  })

  it('못 살 때는 «레짐»이 뒤에 와서 까닭이 된다', () => {
    expect(entryGate('BLOCKED', 'fail').detail).toBe('돌파실패')
    expect(entryGate('BLOCKED', 'drop').detail).toBe('하방이탈')
    expect(entryGate('BLOCKED', 'none').detail).toBe('방향미정')
    expect(entryGate('BLOCKED', 'fail').ok).toBe(false)
  })

  /**
   * **레짐은 살 수 있을 때 화면에서 빠진다.** 이것이 이 섞기의 «대가»다 —
   * 「돌파성공」과 「돌파준비」가 진입 가능일 때는 안 보인다.
   * 뒤집고 싶으면 이 테스트가 먼저 깨져야 한다.
   */
  it('살 수 있으면 레짐이 무엇이든 뒤는 «진입 상태»다', () => {
    for (const r of REGIMES) {
      expect(entryGate('BREAKOUT', r).detail).toBe('돌파')
    }
  })

  it('여섯 칸이 서로 «겹치지 않는다» — 같은 말이 두 번 나오지 않는다', () => {
    const all = [
      ...BUYABLE.map((e) => entryGate(e, 'start')),
      ...(['fail', 'drop', 'none'] as Regime[]).map((r) =>
        entryGate('BLOCKED', r),
      ),
    ].map((g) => `${g.head} · ${g.detail}`)
    expect(new Set(all).size).toBe(6)
  })
})
