/**
 * 최대 수익 · 최대 손실 + 그 거래의 스냅샷 — **문서가 못 박은 자리.**
 *
 * ⚠️ **카드를 벗었다** (2026-09-13). 성과·위험과 «한 묶음»으로 들어가므로
 *    이 둘은 그 카드 «안»의 한 층이다 — 카드 안에 카드를 두면 같은 묶음인지
 *    아닌지가 안 읽힌다.
 *
 * **1건부터 나온다.** 평균이 아니라 «최대»라서 표본이 한 건이어도 사실이다.
 *
 * ⚠️ **워터폴 «아래»로 내려가고 기간 선택에 반응한다** (2026-09-13).
 *    「최대」라는 말은 **범위를 적으면 유지된다** — 카드 머리줄이
 *    「25년 10월 ~ 25년 12월」을 들고 있으므로 무엇의 최대인지가 남는다.
 *
 * ⚠️ **차트와 «같은 카드 안»에서 아래로 눕는다** (2026-09-14). 요약(성과·위험)은 오른쪽
 *    좁은 칸에 남고 이 둘만 내려왔다 — 최대 둘은 **한 거래의 이야기**라
 *    종목명·스냅샷 열 줄이 딸려 오는데, 그것이 지표 여덟과 같은 칸에 서면
 *    「숫자 여덟 개」 사이에 「문장 둘」이 낀 모양이 된다. 차트가 「언제」를
 *    말하고 바로 아래에서 「그중 가장 큰 둘」을 말하는 순서가 맞다.
 */

import type { TradeSnapshot } from '@/entities/tradeRecord'
import { ENTRY_STATE_LABEL, REGIME_LABEL } from '@/shared/lib/snapshots'
import type { Closed } from '../model/aggregate'
import { Dash, pct, toneOf, won } from './parts'

export function PeakTrades({
  closed,
  range,
}: {
  closed: Closed[]
  /** 「무엇의» 최대인가 — 기간이 안 적히면 «최대»가 무의미해진다 */
  range: string
}) {
  // 기간을 좁히면 «한 건도 없는» 구간이 생긴다. 빈 카드 둘을 띄우지 않는다
  if (closed.length === 0)
    return (
      <p className="m-0 py-2 text-[12px] text-white/45">
        이 기간에 매도한 거래가 없습니다.
      </p>
    )

  const sorted = [...closed].sort(
    (a, b) => b.derived.returnPct - a.derived.returnPct,
  )

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-0 md:divide-x md:divide-white/8">
      <Peak label="최대 수익" range={range} rec={sorted[0]!} />
      <Peak label="최대 손실" range={range} rec={sorted[sorted.length - 1]!} />
    </div>
  )
}

function Peak({
  label,
  range,
  rec,
}: {
  label: string
  range: string
  rec: Closed
}) {
  const d = rec.derived
  const up = d.returnPct > 0

  return (
    <div className="flex flex-col gap-2 md:not-first:pl-5">
      <header className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={`font-number text-[11px] ${up ? 'text-candle-up' : 'text-candle-down'}`}
        >
          {label}
        </span>
        <span className="font-number text-[11px] text-white/30">{range}</span>
        <span className="font-number ml-auto text-[11px] text-white/30">
          {rec.filledAt} · {rec.planTitle ?? '계획에 없음'}
        </span>
      </header>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="t-h3 text-white/90">{rec.stockName}</span>
        <span className="font-number text-[11px] text-white/30">
          {rec.stockCode}
        </span>
        <span className={`t-stat ml-auto text-[26px] ${toneOf(d.returnPct)}`}>
          {pct(d.returnPct)}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
        <Fig k="손익금액" v={won(d.profit)} tone={toneOf(d.profit)} />
        <Fig
          k="R배수"
          v={d.rMultiple === null ? null : `${d.rMultiple.toFixed(2)}R`}
          tone={d.rMultiple === null ? '' : toneOf(d.rMultiple)}
        />
        <Fig k="보유" v={`${d.holdingDays}일`} />
        <Fig
          k="위험노출"
          v={d.riskPct === null ? null : `${d.riskPct}%`}
          tone={
            d.riskPct !== null && d.riskPct > 2.5 ? 'text-brand-yellow' : ''
          }
        />
      </div>

      {/** **스냅샷은 사후에 못 만든다** (F4) — 「무슨 근거로 샀나」가 붙는다 */}
      <Snapshot snap={rec.snapshot} />
    </div>
  )
}

const Fig = ({
  k,
  v,
  tone = '',
}: {
  k: string
  v: string | null
  tone?: string
}) => (
  <span className="text-white/35">
    {k}{' '}
    <span className={`font-number ml-0.5 ${tone || 'text-white/80'}`}>
      {v ?? <Dash />}
    </span>
  </span>
)

function Snapshot({ snap }: { snap: TradeSnapshot | null }) {
  if (!snap)
    return (
      <p className="m-0 border-t border-white/8 pt-2 text-[11px] text-white/30">
        진입 시점 스냅샷이 없습니다 — 사후에 만들지 않습니다.
      </p>
    )

  const items: [string, string, boolean?][] = [
    ['레짐', REGIME_LABEL[snap.regime]],
    ['진입', ENTRY_STATE_LABEL[snap.entryState]],
    ['트렌드', `${snap.trendPassed}/8`, snap.trendPassed < 8],
    ['베이스', `${snap.baseNo}`],
    ['VCP', snap.vcp ? '있음' : '없음'],
    ['펀더', `${snap.fundamentalScore}/7`],
    ['훼손', `${snap.damageScore}`, snap.damageScore > 0],
    ['진입 위치', `${snap.entryPosition}%`],
  ]

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-white/8 pt-2 text-[11px]">
      <span className="font-number text-white/25">스냅샷 {snap.date}</span>
      {items.map(([k, v, warn]) => (
        <span key={k} className="text-white/35">
          {k}{' '}
          <span
            className={`font-number ml-0.5 ${warn ? 'text-brand-yellow/90' : 'text-white/75'}`}
          >
            {v}
          </span>
        </span>
      ))}
      {snap.trendFailed.length > 0 && (
        <span className="text-brand-yellow/70">
          어긴 조건 {snap.trendFailed.join(' · ')}
        </span>
      )}
    </div>
  )
}
