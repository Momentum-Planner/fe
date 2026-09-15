/**
 * 요약 — **성과 넷 + 위험 넷.**
 *
 * ```text
 * 성과   승률 · 손익비 · 기대값 · 평균 수익률        「벌었나」
 * 위험   위험노출 · 자본 감소 · 연속 손실 · 벽 왼쪽   「무엇을 걸고 벌었나」
 * ```
 *
 * ⚠️ **최대 둘은 차트 아래로 갔다** (2026-09-14) — 한 거래의 이야기라
 *    종목명과 스냅샷 열 줄이 딸려 오고, 그것이 지표 여덟과 같은 칸에 서면
 *    「숫자 여덟」 사이에 「문장 둘」이 낀 모양이 된다.
 *
 * 💀 **둘을 한 카드로 묶었다.** 같은 기간의 같은 매도 집합을 다른 각도로 접은
 * 것이라, 카드 두 장으로 흩어 두면 「어디까지가 한 기간의 이야기인가」를
 * 카드마다 다시 읽어야 한다. 머리줄의 기간 하나가 아래 여덟 값을 설명한다.
 *
 * 💀 **워터폴 «옆»에 선다** (2026-09-14) — *「데이터를 같이 봐야 되는데 안
 * 보이잖아」*. 위아래로 두면 달을 고르는 손과 값이 바뀌는 자리가 한 화면에
 * 안 들어와서, 고르고 → 스크롤하고 → 읽고를 반복해야 했다. **고르는 곳과
 * 바뀌는 곳이 같은 판에 있어야 한다.**
 */

import type { RiskStat, Summary as Sum, WallStat } from '../model/aggregate'
import { Summary } from './Summary'

export function Overview({
  sum,
  wall,
  risk,
  range,
}: {
  sum: Sum
  wall: WallStat
  risk: RiskStat
  range: string
}) {
  return (
    <div className="card flex h-full flex-col gap-4 px-5 py-4">
      <header className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="t-h3 m-0 text-white/90">요약</h2>
        <span className="font-number text-[11px] text-white/40">{range}</span>
        <span className="ml-auto text-[11px] text-white/25">
          왼쪽에서 기간을 고르면 다시 계산됩니다
        </span>
      </header>

      <div className="flex-1">
        <Summary s={sum} wall={wall} risk={risk} />
      </div>
    </div>
  )
}
