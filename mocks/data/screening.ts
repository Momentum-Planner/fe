import { REGIMES, TREND_CONDITIONS } from '@/shared/lib/snapshots'
import type { DailyScreening } from '@/shared/lib/snapshots'
import { makeCandles, rand, seedOf } from './stocks'

/**
 * 하루치 스크리닝 판정 (`DailyScreeningResult`) 목 — **종목 × 일자로 쌓는다.**
 *
 * ⚠️ **캔들과 «같은 씨앗»을 쓴다.** 판정을 따로 난수로 만들면 봉은 오르는데
 *    「하방이탈」이 뜨는 식으로 화면이 거짓말을 한다. 계획을 세우는 화면에서
 *    근거와 그림이 어긋나면 그 화면은 아무 말도 못 하는 것이 된다.
 *
 * ⚠️ 판정이 **매일 있지는 않다.** ①-1 게이트에 걸린 날은 행이 없다 —
 *    후보가 아니었던 날이다. 화면에서 그 «빈칸»이 정보가 된다
 *    (디자인 3장 ⑤ — 「간극이 정보다」).
 */

const ENTRY_STATES = ['EARLY', 'BREAKOUT', 'PULLBACK', 'BLOCKED'] as const

/**
 * 한 종목의 판정 이력.
 *
 * 캔들을 그대로 받아 **그날 봉의 자리**로 판정을 만든다 — 최근 고점에 가까울수록
 * 돌파, 멀면 진입 불가. 그래야 띠와 차트가 같은 이야기를 한다.
 */
export function makeScreening(code: string, days = 180): DailyScreening[] {
  const seed = seedOf(code)
  const candles = makeCandles(code)
  const tail = candles.slice(-days)
  const out: DailyScreening[] = []

  tail.forEach((c, i) => {
    // 게이트에 걸린 날 — 행이 «없다». 후보가 아니었던 날이다
    if (rand(seed, i + 101) < 0.18) return

    // 최근 60봉의 고점 대비 어디인가 — 진입 상태를 이 자리가 정한다
    const from = Math.max(0, tail.indexOf(c) - 60)
    const win = tail.slice(from, tail.indexOf(c) + 1)
    const high = Math.max(...win.map((x) => x.highPrice))
    const pos = ((c.closePrice - high) / high) * 100

    const entryState =
      pos >= -1
        ? 'BREAKOUT'
        : pos >= -4
          ? 'PULLBACK'
          : pos >= -9
            ? 'EARLY'
            : 'BLOCKED'

    // 트렌드는 «대개 8/8» 이다 — ①-1 게이트가 그것을 요구한다.
    // 어긋나는 날은 드물고, 어긋나면 이름이 붙는다
    const miss = rand(seed, i + 211) < 0.15 ? 1 : 0
    const failIdx = Math.floor(rand(seed, i + 307) * TREND_CONDITIONS.length)

    out.push({
      dailyScreeningResultId: seed * 1000 + i,
      date: c.tradeDate,
      entryState: ENTRY_STATES[ENTRY_STATES.indexOf(entryState)] ?? 'BLOCKED',
      // 펀더멘털은 «천천히» 움직인다 — 분기 실적이라 날마다 안 바뀐다
      fundamentalScore: Math.min(
        7,
        Math.max(0, 3 + Math.round(rand(seed, Math.floor(i / 45) + 11) * 4)),
      ),
      damageScore: rand(seed, i + 401) < 0.08 ? 1 : 0,
      damageAt: `${c.tradeDate} 15:30`,
      entryPosition: +pos.toFixed(1),
      regime:
        REGIMES[Math.floor(rand(seed, Math.floor(i / 20) + 5) * 4)] ?? 'none',
      trendPassed: 8 - miss,
      trendFailed: miss ? [TREND_CONDITIONS[failIdx] ?? 'RS 70 이상'] : [],
    })
  })

  return out
}
