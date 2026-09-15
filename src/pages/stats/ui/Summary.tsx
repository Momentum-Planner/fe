/**
 * 요약 — **성과 넷 + 위험 넷.**
 * **선택한 기간으로 다시 계산된다.**
 *
 * ```text
 * 성과   승률 · 손익비 · 기대값 · 평균 수익률        「벌었나」
 * 위험   위험노출 · 자본 감소 · 연속 손실 · 벽 왼쪽   「무엇을 걸고 벌었나」
 * ```
 *
 * 💀 **위험 줄이 빠져 있었다** (2026-09-13에 더했다). 같은 +60만이라도 계좌의
 * 0.8%를 걸어 낸 것과 8%를 걸어 낸 것은 **다음 거래에서 살아남는 확률이
 * 다르다.** ⑧ 이 재계산하는 네 값(손절폭 상한 · 손익비 목표 · 위험노출 ·
 * 포지션 크기) 가운데 **둘이 이 줄에서 나온다** — 성과 줄만으로는 ⑧ 이
 * 돌지 않는다.
 *
 * 💀 **값마다 칸을 준다** (2026-09-15). 라벨과 숫자만 늘어놓았더니 여덟 개가
 * 한 덩어리로 흘러서, *「어디까지가 성과이고 어디부터가 위험인가」* 가 줄
 * 간격으로만 갈렸다. 칸을 주면 **2 × 2 가 2 × 2 로 보인다** — 세로로 남는
 * 높이도 칸 사이가 먹으므로 빈 데가 안 생긴다.
 *
 * ⚠️ **워터폴 오른쪽의 좁은 칸에 선다** — *「데이터를 같이 봐야 되는데 안
 *    보이잖아」*. 그래서 넷을 한 줄이 아니라 **2 × 2** 로 접었다.
 *
 * **5건~.** 미달이면 *「값을 흐리게 + 「표본 N건」」*.
 *
 * 💀 **흐림은 여기서만 쓴다.** 히트맵이 걸린 표에서 같은 규칙을 쓰면 한 행에
 * 연한 것이 두 종류가 된다 — 표본이 모자라 연한 것과, 값이 0에 가까워 옅은 것.
 *
 * 💀 **세는 값은 흐려지지 않는다.** 벽 왼쪽 · 자본 감소 · 연속 손실은 평균이
 * 아니라 «사실»이라 **1건부터 유효하다.** 같은 칸에 서 있어도 문턱이 다르다.
 */

import { MIN } from '../model/aggregate'
import type { RiskStat, Summary as Sum, WallStat } from '../model/aggregate'
import { Dash, SampleNote, pct, pct0, toneOf, won } from './parts'

export function Summary({
  s,
  wall,
  risk,
}: {
  s: Sum
  wall: WallStat
  risk: RiskStat
}) {
  const thin = s.n < MIN.avg

  return (
    <div className="flex h-full flex-col gap-4">
      <Row
        label="성과"
        note={<SampleNote n={s.n} short={Math.max(0, MIN.avg - s.n)} />}
      >
        <Kpi
          label="승률"
          value={s.n ? pct0(s.winRate) : null}
          sub={`${s.wins}승 ${s.losses}패`}
          thin={thin}
        />
        <Kpi
          label="손익비"
          value={s.payoff === null ? null : s.payoff.toFixed(2)}
          sub={`수익 ${pct(s.avgWin)} · 손실 ${pct(s.avgLoss)}`}
          thin={thin}
        />
        <Kpi
          label="기대값"
          value={s.n ? won(s.expectancy) : null}
          tone={toneOf(s.expectancy)}
          sub="매도 한 건이 남긴 평균"
          thin={thin}
        />
        <Kpi
          label="평균 수익률"
          value={s.n ? pct(s.avgReturn, 2) : null}
          tone={toneOf(s.avgReturn)}
          sub="매도 하나가 한 건"
          thin={thin}
        />
      </Row>

      <Row
        label="위험"
        note={
          <span className="font-number text-[11px] text-white/40">
            R 축 {wall.planned}건
          </span>
        }
      >
        {/**
         * 평균 위험노출 — **막지 않는다** (non-goal). 2.5% 초과는 세기만 한다.
         * 산출 못 한 건수는 «비운다» — 0 으로 채우면 평균이 낮아 보인다.
         */}
        <Kpi
          label="평균 위험노출"
          value={
            risk.avgRiskPct === null ? null : `${risk.avgRiskPct.toFixed(2)}%`
          }
          tone={
            (risk.avgRiskPct ?? 0) > 2.5 ? 'text-brand-yellow' : 'text-white/90'
          }
          sub={`2.5% 초과 ${risk.overCount}건 · 최대 ${risk.maxRiskPct?.toFixed(2) ?? '—'}%`}
          foot={
            risk.unknownRisk ? `산출 불가 ${risk.unknownRisk}건` : undefined
          }
          thin={thin}
        />
        <Kpi
          label="자본 감소"
          value={risk.maxDrawdown ? won(-risk.maxDrawdown) : '0'}
          tone={risk.maxDrawdown ? 'text-candle-down' : 'text-white/90'}
          sub={`고점 대비 최대${risk.maxDrawdownAt ? ` · ${risk.maxDrawdownAt}` : ''}`}
          foot={`지금 ${risk.currentDrawdown ? won(-risk.currentDrawdown) : '고점'}`}
          fact
        />
        <Kpi
          label="연속 손실"
          value={`${risk.lossStreak}건`}
          tone={risk.lossStreak >= 4 ? 'text-brand-yellow' : 'text-white/90'}
          sub="가장 길게 이어진 손실"
          foot={`지금 ${risk.currentStreak}건째`}
          fact
        />
        {/**
         * 벽(−1R) 왼쪽 — **계획한 손절폭보다 크게 잃은 매도.**
         * 옆에 **R 평균**을 붙인다. *「1R 을 몇 번 걸어 몇 R 을 벌었나」* 는
         * 손절폭이 계획마다 달라도 같은 자로 재는 값이다.
         */}
        <Kpi
          label="벽 왼쪽"
          value={`${wall.wallBreaks}건`}
          tone={wall.wallBreaks > 0 ? 'text-brand-yellow' : 'text-white/90'}
          sub="손절폭보다 크게 잃음"
          foot={`R 평균 ${
            wall.avgR === null
              ? '—'
              : `${wall.avgR > 0 ? '+' : wall.avgR < 0 ? '−' : ''}${Math.abs(wall.avgR).toFixed(2)}R`
          }`}
          fact
        />
      </Row>

      {wall.unplanned > 0 && (
        <p className="border-brand-yellow/30 m-0 border-l-2 pl-2.5 text-[11px] leading-relaxed text-white/40">
          계획 없는 매매{' '}
          <span className="font-number text-white/70">{wall.unplanned}건</span>
          은 1R이 없어 «벽 왼쪽»과 «R 평균» 셈에 없습니다 — 나머지에는 올라가
          있습니다.
        </p>
      )}
    </div>
  )
}

/** 묶음 하나. 이름과 표본이 **가는 선 하나로** 갈린다 */
function Row({
  label,
  note,
  children,
}: {
  label: string
  note: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className="text-[12px] text-white/60">{label}</span>
        <i className="h-px flex-1 bg-white/10" />
        {note}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-1.5">{children}</div>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  foot,
  tone = 'text-white/90',
  thin,
  fact,
}: {
  label: string
  value: string | null
  sub: string
  /** 둘째 줄 — 「지금」처럼 시점이 다른 값 */
  foot?: string
  tone?: string
  /** 5건 미만 — 값을 흐리게 둔다. **지우지는 않는다** */
  thin?: boolean
  /** 세는 값이라 문턱이 «1건»이다 — 흐려지지 않는다 */
  fact?: boolean
}) {
  const dim = !fact && thin

  return (
    <div className="rounded-md bg-white/4 px-3 py-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-white/45">{label}</span>
        <span
          className={`t-stat text-[22px] ${tone} ${dim ? 'opacity-30' : ''}`}
        >
          {value ?? <Dash />}
        </span>
        <span
          className={`text-[10.5px] leading-snug text-white/35 ${dim ? 'opacity-50' : ''}`}
        >
          {dim ? '표본이 5건 아래입니다' : sub}
        </span>
        {!dim && foot && (
          <span className="font-number text-[10.5px] text-white/25">
            {foot}
          </span>
        )}
      </div>
    </div>
  )
}
