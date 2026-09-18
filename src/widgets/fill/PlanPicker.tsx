import { cn } from '@/shared/lib/cn'
import { PLAN_STATUS_LABEL, usePlanList } from '@/entities/plan'
import type { PlanListItem, PlanStatus } from '@/entities/plan'
import type { TradeSide } from '@/entities/tradeRecord'

/**
 * 체결 한 줄 밑에서 여는 «사슬 고르기» — [[Q15]] 2 에서 정한 모양을 줄 안으로 옮긴 것이다.
 *
 * ```text
 * [실행 중 돌파 130,640] → [대기 눌림 158,000]   ┊ 사슬 밖 · 계획에 없음 ┊   [붙인다]
 * ```
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
 * 사슬만 — 고르기는 밖에서 든다. 새 체결 폼(① 어느 계획을 실행했나)과
 * 원장 줄(계획 칸 ▾)이 같이 쓴다.
 */
export function PlanChainPick({
  fill,
  pick,
  onPick,
}: {
  fill: FillLike
  pick: Pick
  onPick: (p: Pick) => void
}) {
  const { data: plans = [], isLoading } = usePlanList({})
  const mine = plans.filter((p) => p.stockCode === fill.stockCode)
  const ok = mine.filter((p) => whyNotCandidate(p, fill) === null)
  const out = mine
    .map((p) => ({ p, why: whyNotCandidate(p, fill) }))
    .filter((x): x is { p: PlanListItem; why: string } => x.why !== null)
  const stem = ok.filter((p) => p.status !== 'PLANNED')
  const waits = ok.filter((p) => p.status === 'PLANNED')

  if (isLoading)
    return <div className="py-2 text-[11px] text-white/35">불러오는 중…</div>

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {ok.length === 0 && (
          <span className="text-[11px] text-white/45">
            붙일 수 있는 계획이 없다
          </span>
        )}
        {stem.map((p, i) => (
          <div key={p.planId} className="flex items-center gap-2">
            {i > 0 && <span className="text-[12px] text-white/25">→</span>}
            <Node
              p={p}
              on={pick === p.planId}
              onPick={() => onPick(p.planId)}
            />
          </div>
        ))}
        {waits.length > 0 && (
          <>
            {stem.length > 0 && (
              <span className="text-[12px] text-white/25">→</span>
            )}
            <div className="flex flex-col gap-1.5">
              {waits.map((p) => (
                <Node
                  key={p.planId}
                  p={p}
                  on={pick === p.planId}
                  onPick={() => onPick(p.planId)}
                />
              ))}
            </div>
          </>
        )}
        <span className="mx-1 h-10 w-px bg-white/10" />
        <button
          type="button"
          aria-pressed={pick === 'NONE'}
          onClick={() => onPick('NONE')}
          className={cn(
            'rounded-[10px] border border-dashed px-2.5 py-1.5 text-left text-[11px] transition-colors',
            pick === 'NONE'
              ? 'border-white/60 bg-white/[0.06] text-white'
              : 'border-white/20 text-white/50 hover:border-white/40',
          )}
        >
          <span className="block text-[10px] opacity-70">사슬 밖</span>
          계획에 없음
        </button>
      </div>
      {out.length > 0 && (
        <div className="flex flex-col gap-0.5 text-[11px] text-white/30">
          {out.map(({ p, why }) => (
            <span key={p.planId}>
              <span className="text-white/50">{p.title}</span> — {why}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Node({
  p,
  on,
  onPick,
}: {
  p: PlanListItem
  on: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={cn(
        'bg-bg-elevated block min-w-[150px] rounded-[10px] border px-2.5 py-1.5 text-left transition-colors',
        on
          ? 'border-white/60 ring-1 ring-white/30'
          : 'border-border-default hover:border-white/40',
      )}
    >
      <span className="flex items-center gap-1.5 text-[10px] text-white/40">
        <span className={cn('h-1.5 w-1.5 rounded-full', DOT[p.status])} />
        <span className="font-number">{p.writtenAt.slice(5)}</span>
        <span>· {PLAN_STATUS_LABEL[p.status]}</span>
      </span>
      <span
        className={cn(
          'block truncate text-[12px]',
          on ? 'font-bold text-white' : 'text-white/80',
        )}
      >
        {p.title}
      </span>
    </button>
  )
}
