import { Link } from '@tanstack/react-router'
import { PLAN_STATUS_LABEL, canClose, pendingGoal } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'
import { cn } from '@/shared/lib/cn'
import { attachPointId } from './spine'

/**
 * 계획 사슬 — **좁힌 사슬 한 줄** (Q12).
 *
 * ```text
 *                  직전 → 실행 중 → ┬ 대기        [⤢ 전체]  ← 카드 오른쪽 위
 *                                  ├ 대기
 *                                  └ [+ 새 계획]
 * ```
 *
 * 💀 옛 사슬은 끌어서 보는 판 · 측정해서 그리는 곡선 · 확대 · 기간 필터 · 「실행 중」「대기」
 * 찾아가기 칩까지 갖고 있었다. 마디가 열몇 개일 때의 장치들이다. 사슬을 넷 안팎으로
 * 좁히자(Q12) 전부 할 일이 없어졌고, 넓은 판 가운데 마디 넷이 흩어져 보였다.
 * 위젯에서 정한 대로 **왼쪽부터 붙은 한 줄**로 다시 세웠다.
 *
 * - 마디를 누르면 그 계획으로 간다 · 새 계획을 쓰는 중이면 옮겨 가지 않고 그 계획을 고른다
 * - 흰 테두리 하나 = 고른 계획
 * - 지난 계획(실행 완료 · 폐기)은 흐리게 · 세우는 중이면 전부 흐리게 — 올리면 원래 진하기
 * - 폐기 · 삭제는 마디에 올렸을 때 위에 뜬다. 문턱은 대기 + 체결 0건 (Q8)
 * - 「목표 3R 도착」 = 사다리 목표에 도착해 스톱 자리를 고를 차례 (Q16)
 */
export function PlanChain({
  plans,
  currentId,
  onCreate,
  creating,
  onClose,
  onRemove,
  faded = false,
  onPick,
}: {
  plans: PlanListItem[]
  /** 고른 계획 — 쓰는 중에 고른 마디를 풀면 null */
  currentId: number | null
  /** 새 계획을 세운다 — 설 자리가 곧 「무엇을 이어받나」의 답이다 */
  onCreate?: () => void
  creating?: boolean
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
  faded?: boolean
  /**
   * 있으면 마디를 눌러도 **옮겨 가지 않고** 이것을 부른다 — 새 계획을 쓰는 동안
   * 참조할 계획을 차트에 고정하는 데 쓴다. 쓰던 폼이 날아가지 않는다.
   * `false` 를 돌려주면 막지 않고 링크대로 옮겨 간다.
   */
  onPick?: (planId: number) => boolean | void
}) {
  const byDate = (a: PlanListItem, b: PlanListItem) =>
    a.writtenAt.localeCompare(b.writtenAt) || a.planId - b.planId
  /**
   * **승계(previousPlanId)대로 가지를 친다** (2026-09-17).
   *
   * 💀 대기가 아닌 것을 날짜 순으로 한 줄에 화살표로 이었더니 **폐기한 계획 뒤로 다음 계획이
   *    이어지는 것처럼** 그려졌다 — 폐기는 막다른 곳이다. 이어지는 것은 승계뿐이다.
   * 부모가 이 목록에 없으면 뿌리로 선다. 같은 부모의 갈래는 «간 길 → 대기 → 폐기» 순서로 세로로.
   */
  const ids = new Set(plans.map((p) => p.planId))
  const parentOf = (p: PlanListItem) =>
    p.previousPlanId != null && ids.has(p.previousPlanId)
      ? p.previousPlanId
      : null
  const rank = (p: PlanListItem) =>
    p.status === 'CLOSED' ? 2 : p.status === 'PLANNED' ? 1 : 0
  const branchOrder = (a: PlanListItem, b: PlanListItem) =>
    rank(a) - rank(b) || byDate(a, b)
  const childrenOf = (id: number | null) =>
    plans.filter((p) => parentOf(p) === id).sort(branchOrder)
  // 새 마디가 붙는 곳 — 실제로 간 길의 끝 (spine.ts 와 같은 답)
  const attach = attachPointId(plans)

  /**
   * 「+ 새 계획」 — 붙는 마디의 **갈래 맨 아래**에 선다 (2026-09-17 (가)).
   * 새 계획은 실행 중에서 갈라져 나와 다음 대기가 된다 — 대기와 «같은 줄»이어야 한다.
   * 💀 대기 칸 오른쪽에 화살표로 붙였더니 대기 «뒤에» 이어지는 것처럼 읽혔다
   */
  const gate = onCreate && (
    <button
      type="button"
      onClick={onCreate}
      aria-label={creating ? '생성 그만두기' : '이어서 세우기'}
      className={cn(
        // 폭은 위 대기 마디와 같게 — 같은 갈래 칸을 채운다 (마디 min 150 · max 200)
        'max-w-[200px] min-w-[150px] shrink-0 self-stretch rounded-[10px] border border-dashed px-2.5 py-1.5 text-left text-[11px] transition-colors',
        creating
          ? 'border-brand-blue text-brand-blue bg-brand-blue/[0.08]'
          : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/70',
      )}
    >
      {creating ? '쓰는 중 · 새 계획' : '+ 새 계획'}
    </button>
  )

  const tree = (p: PlanListItem): React.ReactNode => {
    const kids = childrenOf(p.planId)
    const withGate = gate && p.planId === attach
    return (
      <div key={p.planId} className="flex shrink-0 items-center gap-2">
        <ChainNode
          p={p}
          current={p.planId === currentId}
          faded={faded}
          onPick={onPick}
          onClose={onClose}
          onRemove={onRemove}
        />
        {(kids.length > 0 || withGate) && (
          <>
            <Arrow />
            <div className="flex flex-col items-start gap-1.5">
              {kids.map(tree)}
              {withGate && gate}
            </div>
          </>
        )}
      </div>
    )
  }

  const roots = childrenOf(null)
  return (
    // 넘치면 «바깥 칸»이 스크롤한다 — 사슬은 자기 크기대로 선다
    <div className="flex w-max flex-col items-start gap-1.5 pt-2.5 pb-1">
      {roots.map(tree)}
      {/* 붙을 곳이 없으면(아직 아무것도 실행 안 함) 따로 한 줄 */}
      {gate && attach == null && gate}
    </div>
  )
}

const Arrow = () => (
  <span aria-hidden className="shrink-0 text-[12px] text-white/25">
    →
  </span>
)

const DOT: Record<PlanListItem['status'], string> = {
  RUNNING: 'bg-brand-red',
  PLANNED: 'bg-brand-blue',
  DONE: 'bg-white/30',
  CLOSED: 'bg-white/20',
}

function ChainNode({
  p,
  current,
  faded,
  onPick,
  onClose,
  onRemove,
}: {
  p: PlanListItem
  current: boolean
  faded: boolean
  onPick?: (planId: number) => boolean | void
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
}) {
  // 폐기와 삭제는 «같은 문턱»이다 — 대기 + 체결 0건 (Q8)
  const retirable = canClose(p) && (onClose ?? onRemove) != null
  /**
   * 지난 계획은 흐리게 (Q12). ⚠️ 이 앱에서 흐림은 「못 누른다」로 읽히므로
   * 올렸을 때 원래 진하기로 돌아와야 누를 수 있다는 게 보인다.
   */
  const dim =
    !current && (faded || p.status === 'DONE' || p.status === 'CLOSED')

  return (
    <div
      className={cn(
        'group/node relative shrink-0 transition-opacity hover:opacity-100',
        dim && 'opacity-45',
      )}
    >
      {/* 버튼을 `Link` «밖»에 둔다 — 안에 넣으면 누를 때 계획이 열린다 */}
      {retirable && (
        <div className="pointer-events-none absolute -top-2.5 right-1 z-20 flex gap-1 opacity-0 transition-opacity group-hover/node:pointer-events-auto group-hover/node:opacity-100">
          {onClose && (
            <NodeAction
              label={`${p.title} 폐기`}
              onClick={() => onClose(p.planId)}
            >
              폐기
            </NodeAction>
          )}
          {onRemove && (
            <NodeAction
              label={`${p.title} 삭제`}
              onClick={() => onRemove(p.planId)}
            >
              삭제
            </NodeAction>
          )}
        </div>
      )}
      <Link
        data-current={current || undefined}
        to="/stocks/$ticker/plan/$planId"
        params={{ ticker: p.stockCode, planId: String(p.planId) }}
        draggable={false}
        onClick={(e) => {
          // false 를 돌려주면 원래대로 그 계획으로 간다
          if (!onPick || onPick(p.planId) === false) return
          e.preventDefault()
        }}
        className={cn(
          'bg-bg-elevated block max-w-[200px] min-w-[150px] rounded-[10px] border px-2.5 py-1.5',
          current
            ? 'border-white/60 ring-1 ring-white/30'
            : 'border-border-default',
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span className={cn('h-1.5 w-1.5 rounded-full', DOT[p.status])} />
          <span className="font-number">{p.writtenAt.slice(5)}</span>
          <span>· {PLAN_STATUS_LABEL[p.status]}</span>
          {/* 사다리 목표에 도착해 고를 차례 — 다른 계획을 보고 있어도 여기서 안다 (Q16 7).
              💀 노란 점 하나였더니 무엇을 뜻하는지 안 읽혔다 — 글자로 쓴다 */}
          {pendingGoal(p.goals) && (
            <span className="text-warning bg-warning/15 ml-auto rounded px-1 font-bold">
              목표 {pendingGoal(p.goals)?.goal.r}R 도착
            </span>
          )}
        </div>
        <div
          className={cn(
            'truncate text-[12px]',
            current ? 'font-bold text-white' : 'text-white/80',
            p.status === 'CLOSED' && 'line-through',
          )}
        >
          {p.title}
        </div>
      </Link>
    </div>
  )
}

function NodeAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-full bg-[#141414] px-2 py-0.5 text-[10px] text-white/60 ring-1 ring-white/15 hover:text-white"
    >
      {children}
    </button>
  )
}
