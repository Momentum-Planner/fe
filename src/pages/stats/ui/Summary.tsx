/**
 * 요약의 두 층 — **성과 넷은 칸으로 크게, 위험 넷은 목록으로 작게** (Q15 ①②).
 *
 * ```text
 * 1순위  성과   승률 · 손익비 · 기대수익 · 평균 수익률     26px · 칸 배경
 * 3순위  위험   평균 위험노출 · 자본 감소 · 연속 손실   13px · 목록
 * ```
 *
 * 💀 **성과가 1순위다** (Q15 ①). ⑧ 이 계획으로 되돌려 주는 값이라 「계획을
 * 보완한다」 와 곧바로 이어진다. 사용자가 차트 중심 목업과 번갈아 보고 골랐다.
 *
 * 💀 **설명 두 줄을 걷었다** (Q15 ① · [[fe-list-shows-only-key]]). 「23승 23패」 ·
 * 「매도 한 건이 남긴 평균」 · 「지금 N건째」 가 여덟 칸마다 붙어 숫자 열 개가
 * 같은 무게로 섰다. 세부는 툴팁으로 남긴다 — 되묻는 사람에게만.
 *
 * **5건~.** 미달이면 값을 흐리게 둔다. **세는 값(위험 셋)은 1건부터 사실이라
 * 흐려지지 않는다.**
 *
 * 색은 **부호대로** (Q15 ②) — 거래 기록과 같은 「빨강 = 이익」. 위험의 노랑은
 * 경고 구간(2.5% 초과 · 연속 손실 4건 이상)이다.
 *
 * 💀 **「벽 왼쪽」 을 뺐다** (Q15 ⑥) — 사용자 *「이거는 필요 없거든」*. 「기대값」 은
 * 「기대수익」 으로 이름을 바꿨다.
 */

import { MIN } from '../model/aggregate'
import type { RiskStat, Summary as Sum } from '../model/aggregate'
import { Dash, pct, pct0, toneOf, won } from './parts'

export function PerfTiles({ s }: { s: Sum }) {
  const thin = s.n < MIN.avg

  return (
    <>
      <Tile
        label="승률"
        value={s.n ? pct0(s.winRate) : null}
        tip={`${s.wins}승 ${s.losses}패`}
        thin={thin}
      />
      <Tile
        label="손익비"
        value={s.payoff === null ? null : s.payoff.toFixed(2)}
        tip={`평균 수익 ${pct(s.avgWin)} · 평균 손실 ${pct(s.avgLoss)}`}
        thin={thin}
      />
      <Tile
        label="기대수익"
        value={s.n ? won(s.expectancy) : null}
        tone={toneOf(s.expectancy)}
        tip="매도 한 건이 남긴 평균"
        thin={thin}
      />
      <Tile
        label="평균 수익률"
        value={s.n ? pct(s.avgReturn, 2) : null}
        tone={toneOf(s.avgReturn)}
        tip="매도 하나가 한 건"
        thin={thin}
      />
    </>
  )
}

function Tile({
  label,
  value,
  tip,
  tone = 'text-white/90',
  thin,
}: {
  label: string
  value: string | null
  tip: string
  tone?: string
  /** 5건 미만 — 값을 흐리게 둔다. **지우지는 않는다** */
  thin?: boolean
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-md bg-white/4 px-3.5 py-3"
      title={thin ? '표본이 5건 아래입니다' : tip}
    >
      <span className="text-fg-tertiary text-[11px]">{label}</span>
      <span
        className={`t-stat t-num text-[26px] ${tone} ${thin ? 'opacity-30' : ''}`}
      >
        {value ?? <Dash />}
      </span>
    </div>
  )
}

/**
 * 위험 셋 — **작은 칸을 세로로** (Q15 ⑦). 성과 넷과 같은 모양의 칸이라 「같은
 * 판의 숫자」로 읽히고, 차트 높이를 셋이 나눠 가져 빈 곳이 없다.
 *
 * 값 22px · 맥락 **한 줄만** — 늘 보는 이유가 있는 말로. 나머지는 툴팁.
 */
export function RiskList({ risk }: { risk: RiskStat }) {
  const rows: {
    k: string
    v: string | null
    tone: string
    note: React.ReactNode
    tip: string
  }[] = [
    {
      k: '평균 위험노출',
      v: risk.avgRiskPct === null ? null : `${risk.avgRiskPct.toFixed(2)}%`,
      tone:
        (risk.avgRiskPct ?? 0) > 2.5 ? 'text-brand-yellow' : 'text-fg-primary',
      note: (
        <>
          2.5% 초과{' '}
          <span className={risk.overCount ? 'text-brand-yellow' : ''}>
            {risk.overCount}건
          </span>
        </>
      ),
      tip: `최대 ${risk.maxRiskPct?.toFixed(2) ?? '—'}%${
        risk.unknownRisk ? ` · 산출 불가 ${risk.unknownRisk}건` : ''
      }`,
    },
    {
      k: '자본 감소',
      v: risk.maxDrawdown ? won(-risk.maxDrawdown) : '0',
      tone: risk.maxDrawdown ? 'text-candle-down' : 'text-fg-primary',
      note: risk.currentDrawdown
        ? `지금 ${won(-risk.currentDrawdown)}`
        : '지금은 고점',
      tip: `고점 대비 최대${risk.maxDrawdownAt ? ` · 바닥 ${risk.maxDrawdownAt}` : ''}`,
    },
    {
      k: '연속 손실',
      v: `${risk.lossStreak}건`,
      tone: risk.lossStreak >= 4 ? 'text-brand-yellow' : 'text-fg-primary',
      note: `지금 ${risk.currentStreak}건째`,
      tip: '가장 길게 이어진 손실',
    },
  ]

  return (
    <div className="flex h-full flex-col gap-2 pb-6">
      <span className="text-fg-tertiary text-[11px]">위험</span>
      {rows.map((r) => (
        <div
          key={r.k}
          title={r.tip}
          className="flex flex-1 flex-col justify-center gap-0.5 rounded-md bg-white/4 px-3.5 py-2"
        >
          <span className="text-fg-tertiary text-[11px]">{r.k}</span>
          <span className={`t-stat t-num text-[22px] ${r.tone}`}>
            {r.v ?? <Dash />}
          </span>
          <span className="t-num text-fg-tertiary text-[11px]">{r.note}</span>
        </div>
      ))}
    </div>
  )
}
