import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { PLAN_STATUS_LABEL } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'

/**
 * 계획 사슬 — 이 종목의 계획들이 «승계»로 이어진 모양.
 *
 * 왜 목록이 아니라 사슬인가 —
 * *"추가매수하면 새 계획을 세우고, 그때 이전 계획은 실행 완료로 닫힌다.
 *   물량이 나가서가 아니라 **판단이 승계돼서**다"* (④-2).
 * 승계가 화살표라서 이력이 아니라 사슬이다.
 *
 * 모양이 둘로 갈린다 —
 *   **과거는 한 줄**   이미 결정된 것이라 갈라지지 않는다
 *   **미래는 갈래**    실행 전 계획 여럿. 하나만 실현되고 나머지는 사용자가 닫는다 (④-3)
 *
 * ⚠️ 핸드북 3-2 의 화살표 표에 **자기참조가 없다.** A↔B 두 오브젝트만 다룬다.
 *    표대로 밀면 「계획 싱글 → 계획 컬렉션」이 되는데 그러면 사슬이 안 보인다.
 *    화면 «안»의 표현이라 4부(배치) 쪽인데 거기도 안을 안 다룬다 — 비어 있는 자리다.
 */
export function PlanChain({
  plans,
  currentId,
}: {
  plans: PlanListItem[]
  currentId: number
}) {
  /**
   * **줄기는 「실제로 간 길」이다** — 실행 중 · 실행 완료만 줄기에 선다.
   * previousPlanId 를 따라 잇는다. 승계가 화살표다.
   *
   * **갈래는 「안 간 길」이다** — 대기(아직 안 감)와 폐기(안 가기로 함).
   *   대기는 줄기 «끝»에서 오른쪽으로, 폐기는 갈라져 나온 마디 «밑»으로.
   *   방향이 곧 뜻이라 선을 안 그려도 폐기는 자리로 읽힌다.
   */
  const byId = new Map(plans.map((p) => [p.planId, p]))
  const walked = (p: PlanListItem) =>
    p.status === 'RUNNING' || p.status === 'DONE'

  const spine = plans
    .filter(walked)
    .sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))

  const headId = spine[0]?.planId ?? -1
  const branches = new Map<number, PlanListItem[]>()
  for (const p of plans) {
    if (walked(p)) continue
    const at =
      p.previousPlanId != null && byId.has(p.previousPlanId)
        ? p.previousPlanId
        : headId
    const list = branches.get(at) ?? []
    list.push(p)
    branches.set(at, list)
  }

  const tail = spine[spine.length - 1]
  const tips = tail
    ? (branches.get(tail.planId) ?? []).filter((p) => p.status === 'PLANNED')
    : []
  const dropped = (id: number) =>
    (branches.get(id) ?? [])
      .filter((p) => p.status !== 'PLANNED')
      .sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))

  // 줄기가 통째로 없는 종목(아직 아무것도 실행 안 함)은 갈래만 늘어놓는다
  const orphans = spine.length === 0 ? plans : []

  /**
   * 잇는 선을 «측정해서» 그린다.
   *
   * 칸마다 갈래 수가 달라 마디 높이가 서로 다르다. CSS 로는 「이 마디 오른쪽에서
   * 저 마디 왼쪽으로」가 안 그려진다 — 실제 좌표를 재서 곡선을 얹는다.
   * 그래야 마디가 위아래로 어긋나도 «마디에서 마디로» 간다.
   */
  const boxRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<number, HTMLElement>())
  const [edges, setEdges] = useState<
    { x1: number; y1: number; x2: number; y2: number }[]
  >([])

  const pairs: [number, number][] = []
  for (let i = 0; i < spine.length - 1; i++)
    pairs.push([spine[i].planId, spine[i + 1].planId])
  if (tail) for (const t of tips) pairs.push([tail.planId, t.planId])
  const key = pairs.map((p) => p.join('>')).join(',')

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const b = box.getBoundingClientRect()
      setEdges(
        pairs.flatMap(([from, to]) => {
          const a = nodeRefs.current.get(from)
          const c = nodeRefs.current.get(to)
          if (!a || !c) return []
          const ra = a.getBoundingClientRect()
          const rc = c.getBoundingClientRect()
          return [
            {
              x1: ra.right - b.left,
              y1: ra.top + ra.height / 2 - b.top,
              x2: rc.left - b.left,
              y2: rc.top + rc.height / 2 - b.top,
            },
          ]
        }),
      )
    }
    // 첫 값은 동기로 읽는다 — 콜백만 기다리면 첫 프레임에 선이 없다
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [key])

  const cells = [
    ...spine.map((p) => ({ key: p.planId, list: [p, ...dropped(p.planId)] })),
    ...(tips.length ? [{ key: -1, list: tips }] : []),
    ...(orphans.length ? [{ key: -2, list: orphans }] : []),
  ]

  return (
    <PanBox>
      {/* 사슬이 칸보다 «작을 때» 위에 붙지 않고 가운데 선다 */}
      <div className="flex min-h-full w-max flex-col justify-center">
        <div
          ref={boxRef}
          className="relative flex w-max items-center gap-9 pr-[168px] pb-[72px]"
        >
          {cells.map(({ key: k, list }) => (
            <div key={k} className="flex flex-col gap-2">
              {list.map((p) => (
                <ChainNode
                  key={p.planId}
                  p={p}
                  current={p.planId === currentId}
                  bind={(el) => {
                    if (el) nodeRefs.current.set(p.planId, el)
                    else nodeRefs.current.delete(p.planId)
                  }}
                />
              ))}
            </div>
          ))}

          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {edges.map((e, i) => {
              const dx = Math.max(18, (e.x2 - e.x1) * 0.55)
              return (
                <g key={i} stroke="rgba(255,255,255,0.22)" fill="none">
                  <path
                    d={`M${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2 - 5} ${e.y2}`}
                  />
                  <path
                    d={`M${e.x2 - 8} ${e.y2 - 3.5} L${e.x2 - 3} ${e.y2} L${e.x2 - 8} ${e.y2 + 3.5}`}
                  />
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </PanBox>
  )
}

/**
 * 사슬 칸 — **자체 뷰포트**다. 계획이 늘어도 카드가 세로로 자라지 않고
 * 안에서 움직인다. 끌어서 옮길 수 있다 (그래프라 스크롤바보다 끄는 게 맞다).
 *
 * 마우스를 누른 채 움직이면 `scrollLeft/Top` 을 반대로 민다.
 * 노드는 링크라, «끌었으면» 클릭을 취소한다 — 안 그러면 끌 때마다 계획이 열린다.
 */
function PanBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(
    null,
  )
  const [moving, setMoving] = useState(false)

  const down = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || e.button !== 0) return
    // 노드가 <a> 라 이걸 막지 않으면 브라우저가 «링크 끌기»를 가져가고
    // mousemove 가 안 온다 — 끌어도 아무 일이 안 일어나던 이유다
    e.preventDefault()
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      l: el.scrollLeft,
      t: el.scrollTop,
    }
  }
  const move = (e: React.MouseEvent) => {
    const el = ref.current
    const d = drag.current
    if (!el || !d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!moving && Math.abs(dx) + Math.abs(dy) > 4) setMoving(true)
    el.scrollLeft = d.l - dx
    el.scrollTop = d.t - dy
  }
  const up = () => {
    drag.current = null
    // 클릭 이벤트가 뒤에 오므로 한 틱 뒤에 푼다
    if (moving) setTimeout(() => setMoving(false), 0)
  }

  return (
    <div
      ref={ref}
      onMouseDown={down}
      onMouseMove={move}
      onMouseUp={up}
      onMouseLeave={up}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (moving) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      className={cn(
        'chain-pan absolute inset-0 overflow-auto py-1',
        moving ? 'cursor-grabbing select-none' : 'cursor-grab',
      )}
    >
      {children}
    </div>
  )
}

const TONE: Record<string, string> = {
  RUNNING: 'border-brand-red/50 bg-brand-red/10',
  PLANNED: 'border-brand-blue/45 bg-brand-blue/10',
  DONE: 'border-white/8 bg-white/[0.03]',
  CLOSED: 'border-white/8 bg-white/[0.02]',
}

const CHIP: Record<string, string> = {
  RUNNING: 'bg-brand-red/15 text-brand-red',
  PLANNED: 'bg-brand-blue/15 text-brand-blue',
  DONE: 'bg-white/[0.07] text-white/55',
  CLOSED: 'bg-white/[0.07] text-white/45',
}

function ChainNode({
  p,
  current,
  bind,
}: {
  p: PlanListItem
  current: boolean
  bind?: (el: HTMLElement | null) => void
}) {
  return (
    <Link
      ref={bind}
      to="/plans/$planId"
      params={{ planId: String(p.planId) }}
      draggable={false}
      className={cn(
        'block w-[168px] shrink-0 rounded-[12px] border px-3 py-2.5 transition-colors',
        TONE[p.status],
        current && 'ring-1 ring-white/45',
        !current && 'hover:bg-white/[0.07]',
      )}
    >
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span
          className={cn('rounded px-1.5 py-0.5 text-[11px]', CHIP[p.status])}
        >
          {PLAN_STATUS_LABEL[p.status]}
        </span>
        <span className="text-[11px] text-white/45">
          {p.side === 'BUY' ? '매수' : '매도'}
        </span>
        <span className="font-number ml-auto text-[10px] text-white/25">
          {p.writtenAt.slice(5)}
        </span>
      </div>
      <div className="mt-1.5 truncate text-[12px] font-semibold text-white">
        {p.title}
      </div>
      <div className="font-number mt-1 text-[13px] whitespace-nowrap text-white/85">
        {p.entryPrice.toLocaleString('ko-KR')}
      </div>
      <div className="font-number mt-0.5 flex items-baseline gap-1 text-[11px] whitespace-nowrap text-white/45">
        <span>↓ {p.stopPrice.toLocaleString('ko-KR')}</span>
        <span className="ml-auto text-white/35">{p.quantity}주</span>
      </div>
    </Link>
  )
}
