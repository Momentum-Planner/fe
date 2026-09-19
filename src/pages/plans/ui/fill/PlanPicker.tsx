import { cn } from '@/shared/lib/cn'
import { PLAN_STATUS_LABEL, usePlanList } from '@/entities/plan'
import type { PlanListItem, PlanStatus } from '@/entities/plan'
import type { TradeSide } from '@/entities/tradeRecord'

/**
 * 체결에 붙일 계획 고르기.
 *
 * 후보 (⑥) — 같은 종목 · 대기 또는 실행 중 · **체결일보다 먼저 세운 계획**.
 * 산 날 세운 계획을 받으면 급조한 계획이 「계획대로」로 세어진다.
 * 후보가 아닌 계획도 «이유와 함께» 남긴다 (4장 ⑤). 흐림은 「못 누른다」다.
 */
const DOT: Record<PlanStatus, string> = {
  RUNNING: 'bg-brand-red',
  PLANNED: 'bg-brand-blue',
  DONE: 'bg-white/30',
  CLOSED: 'bg-white/20',
}

export interface FillLike {
  stockCode: string
  side: TradeSide
  /** 체결일 `YYYY-MM-DD` */
  filledAt: string
}

export function whyNotCandidate(p: PlanListItem, f: FillLike): string | null {
  if (p.status === 'CLOSED') return '폐기한 계획'
  if (p.status === 'DONE') return '실행 완료'
  if (f.side === 'SELL' && p.status === 'PLANNED')
    return '매도는 실행 중 계획에만 붙는다'
  if (p.writtenAt === f.filledAt)
    return '체결일에 세운 계획 — 급조한 계획이 「계획대로」로 세어진다'
  if (p.writtenAt > f.filledAt) return '체결일 뒤에 세운 계획'
  return null
}

/** 고른 마디 — 계획 id · 「계획에 없음」 · 아직 안 고름 */
export type Pick = number | 'NONE' | null

/**
 * **고를 수 있는 계획만 한 줄씩** — 폼에서 쓰는 고르기 (Q23 · 체결 폼 다시 짜기 가).
 *
 * 💀 사슬 그림(→) 은 440px 칸에서 어지러웠고, 못 고르는 끝난 계획이 사유와 함께 일곱 줄씩 자리를 먹었다.
 *    폼에서 필요한 건 순서가 아니라 고르기다 — 순서(사슬) 는 계획 화면이 보여 준다.
 * 실행 중 먼저 · 대기는 최근 순 · 맨 끝에 「계획에 없음」.
 */
export function PlanPickList({
  fill,
  pick,
  onPick,
}: {
  fill: FillLike
  pick: Pick
  onPick: (p: Pick) => void
}) {
  const { data: plans = [], isLoading } = usePlanList({})
  const ok = plans
    .filter(
      (p) =>
        p.stockCode === fill.stockCode && whyNotCandidate(p, fill) === null,
    )
    .sort(
      (a, b) =>
        Number(b.status === 'RUNNING') - Number(a.status === 'RUNNING') ||
        b.writtenAt.localeCompare(a.writtenAt),
    )

  if (isLoading)
    return <div className="py-2 text-[11px] text-white/35">불러오는 중…</div>

  const row = (on: boolean) =>
    cn(
      'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors',
      on
        ? 'bg-white/[0.1] text-white ring-1 ring-white/45'
        : 'text-white/80 hover:bg-white/[0.05]',
    )

  return (
    <div
      role="radiogroup"
      aria-label="어느 계획"
      className="flex flex-col gap-1"
    >
      {ok.map((p) => (
        <button
          key={p.planId}
          type="button"
          role="radio"
          aria-checked={pick === p.planId}
          onClick={() => onPick(p.planId)}
          className={row(pick === p.planId)}
        >
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', DOT[p.status])}
          />
          <span className="min-w-0 flex-1 truncate">{p.title}</span>
          <span className="shrink-0 text-[11px] text-white/45">
            {PLAN_STATUS_LABEL[p.status]}
          </span>
        </button>
      ))}
      <button
        type="button"
        role="radio"
        aria-checked={pick === 'NONE'}
        onClick={() => onPick('NONE')}
        className={cn(
          row(pick === 'NONE'),
          'border border-dashed border-white/20',
        )}
      >
        <span className="min-w-0 flex-1">계획에 없음</span>
        {ok.length === 0 && (
          <span className="text-[11px] text-white/40">
            붙일 수 있는 계획이 없다
          </span>
        )}
      </button>
    </div>
  )
}
