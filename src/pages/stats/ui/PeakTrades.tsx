/**
 * 최대 수익 · 최대 손실 — **한 줄씩 · 매도 한 건의 손익(원)** (Q15 ①② ⑧).
 *
 * **1건부터 나온다.** 평균이 아니라 «최대»라서 표본이 한 건이어도 사실이다.
 *
 * 💀 **스냅샷 여덟 칸과 곁값 넷을 걷었다** (Q15 ① · [[fe-list-shows-only-key]]).
 * 한 거래의 이야기는 거래 기록의 그 줄 → 「계획 보기」 가 맡는다.
 *
 * 💀 **네 칸 그리드의 두 칸씩** (Q15 ③) — 최대 수익이 승률 · 손익비 아래,
 * 최대 손실이 기대수익 · 평균 수익률 아래에 선다.
 */

import type { Closed } from '../model/aggregate'
import { pct, toneOf, won } from './parts'

export function PeakTrades({ closed }: { closed: Closed[] }) {
  // 기간을 좁히면 «한 건도 없는» 구간이 생긴다. 빈 줄 둘을 띄우지 않는다
  if (closed.length === 0)
    return (
      <p className="col-span-4 m-0 text-[12px] text-white/45">
        이 기간에 매도한 거래가 없습니다.
      </p>
    )

  /**
   * **원 기준** (Q15 ⑧). 거래 기록이 손익 합계(원) 순이라 위아래가 「최대」를
   * 같은 자로 잰다. % 기준일 때는 최대 손실이 계획 없는 −14.5%(−101만)였고,
   * 원으로 재면 계획 있는 −255만(−1.95%)이다.
   */
  const sorted = [...closed].sort((a, b) => b.derived.profit - a.derived.profit)

  return (
    <>
      <Peak label="최대 수익" rec={sorted[0]!} />
      <Peak label="최대 손실" rec={sorted[sorted.length - 1]!} />
    </>
  )
}

function Peak({ label, rec }: { label: string; rec: Closed }) {
  const d = rec.derived
  return (
    <div
      className="col-span-2 flex items-baseline gap-x-2.5"
      title={`${rec.filledAt} · ${rec.planTitle ?? '계획에 없음'}`}
    >
      <span className="text-fg-tertiary text-[11px]">{label}</span>
      <span className="text-fg-primary truncate text-[12px] font-bold">
        {rec.stockName}
      </span>
      <span className={`t-num text-[13px] font-medium ${toneOf(d.profit)}`}>
        {won(d.profit)}
      </span>
      <span className={`t-num text-[11px] ${toneOf(d.returnPct)}`}>
        {pct(d.returnPct)}
      </span>
    </div>
  )
}
