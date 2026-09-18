/**
 * 요약 판 — **네 칸 그리드 하나에 세 층** (Q15).
 *
 * ```text
 * [요약  기간 25년 6월 ~ 26년 4월  전체 기간]                           [표본 46건]
 * [승률      ] [손익비    ] [기대수익  ] [평균 수익률]     1순위 · 26px
 * [월별 손익과 누적 ───────────────────] [위험 셋    ]     2 · 3순위
 * [최대 수익 ─────────────] [최대 손실 ─────────────]     3순위 · 한 줄
 * ```
 *
 * 💀 **성과 넷이 맨 위** (Q15 ①). 차트 중심(가)과 번갈아 보고 골랐다.
 *
 * 💀 **네 칸이 세 층을 관통한다** (Q15 ③). 차트 세 칸 · 위험 한 칸 · 최대 둘은
 * 두 칸씩 — 칸 경계가 세로로 이어져 층이 따로 놀지 않는다.
 *
 * 💀 **기간 고르기는 차트가 아니라 판 머리줄에 있다** (Q15 ⑤). 차트는 숫자
 * «아래»라 거기서 고르면 「아래에서 고르면 위가 바뀐다」. 차트를 누르고 끄는
 * 길은 그대로 있다.
 */

import type {
  Closed,
  MonthFlow,
  Period,
  RiskStat,
  Summary as Sum,
} from '../model/aggregate'
import { MIN } from '../model/aggregate'
import { PeakTrades } from './PeakTrades'
import { PerfTiles, RiskList } from './Summary'
import { PeriodPick, Waterfall } from './Waterfall'
import { SampleNote } from './parts'

export type PlanScope = 'ALL' | 'YES' | 'NONE'
const PLAN_SCOPE_LABEL: Record<PlanScope, string> = {
  ALL: '모두',
  YES: '계획 있음',
  NONE: '계획 없음',
}

export function Overview({
  planScope,
  onPlanScope,
  flow,
  period,
  onPeriod,
  sells,
  picked,
  sum,
  risk,
}: {
  planScope: PlanScope
  onPlanScope: (s: PlanScope) => void
  flow: MonthFlow[]
  period: Period | null
  onPeriod: (p: Period | null) => void
  sells: number
  picked: Closed[]
  sum: Sum
  risk: RiskStat
}) {
  return (
    <div className="card flex flex-col gap-4 px-5 py-4">
      {/**
       * **기간이 제목 바로 옆** (Q15 ⑤). 「지금 어느 기간의 숫자인가」가 이 판에서
       * 가장 먼저 알아야 할 맥락이라 첫 시선에 둔다. 고른 기간이 곧 이름이라
       * 기간 이름 글자는 따로 적지 않는다.
       */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="t-h3 m-0 text-white/90">요약</h2>
        <PeriodPick flow={flow} period={period} onPeriod={onPeriod} />
        {/* 계획 있음 · 없음 (Q22) — 「계획 있는 매매로 성과 올리기」 의 대비가 여기서 선다 */}
        <div className="flex items-center gap-0.5 rounded-md bg-white/4 p-0.5">
          {(Object.keys(PLAN_SCOPE_LABEL) as PlanScope[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={planScope === k}
              onClick={() => onPlanScope(k)}
              className={`rounded-sm px-2 py-1 text-[11px] transition ${
                planScope === k
                  ? 'bg-white/14 text-white/90'
                  : 'text-white/45 hover:bg-white/6'
              }`}
            >
              {PLAN_SCOPE_LABEL[k]}
            </button>
          ))}
        </div>
        <span className="ml-auto">
          <SampleNote n={sum.n} short={Math.max(0, MIN.avg - sum.n)} />
        </span>
      </header>

      {/**
       * **층은 선이 아니라 여백이 가른다** (Q15 ④ 근접성). 층 안은 좁게,
       * 층 사이는 넓게 — 최대 둘 위의 선을 걷었다.
       */}
      <div className="grid grid-cols-4 gap-x-4">
        <PerfTiles s={sum} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-x-4">
        <div className="col-span-3 flex flex-col gap-1">
          <div className="flex items-baseline gap-2 text-[11px]">
            <span className="text-fg-tertiary">월별 손익과 누적</span>
            <span className="text-white/30">
              막대를 누르면 그 달, 가로로 끌면 그 기간
            </span>
          </div>
          <Waterfall
            flow={flow}
            period={period}
            onPeriod={onPeriod}
            sells={sells}
            bare
          />
        </div>
        {/* 위험 셋은 차트 높이만큼 펼친다 — 아래가 비면 차트의 곁값처럼 읽혔다 (Q15 ④) */}
        <RiskList risk={risk} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-x-4">
        <PeakTrades closed={picked} />
      </div>
    </div>
  )
}
