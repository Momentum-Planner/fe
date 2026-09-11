import { describe, expect, it } from 'vitest'
import {
  clampExposure,
  needCash,
  oneR,
  ownRisk,
  riskAfter,
  stopWidthPct,
} from './calc'

/**
 * 계획의 **산출값** — ④-1 의 ㉢.
 *
 * 여기 있는 것은 전부 «입력이 아니라 결과»다. 위험노출을 직접 적을 수는 없다.
 * 목과 화면이 **같은 식**을 써야 저장 전 미리보기와 저장 후 값이 안 어긋난다.
 */
const ACCOUNT = 80_000_000

describe('④-1 위험노출은 «결과»다', () => {
  it('위험노출 = 포지션 크기 × 손절폭 ÷ 계좌', () => {
    // 진입 68,200 · 손절 66,590 → 1R 1,610.  100주면 161,000
    const own = ownRisk(68_200, 66_590, 100, ACCOUNT)
    expect(own).toBeCloseTo((1_610 * 100 * 100) / ACCOUNT, 6)
  })

  it('«계좌 대비»다 — 투입금 대비가 아니다', () => {
    const a = ownRisk(68_200, 66_590, 100, ACCOUNT)
    const b = ownRisk(68_200, 66_590, 100, ACCOUNT * 2)
    // 같은 매매라도 계좌가 두 배면 «거는 비율»은 절반이다
    expect(b).toBeCloseTo(a / 2, 6)
  })

  it('실행 «후»는 지금 걸린 것 «위에» 얹는다 — 이 계획 몫만 재면 안 된다', () => {
    // ④-1 의 사다리: 1.8% 짜리 포지션에 더 사면 3.2% 가 된다
    const after = riskAfter(1.8, 68_200, 66_590, 100, ACCOUNT)
    expect(after).toBeGreaterThan(1.8)
    expect(after).toBeCloseTo(1.8 + ownRisk(68_200, 66_590, 100, ACCOUNT), 6)
  })
})

describe('위험노출의 바닥은 0 이다', () => {
  /**
   * ⚠️ **최종미지 ③-2 를 한 칸 뒤집는다** — 거기는 「0 이하가 된다」다 (2026-09-11).
   * 위험노출은 *「스톱에 걸렸을 때 원금에서 잃는 돈」*이라, 손절가가 평단 위로
   * 올라가면 **잃지 않는다** — 그러면 위험은 0 이지 「−0.4%의 위험」이 아니다.
   */
  it('실행 후가 «음수로» 내려가면 0 에서 멈춘다', () => {
    // 스톱을 진입가 위로 올려 지금 걸린 것보다 «더» 줄이는 경우
    const own = ownRisk(68_200, 71_420, 100, ACCOUNT)
    expect(own).toBeLessThan(0)
    expect(0.3 + own).toBeLessThan(0) // 자르지 않으면 음수다
    expect(riskAfter(0.3, 68_200, 71_420, 100, ACCOUNT)).toBe(0)
  })

  it('`clampExposure` 는 음수를 0 으로만 민다', () => {
    expect(clampExposure(-3)).toBe(0)
    expect(clampExposure(0)).toBe(0)
    expect(clampExposure(2.4)).toBe(2.4)
  })

  it('`ownRisk` 는 «안 자른다» — 줄이는 몫은 음수인 것이 맞다', () => {
    // 스톱 상향은 위험을 «줄인다». 잘라 버리면 아무 일도 안 한 것처럼 보인다
    expect(ownRisk(68_200, 71_420, 100, ACCOUNT)).toBeLessThan(0)
  })
})

describe('③-2-1 1R 은 진입가 − 손절가다', () => {
  it('그 계획의 최초 손절폭이 R 배수의 분모가 된다', () => {
    expect(oneR(68_200, 66_590)).toBe(1_610)
  })

  it('손절폭 %는 진입가 대비다', () => {
    expect(stopWidthPct(68_200, 66_590)).toBeCloseTo(2.36, 2)
  })

  it('진입가가 0 이면 0 이다 — 새 계획은 아직 값이 없다', () => {
    expect(stopWidthPct(0, 0)).toBe(0)
  })
})

describe('④-3 필요 현금은 계획마다 «따로»다', () => {
  it('진입 예상가 × 수량', () => {
    expect(needCash(68_200, 100)).toBe(6_820_000)
  })
})
