import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { PLAN_STATUS_LABEL, canClose } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'
import { walkedSpine } from './spine'

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
 *   **미래는 갈래**    대기 계획 여럿. 하나만 실현되고 나머지는 사용자가 닫는다 (④-3)
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
  onCreate,
  creating,
  onClose,
  onRemove,
  zoomed,
  onZoom,
  onHover,
  lead,
  faded = false,
}: {
  plans: PlanListItem[]
  currentId: number
  /**
   * 새 마디를 세운다. **머리줄 버튼이 아니라 사슬에 있는 이유** —
   * 「이어서 세우기」는 *어디에* 붙는지가 뜻의 절반이다. 버튼으로 두면 그
   * 자리가 화면에 없어서 「무엇을 이어받나」를 다시 물어야 한다.
   * 사슬에서는 **설 자리가 곧 답이다.**
   */
  onCreate?: () => void
  /**
   * 지금 «생성 중»인가. 빈 자리가 그 상태를 띤다 —
   * 새 마디가 어디에 붙는지를 사슬이 이미 말하고 있으므로, 칸에서 글로 또
   * 적지 않는다. 자리 하나가 「무엇을 이어받나」와 「지금 생성 중」을 다 진다.
   */
  creating?: boolean
  /**
   * 마디를 «치운다». 사슬이 문이고, 값을 받는 칸은 세부 쪽에 열린다 —
   * 사유 한 줄과 확인 버튼이 176px 마디 안에 들어갈 수 없다.
   *
   * ```text
   * 사슬   흐름을 «바꾸는 문»    + · 폐기 · 삭제
   * 세부   값을 «만지는 자리»    수정 + 그 문들이 여는 칸
   * ```
   */
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
  /** 세로로 넓혔나. 넓히는 것은 «칸의 주인»(페이지)이 한다 */
  zoomed?: boolean
  onZoom?: () => void
  /**
   * 마디에 마우스를 올렸다 — 차트가 그 계획을 유령으로 띄운다 (Q12 브러싱).
   * 내리면 null.
   */
  onHover?: (planId: number | null) => void
  /** 찾아가는 줄 맨 앞에 서는 것 — 「지난 계획 N」 팝오버가 여기 선다 (Q12) */
  lead?: React.ReactNode
  /**
   * 새 계획을 쓰는 중이라 사슬이 **뒤로 물러난다** (Q12). 마디가 흐려지고,
   * 마우스를 올린 마디만 진해진다 — 브러싱은 그대로 된다.
   */
  faded?: boolean
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

  // ⚠️ 줄기를 «여기서» 안 만든다 — `useNewPlan` 이 붙일 곳을 같은 답으로 알아야
  //    한다. 두 군데서 따로 내면 유령 선과 실제 부모가 어긋난다 (`spine.ts`)
  const spine = walkedSpine(plans)

  // 줄기가 비면 undefined 다. `at(-1)` 이라야 타입이 그것을 말한다
  const tail = spine.at(-1)

  /**
   * 부모를 안 밝힌 계획이 붙는 자리.
   *
   * 💀 처음엔 줄기의 **머리**에 붙였다. 그러면 `tips` 가 «꼬리»에서만 갈래를
   * 꺼내므로 — 부모 없는 대기 계획이 머리에 매달려 **사슬 어디에도 안 그려졌다.**
   * 목록에는 있는데 화면에서 통째로 사라진다.
   *
   * 붙일 곳은 **꼬리**다. 「지금까지 온 길의 끝에서 갈라진다」가 부모를 안 밝힌
   * 계획의 실제 뜻이기도 하다.
   */
  const loose = tail?.planId ?? spine[0]?.planId ?? -1
  const branches = new Map<number, PlanListItem[]>()
  for (const p of plans) {
    if (walked(p)) continue
    const at =
      p.previousPlanId != null && byId.has(p.previousPlanId)
        ? p.previousPlanId
        : loose
    const list = branches.get(at) ?? []
    list.push(p)
    branches.set(at, list)
  }

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
   * 사슬 «양옆»에 두는 빈 자리.
   *
   * 고른 마디를 «한가운데»로 데려오려면 첫 마디 앞과 마지막 마디 뒤에 각각 반 칸씩
   * 자리가 있어야 한다. 콘텐츠가 `w-max` 라 그냥 두면 양 끝 마디는 가운데까지
   * 못 온다 — 스크롤이 끝에서 멈춘다.
   */
  const [pad, setPad] = useState(0)
  /**
   * 사슬 «위아래»에 두는 빈 자리.
   *
   * 갈래가 늘면 마디가 세로로 쌓이는데, 그러면 맨 위·맨 아래 마디는 칸 가운데까지
   * 못 온다 — 스크롤이 끝에서 멈춘다. 가로(`pad`)와 같은 이유다.
   *
   * ⚠️ **내용이 칸보다 «높을 때만» 준다.** 한 줄뿐인 종목에까지 주면 위아래로
   *    끌 수 있는 빈 공간만 생긴다.
   */
  const [padY, setPadY] = useState(0)
  const nodeRefs = useRef(new Map<number, HTMLElement>())
  const [edges, setEdges] = useState<
    { x1: number; y1: number; x2: number; y2: number; ghost?: boolean }[]
  >([])

  const pairs: [number, number][] = []
  for (let i = 0; i < spine.length - 1; i++) {
    const a = spine[i]
    const b = spine[i + 1]
    if (a && b) pairs.push([a.planId, b.planId])
  }
  if (tail) for (const t of tips) pairs.push([tail.planId, t.planId])
  /**
   * **아직 없는 마디로 가는 선.**
   *
   * 빈 자리에도 화살표가 가야 「여기에 이어진다」가 읽힌다 — 자리만 덩그러니
   * 있으면 옆에 «놓인» 칸으로 보인다. 다만 그 마디는 아직 «없으므로» 선도
   * 실선이면 거짓이 된다. 점선으로 긋고 화살촉을 비운다.
   *
   * 붙는 곳은 부모를 안 밝힌 계획이 붙는 곳과 «같다»(`loose`) — 실제로 세우면
   * 그 자리에 생기므로, 미리 그어 둔 선이 곧 진짜 선이 된다.
   */
  if (onCreate) pairs.push([loose, NEW_ID])
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
          const ghost = to === NEW_ID
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
              ghost,
            },
          ]
        }),
      )
    }
    const sizePad = () => {
      const pan = panRef.current
      if (!pan) return
      setPad(Math.max(0, (pan.clientWidth - CARD_W) / 2))
      /**
       * ⚠️ 여유를 «뺀» 높이로 잰다. 지금 붙어 있는 `padY` 를 그대로 세면
       *    「높다 → 여유를 준다 → 더 높다」로 스스로를 물고 늘어진다.
       */
      const contentH = box.scrollHeight - padY * 2
      setPadY(
        contentH > pan.clientHeight
          ? Math.max(0, (pan.clientHeight - NODE_H) / 2)
          : 0,
      )
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
    /**
     * 💀 한때 `[key]` 뿐이었다. 그러면 **마디가 움직여도 선은 그대로 있는다** —
     *    확대를 켜고 끄면 칸 높이가 210 ↔ 460 으로 바뀌고 `padY` 가 따라 바뀌어
     *    마디가 위아래로 옮겨 앉는데, 잇는 것(`key`)은 안 변하므로 다시 안 쟀다.
     *    선 끝이 옛 자리에 남아 **빈 자리로 가는 화살표가 허공을 가리켰다.**
     *    잇는 것뿐 아니라 **놓인 자리**가 바뀌어도 다시 잰다.
     */
  }, [key, padY, zoomed])

  /**
   * **고른 마디를 사슬의 한가운데로 데려온다.**
   *
   * 사슬이 폭보다 길면 계획을 눌러도 그 마디가 끝에 걸쳐 있거나 화면 밖에 있다.
   * 차트는 그 시점을 가운데로 가져오는데 사슬만 안 움직이면 둘이 따로 논다.
   * 가운데에 세우면 **앞뒤가 같이 보인다** — 왼쪽이 「여기까지 온 길」,
   * 오른쪽이 「여기서 갈라진 것」이다. 차트의 축과 같은 규칙이다.
   *
   * `scrollIntoView` 를 안 쓰는 이유 — 조상 스크롤까지 전부 움직여서 페이지가
   * 같이 튄다. 이 칸만 민다.
   */
  /**
   * 사슬을 «어디로» 맞춰 둘까 — 기본은 고른 마디다.
   *
   * 「실행 중」·기간을 누르면 이 값이 바뀌고, 그 마디가 **가로·세로 가운데**로 온다.
   * 칸이 작아서(210px × 가로 스크롤) **스스로 데려오지 않으면 못 찾는다.**
   *
   * ⚠️ 세로도 가운데로 오게 한 이유 — 갈래가 늘면 마디가 세로로 쌓이는데,
   *    가로만 맞추면 고른 마디가 «위아래로» 화면 밖에 있을 수 있다.
   */
  const [focusId, setFocusId] = useState<number | null>(null)
  const centerOn = focusId ?? currentId

  useEffect(() => {
    let timer = 0
    let tries = 0
    const go = () => {
      const box = panRef.current
      const el = nodeRefs.current.get(centerOn)
      // 칸에 폭이 아직 없거나(레이아웃 전) 마디가 안 붙었으면 조금 뒤에 다시
      if (!box || !el || box.clientWidth === 0) {
        if (tries++ < 30) timer = window.setTimeout(go, 32)
        return
      }
      const br = box.getBoundingClientRect()
      const er = el.getBoundingClientRect()
      // 마디의 «중심»을 칸의 «중심»에 맞춘다 — 가로와 «세로» 둘 다
      const dx = er.left + er.width / 2 - (br.left + br.width / 2)
      const dy = er.top + er.height / 2 - (br.top + br.height / 2)
      /**
       * ⚠️ 탭이 «안 보이면 부드러운 스크롤이 안 끝난다.** smooth 애니메이션도
       * rAF 로 도는데 hidden 상태에서는 rAF 가 멈춘다 — 몇 px 만 가고 그대로 선다.
       * 보고 있을 때만 부드럽게, 아니면 즉시 옮긴다.
       */
      box.scrollTo({
        left: box.scrollLeft + dx,
        top: box.scrollTop + dy,
        behavior: document.hidden ? 'auto' : 'smooth',
      })
    }
    go()
    return () => window.clearTimeout(timer)
    /**
     * ⚠️ `requestAnimationFrame` 을 안 쓴다 — **백그라운드 탭에서는 rAF 가 아예
     *    안 돈다.** 탭을 옮겨 놓고 계획을 열면 사슬이 영영 제자리에 있게 된다.
     *    `setTimeout` 은 느려질 뿐 멈추지는 않는다.
     *
     * ⚠️ `pad` · `padY` 가 의존성에 «있어야» 한다. 첫 렌더에는 0 이라 양옆 빈 자리가 없고,
     *    그 상태에서 가운데로 가려면 왼쪽으로 가야 하는데 이미 0 이라 클램프되고
     *    끝난다. `ResizeObserver` 가 pad 를 정한 «뒤» 한 번 더 돌아야 한다.
     */
  }, [centerOn, plans, pad, padY])

  const cells = [
    ...spine.map((p) => ({ key: p.planId, list: [p, ...dropped(p.planId)] })),
    /**
     * 빈 자리가 이 열에 «같이» 선다 — 대기가 없어도 열을 만든다.
     * **계획이 하나도 없는 종목**이면 이 열 하나가 사슬의 전부다 — 첫 계획을
     * 세우는 문이 거기다 (2026-09-11).
     */
    ...(tips.length || onCreate ? [{ key: -1, list: tips }] : []),
    ...(orphans.length ? [{ key: -2, list: orphans }] : []),
  ]

  /** 실행 중은 종목당 하나뿐이다 (④-2) — 「지금 살아 있는 판단」 */
  const running = plans.find((p) => p.status === 'RUNNING')
  /**
   * 대기는 **여럿일 수 있다** — 같은 종목에 시나리오를 여럿 둘 수 있고
   * 하나만 실현된다 (④-3). 그래서 칩 하나가 «돌아가며» 하나씩 데려온다.
   * 최근에 세운 것부터다.
   */
  const waiting = plans
    .filter((p) => p.status === 'PLANNED')
    .sort((a, b) => b.writtenAt.localeCompare(a.writtenAt))
  const waitAt = useRef(0)
  const nextWaiting = () => {
    const i = waitAt.current % waiting.length
    waitAt.current = i + 1
    const target = waiting[i]
    if (target) setFocusId(target.planId)
  }
  /**
   * ⚠️ 「최신」 칩을 뺐다 (2026-09-11). 사슬은 **왼쪽이 과거, 오른쪽이 지금**이라
   *    최신은 늘 오른쪽 끝이다 — 끌면 닿는 자리에 칩까지 둘 이유가 없다.
   *    찾기 어려운 것은 «가운데 어딘가»에 있는 실행 중이고, 그것만 남긴다.
   */

  /**
   * 기간 — 밖에 있는 마디를 «흐리게» 둔다. 사슬을 끊지 않는다.
   */
  const [span, setSpan] = useState({ from: '', to: '' })
  const inSpan = (p: PlanListItem) =>
    (!span.from || p.writtenAt >= span.from) &&
    (!span.to || p.writtenAt <= span.to)

  return (
    /**
     * ⚠️ **세로로 쌓는다.** `PanBox` 가 `absolute inset-0` 이라, 찾아가는 줄을
     *    형제로 두면 **줄이 그 밑에 깔려 안 보이고 눌리지도 않는다.**
     *    💀 「최신이 있는데 안 보인다」가 이것이었다.
     */
    <div className="flex h-full flex-col">
      {/* ── 사슬을 «찾아가는» 줄 ────────────────────────────────────────
          💀 칸이 가로 스크롤이라, 마디가 열 개만 넘어도 손으로 끌어서는 원하는
             자리를 못 찾는다. 특히 **실행 중**이 둘째·셋째에 있으면 화면 밖이다 —
             그게 「지금 살아 있는 판단」인데.
          ⚠️ 마디를 «옮기지» 않는다. 사슬의 순서는 시간이라 바꾸면 거짓이 된다.
             옮기는 것은 «보는 자리»고, 기간은 «밝기»로만 말한다. */}
      <div className="mb-1.5 flex shrink-0 flex-wrap items-center gap-1.5">
        {lead}
        {running && (
          <Jump
            on={centerOn === running.planId}
            onClick={() => setFocusId(running.planId)}
          >
            <span className="bg-brand-red h-1.5 w-1.5 rounded-full" />
            실행 중
          </Jump>
        )}
        {waiting.length > 0 && (
          <Jump
            on={waiting.some((p) => p.planId === centerOn)}
            onClick={nextWaiting}
            label={
              waiting.length > 1
                ? `대기 ${waiting.length}개 — 누를 때마다 다음`
                : '대기'
            }
          >
            <span className="bg-brand-blue h-1.5 w-1.5 rounded-full" />
            대기
            {/* 여럿이면 개수를 붙인다 — 한 번 눌러서 다 못 본다는 사실이 보여야 한다 */}
            {waiting.length > 1 && (
              <span className="font-number text-white/40">
                {waiting.length}
              </span>
            )}
          </Jump>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {plans.length > 4 && (
            <>
              {/**
               * 기간 — **사슬을 끊지 않는다.** 승계는 이어진 것이라 중간을 빼면
               * «끊긴 마디 목록»이 되고 사슬이 아니게 된다. 그래서 밖은 «흐리게»
               * 두고 안만 밝힌다 (디자인 4장 ⑤ — 회색을 지우지 않는다).
               */}
              <span className="text-[10px] text-white/35">기간</span>
              <input
                type="date"
                value={span.from}
                onChange={(e) =>
                  setSpan((v) => ({ ...v, from: e.target.value }))
                }
                className="bg-bg-input font-number rounded-md px-1.5 py-0.5 text-[10px] text-white/80 outline-none focus:ring-1 focus:ring-white/30"
              />
              <span className="text-[10px] text-white/25">~</span>
              <input
                type="date"
                value={span.to}
                onChange={(e) => setSpan((v) => ({ ...v, to: e.target.value }))}
                className="bg-bg-input font-number rounded-md px-1.5 py-0.5 text-[10px] text-white/80 outline-none focus:ring-1 focus:ring-white/30"
              />
              {(span.from || span.to) && (
                <Jump on={false} onClick={() => setSpan({ from: '', to: '' })}>
                  해제
                </Jump>
              )}
            </>
          )}
          {/**
           * 확대 — **세로로 넓힌다.** 갈래가 늘면 마디가 세로로 쌓이는데
           * 210px 안에서는 위아래가 잘린다. 폭은 안 건드린다 — 가로는 이미
           * 끌어서 보고, 잘리는 쪽은 세로다.
           */}
          {/* 글자 대신 «모양»으로 — 대각 화살표가 곧 「넓힌다」다. 가로줄이
              좁아도 안 밀리고, 읽지 않아도 무엇인지 안다 (디자인 1장 ②) */}
          {onZoom && (
            <Jump
              on={zoomed ?? false}
              onClick={onZoom}
              label={zoomed ? '줄이기' : '확대'}
            >
              {zoomed ? (
                <Minimize2 size={12} strokeWidth={2} />
              ) : (
                <Maximize2 size={12} strokeWidth={2} />
              )}
            </Jump>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <PanBox boxRef={panRef}>
          {/* 사슬이 칸보다 «작을 때» 위에 붙지 않고 가운데 선다 */}
          <div className="flex min-h-full w-max flex-col justify-center">
            <div
              ref={boxRef}
              className="relative flex w-max items-start gap-7"
              style={{
                paddingLeft: pad,
                paddingRight: pad,
                paddingTop: padY,
                paddingBottom: padY,
              }}
            >
              {cells.map(({ key: k, list }) => (
                <div key={k} className="flex flex-col gap-2">
                  {list.map((p) => (
                    <ChainNode
                      key={p.planId}
                      p={p}
                      current={p.planId === currentId}
                      outOfSpan={!inSpan(p)}
                      onClose={onClose}
                      onRemove={onRemove}
                      onHover={onHover}
                      faded={faded}
                      bind={(el) => {
                        if (el) nodeRefs.current.set(p.planId, el)
                        else nodeRefs.current.delete(p.planId)
                      }}
                    />
                  ))}

                  {/* ── 새 마디가 «설 자리» ────────────────────────────────
                  💀 한때 갈래 칸 «다음 열»에 뒀다. 그러면 줄기 끝에서 오는
                     선이 **대기 카드들을 건너뛰어** 두 칸을 가로지른다 —
                     어디서 어디로 가는 선인지가 안 읽힌다.
                  새 계획도 갈래 하나이므로 **갈래와 같은 열**이 맞다.
                  그러면 선이 옆 마디들과 «같은 폭»만 지난다.

                  평소에는 점선 윤곽만 있고 호버하면 `+` 가 뜬다 — 늘 보이면
                  마디가 하나 더 있는 것처럼 읽히고, 없으면 누를 자리를 모른다. */}
                  {k === -1 && onCreate && (
                    <NewNode
                      onClick={onCreate}
                      writing={creating}
                      bind={(el) => {
                        if (el) nodeRefs.current.set(NEW_ID, el)
                        else nodeRefs.current.delete(NEW_ID)
                      }}
                    />
                  )}
                </div>
              ))}

              {/* 선은 카드 «뒤»에 깔린다 (z-0 · 카드는 z-10) — 겹치면 카드가 이긴다 */}
              <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
                {edges.map((e, i) => {
                  const dx = Math.max(18, (e.x2 - e.x1) * 0.55)
                  /**
                   * **아직 없는 마디로 가는 선은 점선이다.** 실선이면 「이어져 있다」가
                   * 되는데 그 마디는 아직 없다 — 선이 거짓말을 하면 안 된다.
                   * 만드는 중이면 파랑으로 켜서 어디로 가는 중인지를 말한다.
                   */
                  const tone = e.ghost
                    ? creating
                      ? 'rgba(52,173,228,0.75)'
                      : 'rgba(255,255,255,0.14)'
                    : 'rgba(255,255,255,0.22)'
                  return (
                    <g
                      key={i}
                      stroke={tone}
                      fill="none"
                      strokeDasharray={
                        e.ghost ? (creating ? '6 6' : '3 3') : undefined
                      }
                    >
                      <path
                        d={`M${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2 - 5} ${e.y2}`}
                      >
                        {/**
                         * 만드는 중이면 **점선이 흐른다** — 도로 안내가 갈 길을
                         * 짚어 주는 것과 같다. 「여기로 간다」가 정지된 선보다
                         * 분명하고, 어느 마디에서 갈라지는지가 방향으로 읽힌다.
                         *
                         * SVG `<animate>` 를 쓴다 — CSS 키프레임을 새로 만들면
                         * 토큰 밖의 값이 하나 늘고, 이 애니메이션은 여기서만 쓴다.
                         */}
                        {e.ghost && creating && (
                          <animate
                            attributeName="stroke-dashoffset"
                            values="12;0"
                            dur="0.7s"
                            repeatCount="indefinite"
                          />
                        )}
                      </path>
                      {/* 화살촉은 «실선»으로 — 점선으로 그리면 삼각형이 부서진다 */}
                      <path
                        strokeDasharray="none"
                        d={`M${e.x2 - 8} ${e.y2 - 3.5} L${e.x2 - 3} ${e.y2} L${e.x2 - 8} ${e.y2 + 3.5}`}
                      />
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </PanBox>
      </div>
    </div>
  )
}

/**
 * 사슬 칸 — **자체 뷰포트**다. 계획이 늘어도 카드가 세로로 자라지 않고
 * 안에서 움직인다. 끌어서 옮길 수 있다 (그래프라 스크롤바보다 끄는 게 맞다).
 *
 * 마우스를 누른 채 움직이면 `scrollLeft/Top` 을 반대로 민다.
 * 노드는 링크라, «끌었으면» 클릭을 취소한다 — 안 그러면 끌 때마다 계획이 열린다.
 */
/** 사슬에서 «보는 자리»를 옮기는 칩. 마디를 옮기는 게 아니다 */
function Jump({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean
  onClick: () => void
  /** 모양만 있는 칩은 «이름»이 따로 필요하다 — 읽는 쪽이 무엇인지 알아야 한다 */
  label?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors',
        on
          ? 'bg-white/[0.12] text-white/85'
          : 'bg-white/[0.04] text-white/40 hover:text-white/75',
      )}
    >
      {children}
    </button>
  )
}

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
  /**
   * 💀 **끌었는지를 `state` 로 판정하면 클릭이 막힌다.**
   *
   * `onClickCapture` 가 읽는 `moving` 은 그 렌더의 값이라, `setMoving(false)` 가
   * 한 틱 늦으면 «다음 클릭»까지 취소된다 — 한 번 끌고 나면 마디가 안 눌린다.
   * 판정은 «지금 이 제스처»의 사실이므로 ref 가 맞다. state 는 커서 모양에만 쓴다.
   */
  const moved = useRef(false)

  const down = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || e.button !== 0) return
    // 노드가 <a> 라 이걸 막지 않으면 브라우저가 «링크 끌기»를 가져가고
    // mousemove 가 안 온다 — 끌어도 아무 일이 안 일어나던 이유다
    e.preventDefault()
    moved.current = false
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
    if (!moved.current && Math.abs(dx) + Math.abs(dy) > 4) {
      moved.current = true
      setMoving(true)
    }
    el.scrollLeft = d.l - dx
    el.scrollTop = d.t - dy
  }
  const up = () => {
    drag.current = null
    setMoving(false)
    // 클릭이 «이 뒤에» 온다 — 그 한 번만 막고 바로 푼다
    if (moved.current) setTimeout(() => (moved.current = false), 0)
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
        if (moved.current) {
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

/** 마디 폭. 양옆 빈 자리를 잴 때 쓴다 */
const CARD_W = 176

/**
 * 마디 높이의 어림값. 위아래 빈 자리를 잴 때만 쓴다 —
 * 실제 높이는 내용이 정하지만(세 줄 + `py-2`), 여유의 크기는 «대략»이면 된다.
 */
const NODE_H = 58

/**
 * 「아직 없는 마디」의 자리표. 실제 `planId` 와 안 겹치게 음수로 둔다 —
 * 선을 재는 `nodeRefs` 가 `planId` 로 도는데, 빈 자리도 같은 장부에 올라야
 * 같은 방식으로 측정된다.
 */
const NEW_ID = -100

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
 * 새 마디가 «설 자리».
 *
 * 💀 높이를 `h-[58px]` 로 찍어 뒀다가 카드와 어긋났다. 카드 높이는 «내용»이
 * 정하는데(세 줄 + `py-2`) 그것을 픽셀로 베끼면 글자 크기 하나만 바뀌어도 틀어진다.
 *
 * 그래서 **같은 뼈대를 그대로 쓰고 글자만 감춘다** — `invisible` 은 자리를
 * 차지하므로 높이가 «구조적으로» 같아진다. `+` 는 그 위에 절대 배치한다.
 */
function NewNode({
  onClick,
  writing,
  bind,
}: {
  onClick: () => void
  /** 세부 칸에서 지금 이 마디를 만드는 중이다 */
  writing?: boolean
  /** 선이 여기까지 온다 — 다른 마디와 «같은 장부»에 오른다 */
  bind?: (el: HTMLElement | null) => void
}) {
  return (
    <button
      ref={bind}
      type="button"
      onClick={onClick}
      style={{ width: CARD_W }}
      // 만드는 중에 다시 누르면 «끝낸다» — 켠 자리에서 끄는 것이 자연스럽다
      aria-label={writing ? '생성 그만두기' : '이어서 세우기'}
      className={cn(
        'group/new relative z-10 block shrink-0 rounded-lg border border-dashed px-2.5 py-2 text-left transition-colors',
        writing
          ? 'border-brand-blue/60 bg-brand-blue/10'
          : 'border-white/12 hover:border-white/35 hover:bg-white/[0.04]',
      )}
    >
      {/* 카드와 «같은 세 줄». 안 보이지만 자리는 차지한다 */}
      <div aria-hidden className="invisible">
        <div className="font-number text-[10px] whitespace-nowrap">00-00</div>
        <div className="text-[12px]">이름</div>
        <div className="font-number mt-0.5 text-[11px] whitespace-nowrap">
          0 · 0주
        </div>
      </div>
      {writing ? (
        /* 쓰는 동안 **이 자리가 켜진다** — 세부 칸이 어느 마디를 만드는 중인지가
           여기서 읽힌다. 글로 「무엇을 이어받는다」를 적을 필요가 없어진다 */
        <span className="text-brand-blue absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[11px] leading-none">
          <span className="bg-brand-blue h-1.5 w-1.5 animate-pulse rounded-full" />
          <span className="group-hover/new:hidden">생성 중</span>
          {/* 켠 자리에서 끄게 한다 — 취소 버튼을 찾아 세부로 갈 필요가 없다 */}
          <span className="hidden text-white/60 group-hover/new:inline">
            그만두기
          </span>
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[18px] leading-none text-white/20 opacity-0 transition-opacity group-hover/new:text-white/70 group-hover/new:opacity-100">
          +
        </span>
      )}
    </button>
  )
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
  outOfSpan,
  onClose,
  onRemove,
  onHover,
  faded = false,
}: {
  p: PlanListItem
  current: boolean
  /** 카드 자체 — 선이 «여기 바깥»에서 시작하고 끝난다 */
  bind?: (el: HTMLElement | null) => void
  /** 고른 기간 «밖»이다 — 지우지 않고 흐리게 둔다 */
  outOfSpan?: boolean
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
  onHover?: (planId: number | null) => void
  faded?: boolean
}) {
  const droppedNode = p.status === 'CLOSED'
  /**
   * 지난 계획(실행 완료)은 **흐리게** 둔다 (Q12 게슈탈트). 올리면 원래 진하기로 —
   * ⚠️ 이 앱에서 흐림은 「못 누른다」로 읽히므로 올렸을 때 되돌아와야 누를 수 있다는 게 보인다.
   */
  const pastNode = p.status === 'DONE' && !current
  // 폐기와 삭제는 «같은 문턱»이다 — 대기 + 체결 0건 (Q8)
  const retirable = canClose(p) && (onClose ?? onRemove) != null
  return (
    <div
      className={cn(
        'group/node relative transition-opacity hover:opacity-100',
        (faded || pastNode) && 'opacity-45',
      )}
      onMouseEnter={() => onHover?.(p.planId)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* ⚠️ 버튼을 `Link` «밖»에 둔다. 안에 넣으면 중첩이 되고, 누르면 계획이
          열려 버린다. 형제로 두고 카드 위에 겹친다 */}
      {retirable && (
        <div className="pointer-events-none absolute -top-1.5 right-1 z-20 flex gap-1 opacity-0 transition-opacity group-hover/node:pointer-events-auto group-hover/node:opacity-100">
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
        ref={bind}
        // 계획은 «그 종목 안의 한 마디»다 — 주소가 그 사실을 말한다
        to="/stocks/$ticker/plan/$planId"
        params={{ ticker: p.stockCode, planId: String(p.planId) }}
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
          // 기간 «밖»은 지우지 않고 흐리게 — 지우면 사슬이 끊긴다 (4장 ⑤)
          outOfSpan && !current && 'opacity-20',
        )}
      >
        {/* ⚠️ **매수·매도를 안 적는다.** 마디 하나에 날짜·이름·가격·수량·상태가
            이미 다섯이다. 여섯 번째를 얹으면 한 줄에 두 값이 서서 눈이 어디부터
            읽을지 고르게 된다 — 사슬은 «흐름»을 보는 자리이지 계획 하나를 읽는
            자리가 아니다. 매수·매도는 세부 머리줄이 말한다.
            ⚠️ 대가 — 사슬에서 매도 계획이 매수와 «안 갈린다». 이름이 그 일을 한다 */}
        <div
          className={cn(
            'font-number text-[10px] whitespace-nowrap',
            current ? 'text-white/60' : 'text-white/30',
          )}
        >
          {p.writtenAt.slice(5)}
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
          {/* ⚠️ 폐기에 **취소선을 안 긋는다.** 상태는 이미 이름과 색이 말하는데
              작대기까지 그으면 「지워진 것」으로 읽힌다 — 폐기는 지운 것이 아니라
              «안 가기로 한 것»이고 ⑦가 그 행을 «센다» (Q8). 지워지는 것은 삭제다 */}
          <span
            className={cn('ml-auto flex items-center gap-1', TONE[p.status])}
          >
            {p.status === 'RUNNING' && (
              <span className="bg-brand-red h-1.5 w-1.5 rounded-full" />
            )}
            {PLAN_STATUS_LABEL[p.status]}
          </span>
        </div>
      </Link>
    </div>
  )
}

/**
 * 마디 위에 뜨는 작은 행동 — 폐기 · 삭제.
 *
 * 사슬이 «문»이고 값을 받는 칸은 세부에 열린다. 사유 한 줄과 확인 버튼이
 * 176px 마디 안에 들어갈 수 없기 때문이다.
 *
 * ⚠️ `stopPropagation` 이 필요하다 — 이 버튼은 카드 «위»에 떠 있고, 사슬 칸
 *    자체가 끌어서 움직이는 판이라 누른 것이 드래그로 읽히면 안 된다.
 */
function NodeAction({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  /**
   * 「폐기」 두 글자만으로는 **어느 마디인지** 알 수 없다 — 사슬에 치울 수 있는
   * 마디가 여럿이면 버튼도 여럿이다. 이름을 붙여 그 자리를 말하게 한다.
   */
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="bg-bg-elevated rounded-full px-2 py-0.5 text-[10px] text-white/55 shadow-sm ring-1 ring-white/15 transition-colors hover:text-white"
    >
      {children}
    </button>
  )
}
