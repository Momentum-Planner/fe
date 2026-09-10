import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
 * **X축을 차트와 «공유하지 않는다».** 날짜 비례로 놓아 봤더니 계획이 몇 달에 몰려
 * 있을 때 카드가 줄줄이 겹쳤다 — 점은 값이라 못 미는데(3장 ⑦) 카드만 밀면 어느 점의
 * 이름인지가 흐려진다. 그래서 사슬은 «순서»로 균등하게 놓고, 대신 **마디를 누르면
 * 차트가 그 계획의 작성일로 옮겨간다.** 시점을 잇는 일을 배치가 아니라 인터랙션이 한다.
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

  // 줄기가 비면 undefined 다. `at(-1)` 이라야 타입이 그것을 말한다 —
  // `spine[spine.length - 1]` 은 `noUncheckedIndexedAccess` 가 꺼져 있어 늘 truthy 로 읽힌다
  const tail = spine.at(-1)
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
  const panRef = useRef<HTMLDivElement>(null)
  /**
   * 사슬 오른쪽에 두는 «빈 자리».
   *
   * 콘텐츠가 `w-max` 라 마지막 마디 뒤에 아무것도 없다 — 스크롤이 끝까지 가도
   * 마지막 마디는 오른쪽에 남는다. 「고른 마디를 왼쪽으로」가 마지막 마디에서만
   * 안 먹던 이유다. 칸 폭만큼 빈 자리를 두면 어느 마디든 왼쪽까지 온다.
   */
  const [tailPad, setTailPad] = useState(0)
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
          /**
           * **x 는 카드의 가장자리, y 는 점의 높이.**
           *
           * 점에서 곧장 이으면 점이 카드 «안»에 있으므로 선이 카드를 가로지른다.
           * 갈래로 내려가는 대각선이 앞 마디의 제목 위를 지나가 글자를 긋는다.
           * 카드 바깥에서 시작해 카드 바깥에서 끝나면 마디 사이 여백만 지난다.
           */
          const midY = (r: DOMRect) => r.top + r.height / 2 - b.top
          return [
            {
              x1: ra.right - b.left,
              y1: midY(ra),
              x2: rc.left - b.left,
              y2: midY(rc),
            },
          ]
        }),
      )
    }
    const sizePad = () => {
      const pan = panRef.current
      if (pan) setTailPad(Math.max(0, pan.clientWidth - CARD_W - LEAD))
    }
    // 첫 값은 동기로 읽는다 — 콜백만 기다리면 첫 프레임에 선이 없다
    measure()
    sizePad()
    const ro = new ResizeObserver(() => {
      measure()
      sizePad()
    })
    ro.observe(box)
    if (panRef.current) ro.observe(panRef.current)
    return () => ro.disconnect()
  }, [key])

  /**
   * **고른 마디를 사슬의 왼쪽으로 끌어온다.**
   *
   * 사슬이 폭보다 길면 계획을 눌러도 그 마디가 오른쪽 끝에 걸쳐 있거나 화면 밖에
   * 있다. 차트는 그 시점으로 옮겨갔는데 사슬은 안 움직이니 둘이 따로 논다.
   * 왼쪽에 세우면 «그 계획과 그 뒤에 이어진 것»이 오른쪽으로 펼쳐진다.
   *
   * `scrollIntoView` 를 안 쓰는 이유 — 조상 스크롤까지 전부 움직여서 페이지가
   * 같이 튄다. 이 칸만 민다.
   */
  useEffect(() => {
    const box = panRef.current
    const el = nodeRefs.current.get(currentId)
    if (!box || !el) return
    const br = box.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    box.scrollTo({
      left: box.scrollLeft + (er.left - br.left) - LEAD,
      behavior: 'smooth',
    })
  }, [currentId, plans])

  const cells = [
    ...spine.map((p) => ({ key: p.planId, list: [p, ...dropped(p.planId)] })),
    ...(tips.length ? [{ key: -1, list: tips }] : []),
    ...(orphans.length ? [{ key: -2, list: orphans }] : []),
  ]

  return (
    <PanBox boxRef={panRef}>
      {/* 사슬이 칸보다 «작을 때» 위에 붙지 않고 가운데 선다 */}
      <div className="flex min-h-full w-max flex-col justify-center">
        <div
          ref={boxRef}
          className="relative flex w-max items-start gap-7"
          style={{ paddingRight: tailPad }}
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

          {/* 선은 카드 «뒤»에 깔린다 (z-0 · 카드는 z-10) — 겹치면 카드가 이긴다 */}
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
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
function PanBox({
  children,
  boxRef,
}: {
  children: React.ReactNode
  /** 고른 마디를 왼쪽으로 끌어오려면 밖에서 이 칸을 스크롤해야 한다 */
  boxRef?: React.RefObject<HTMLDivElement | null>
}) {
  const own = useRef<HTMLDivElement>(null)
  const ref = boxRef ?? own
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

/** 왼쪽에 남기는 여백 — 딱 붙이면 앞 마디로 이어지는 화살표가 잘린다 */
const LEAD = 20
/** 마디 폭. 오른쪽 빈 자리를 잴 때 쓴다 */
const CARD_W = 176

/**
 * 상태의 색. **점을 빼고 «상태 글씨»가 진다.**
 *
 * 점은 선을 이을 지점이 필요해서 뒀던 것인데, 선이 카드 가장자리에서 나가게 되면서
 * 할 일이 없어졌다. 색을 쓸 거면 「실행 중」이라는 «글자 자체»가 지는 게 맞다 —
 * 같은 자리에서 이름과 색이 한 번에 읽히고(디자인 7장), 색이 무너져도 글자가 남는다.
 */
const TONE: Record<string, string> = {
  RUNNING: 'text-brand-red',
  PLANNED: 'text-brand-blue',
  DONE: 'text-white/50',
  CLOSED: 'text-white/30',
}

/**
 * 사슬 마디 — **테두리를 뺐다.**
 *
 * 박스가 여덟 개 나란히 서면 «테두리끼리» 먼저 보인다. 마디를 가르는 일은 이미
 * 가로 자리가 하고 있으므로 선이 중복이다 —
 * *"영역을 나누려면 선이 아니라 여백·음영·인접도"* (디자인 9장 ⑫).
 */
function ChainNode({
  p,
  current,
  bind,
}: {
  p: PlanListItem
  current: boolean
  /** 카드 자체 — 선이 «여기 바깥»에서 시작하고 끝난다 */
  bind?: (el: HTMLElement | null) => void
}) {
  const droppedNode = p.status === 'CLOSED'
  return (
    <Link
      ref={bind}
      to="/plans/$planId"
      params={{ planId: String(p.planId) }}
      draggable={false}
      style={{ width: CARD_W }}
      // 고른 마디가 «확실히» 갈려야 한다 — 차트가 그리로 옮겨갔는데 사슬에서
      // 어느 것을 눌렀는지 흐리면 둘이 이어지지 않는다
      className={cn(
        // ⚠️ 바탕이 «불투명»해야 뒤의 선이 안 비친다. `bg-white/x` 로는 안 된다 —
        // 반투명이라 선이 그대로 비쳐 보인다. 세 상태 다 불투명 토큰을 쓴다
        'group relative z-10 block shrink-0 rounded-lg px-2.5 py-2 transition-colors',
        current
          ? 'bg-bg-elevated ring-1 ring-white/25'
          : 'bg-bg-input hover:bg-bg-surface',
        droppedNode && !current && 'opacity-55',
      )}
    >
      <div className="font-number flex items-baseline gap-1.5 text-[10px] whitespace-nowrap">
        <span className={current ? 'text-white/60' : 'text-white/30'}>
          {p.writtenAt.slice(5)}
        </span>
        <span className={current ? 'text-white/45' : 'text-white/25'}>
          {p.side === 'BUY' ? '매수' : '매도'}
        </span>
      </div>
      <div
        className={cn(
          'truncate text-[12px]',
          current ? 'font-semibold text-white' : 'text-white/70',
        )}
      >
        {p.title}
      </div>
      <div
        className={cn(
          'font-number mt-0.5 flex items-baseline gap-1.5 text-[11px] whitespace-nowrap',
          current ? 'text-white/65' : 'text-white/40',
        )}
      >
        <span>{p.entryPrice.toLocaleString('ko-KR')}</span>
        <span className="text-white/25">·</span>
        <span>{p.quantity}주</span>
        {/* 실행 중만 점이 붙는다 — 「지금 살아 있는 계획」은 종목당 하나뿐이다 (④-2) */}
        <span
          className={cn(
            'ml-auto flex items-center gap-1',
            TONE[p.status],
            droppedNode && 'line-through',
          )}
        >
          {p.status === 'RUNNING' && (
            <span className="bg-brand-red h-1.5 w-1.5 rounded-full" />
          )}
          {PLAN_STATUS_LABEL[p.status]}
        </span>
      </div>
    </Link>
  )
}
