import { Link } from '@tanstack/react-router'
import { PLAN_STATUS_LABEL, canClose } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'
import { cn } from '@/shared/lib/cn'

/**
 * 계획 사슬 — **좁힌 사슬 한 줄** (Q12).
 *
 * ```text
 * [지난 계획 N ▾]  직전 → 실행 중 → ┬ 대기
 *                                  └ 대기   → [+ 새 계획]
 * ```
 *
 * 💀 옛 사슬은 끌어서 보는 판 · 측정해서 그리는 곡선 · 확대 · 기간 필터 · 「실행 중」「대기」
 * 찾아가기 칩까지 갖고 있었다. 마디가 열몇 개일 때의 장치들이다. 사슬을 넷 안팎으로
 * 좁히자(Q12) 전부 할 일이 없어졌고, 넓은 판 가운데 마디 넷이 흩어져 보였다.
 * 위젯에서 정한 대로 **왼쪽부터 붙은 한 줄**로 다시 세웠다.
 *
 * - 마디를 누르면 그 계획으로 간다 · 올리면 차트에 유령이 뜬다 (브러싱)
 * - 지난 계획(실행 완료 · 폐기)은 흐리게 · 세우는 중이면 전부 흐리게 — 올리면 원래 진하기
 * - 폐기 · 삭제는 마디에 올렸을 때 위에 뜬다. 문턱은 대기 + 체결 0건 (Q8)
 */
export function PlanChain({
  plans,
  currentId,
  onCreate,
  creating,
  onClose,
  onRemove,
  onHover,
  lead,
  faded = false,
}: {
  plans: PlanListItem[]
  currentId: number
  /** 새 계획을 세운다 — 설 자리가 곧 「무엇을 이어받나」의 답이다 */
  onCreate?: () => void
  creating?: boolean
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
  onHover?: (planId: number | null) => void
  /** 줄 맨 앞 — 「지난 계획 N」 팝오버가 선다 */
  lead?: React.ReactNode
  faded?: boolean
}) {
  const byDate = (a: PlanListItem, b: PlanListItem) =>
    a.writtenAt.localeCompare(b.writtenAt) || a.planId - b.planId
  // 줄기 — 대기가 아닌 것(실제로 간 길 + 꺼낸 폐기)을 날짜 순서로
  const stem = plans.filter((p) => p.status !== 'PLANNED').sort(byDate)
  // 갈래 — 대기는 줄기 끝에서 세로로 쌓인다
  const waits = plans.filter((p) => p.status === 'PLANNED').sort(byDate)

  const node = (p: PlanListItem) => (
    <ChainNode
      key={p.planId}
      p={p}
      current={p.planId === currentId}
      faded={faded}
      onClose={onClose}
      onRemove={onRemove}
      onHover={onHover}
    />
  )

  return (
    <div className="flex items-center gap-2 overflow-x-auto pt-2.5 pb-1">
      {lead}
      {stem.map((p, i) => (
        <div key={p.planId} className="flex shrink-0 items-center gap-2">
          {i > 0 && <Arrow />}
          {node(p)}
        </div>
      ))}
      {waits.length > 0 && (
        <>
          {stem.length > 0 && <Arrow />}
          <div className="flex shrink-0 flex-col gap-1.5">
            {waits.map(node)}
          </div>
        </>
      )}
      {onCreate && (
        <>
          {plans.length > 0 && <Arrow />}
          <button
            type="button"
            onClick={onCreate}
            aria-label={creating ? '생성 그만두기' : '이어서 세우기'}
            className={cn(
              'shrink-0 rounded-[10px] border border-dashed px-2.5 py-1.5 text-left text-[11px] transition-colors',
              creating
                ? 'border-brand-blue text-brand-blue bg-brand-blue/[0.08]'
                : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/70',
            )}
          >
            <div className="text-[10px] opacity-70">
              {creating ? '쓰는 중' : '이어서'}
            </div>
            <div>{creating ? '새 계획' : '+ 새 계획'}</div>
          </button>
        </>
      )}
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
  onClose,
  onRemove,
  onHover,
}: {
  p: PlanListItem
  current: boolean
  faded: boolean
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
  onHover?: (planId: number | null) => void
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
      onMouseEnter={() => onHover?.(p.planId)}
      onMouseLeave={() => onHover?.(null)}
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
        to="/stocks/$ticker/plan/$planId"
        params={{ ticker: p.stockCode, planId: String(p.planId) }}
        draggable={false}
        className={cn(
          'bg-bg-elevated block max-w-[200px] min-w-[150px] rounded-[10px] border px-2.5 py-1.5',
          current
            ? 'border-white/40 ring-1 ring-white/25'
            : 'border-border-default',
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span className={cn('h-1.5 w-1.5 rounded-full', DOT[p.status])} />
          <span className="font-number">{p.writtenAt.slice(5)}</span>
          <span>· {PLAN_STATUS_LABEL[p.status]}</span>
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
