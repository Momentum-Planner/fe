import { describe, expect, it } from 'vitest'
import { PLANS } from 'mocks/data/plans'
import { makeCandles } from 'mocks/data/stocks'
import { viewWindow } from './viewWindow'

/**
 * **계획 선이 차트에 얹히는지** 본다.
 *
 * 💀 이 테스트가 없을 때 14개 계획 «전부» 진입선·스톱선·후보 선이 차트 밖에
 * 있었다 — 재 보니 후보 선이 `0/5` 였다. 목의 캔들은 씨앗에서 40,000~100,000원으로
 * 나는데 SK하이닉스 계획의 진입가는 890,000~1,260,000원이라 **10배 넘게** 떨어져
 * 있었다. 선은 그려지고 있었고 에러도 없었고, 그냥 y축 범위 밖이라 안 보였다.
 *
 * 차트를 보고 계획을 세우라는 화면에서 «계획이 차트에 없었다».
 *
 * ⚠️ 축의 `softMin/softMax` 가 선을 품게 하므로 (`PlanChart.tsx`) 선이 봉 밖으로
 *    조금 나가는 것은 정상이다 — 매도 계획의 익절가는 고가 «위»에 있다.
 *    여기서 잡는 것은 그것이 아니라 **자릿수가 어긋나는 것**이다. 그러면 봉이
 *    한쪽 끝에 눌린 실오라기가 되어 차트가 아무 말도 못 한다.
 */

/** 보이는 구간을 이만큼 늘린 범위 안에 있어야 한다 — 「같은 동네」의 기준 */
const SLACK = 0.2

describe('계획 선과 캔들이 같은 자리에 있다', () => {
  const rows = PLANS.map((p) => {
    const candles = makeCandles(p.stockCode)
    const times = candles.map((c) => new Date(c.tradeDate).getTime())
    const w = viewWindow(times, new Date(p.writtenAt).getTime(), 180)
    const visible = candles.filter((c) => {
      const t = new Date(c.tradeDate).getTime()
      return t >= w.from && t <= w.to
    })
    const lo = Math.min(...visible.map((c) => c.lowPrice))
    const hi = Math.max(...visible.map((c) => c.highPrice))
    const pad = (hi - lo) * SLACK
    return { plan: p, lo: lo - pad, hi: hi + pad }
  })

  it.each(rows)(
    '계획 $plan.planId ($plan.stockCode) 의 진입가·스톱가가 봉 근처에 있다',
    ({ plan, lo, hi }) => {
      expect(plan.entryPrice).toBeGreaterThan(lo)
      expect(plan.entryPrice).toBeLessThan(hi)
      expect(plan.stopPrice).toBeGreaterThan(lo)
      expect(plan.stopPrice).toBeLessThan(hi)
    },
  )

  it.each(rows)(
    '계획 $plan.planId 의 손절 후보 선이 전부 봉 근처에 있다',
    ({ plan, lo, hi }) => {
      const out = plan.stopCandidates.filter(
        (c) => c.price <= lo || c.price >= hi,
      )
      expect(out.map((c) => `${c.label} ${c.price}`)).toEqual([])
    },
  )
})
