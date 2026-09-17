import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { EntryGateBadge } from '@/shared/ui/EntryGateBadge'
import { useScreening } from '@/entities/stock'
import {
  goalPrice,
  usePlanBriefing,
  usePlanDefaults,
  usePlanDetail,
  usePlanList,
  useStockPosition,
} from '@/entities/plan'
import type {
  PlanDetail,
  PlanListItem,
  StockPositionView,
} from '@/entities/plan'
import { PlanChain } from './PlanChain'
import { PlanBriefing } from './PlanBriefing'
import { PlanCard } from './PlanCard'
import { PlanChart } from './PlanChart'
import { liveSpan } from './planSpan'
import { ChainOverview } from './ChainOverview'
import { narrowChain } from './narrowChain'
import { LIT_PANEL } from './panel'
import { NewPlanForm } from './NewPlanForm'
import { useNewPlan } from './useNewPlan'
import { usePlanClose, usePlanRemove } from './usePlanRetire'
import { usePlanDraft } from './usePlanDraft'
import { pickOptionsOf } from './StopPickPanel'
import type { PickChoice } from './StopPickPanel'

/**
 * 계획 싱글.
 *
 * **가로로 눕힌 네 단이다.** 좌우 두 단이었던 것을 바꾼 이유 —
 * 사슬의 X축은 «날짜»고 위험노출의 X축은 «%» 다. 둘 다 가로축을 가진 물건인데
 * 폭 493px 세로 단에 밀어 넣으니 사슬은 끌어야 보이고 막대는 2.5% 눈금이 뭉갰다.
 *
 *   이 종목    머리줄 한 줄
 *   두 단      차트(1fr) | 계획 정보(392px)
 *   사슬       전폭.  높이가 «고정»이라 위에서 자리를 잡아 준다
 *   두 단      차트(1fr) | 계획 정보(392px).  차트는 지표를 켤 때마다 밑으로 자란다
 *
 * **차트가 주다.** 이 화면이 종목 상세를 대체하므로 차트가 그 폭(Q0 이 잰 826px)을
 * 가져야 한다. 사슬이 그 «바로 밑»인 것은 둘이 같은 X축(날짜)을 갖기 때문이다.
 *
 * **폭을 쓰는 것은 사슬뿐이다.** 태그와 접힘은 폭이 늘어도 얻는 게 없고
 * 오히려 눈이 흩어진다 (디자인 7장 ② — 시선을 직선으로).
 *
 * **위험노출은 전폭이 아니다.** 한때 전폭으로 뒀는데 4장 ①을 잘못 읽은 것이었다 —
 * 폭이 판정을 정확하게 만드는 것은 막대가 «여럿»이거나 눈금이 «촘촘할» 때다.
 * 막대 하나에 눈금 둘이면 좌우 관계만 보이면 끝난다. 전폭으로 떼어 두는 바람에
 * 그 카드가 분모(계좌)를 따로 이고 있었고, 계좌가 화면에 두 번 나왔다.
 *
 * 값은 세 층이다 — 1층 정도를 남기고, 2층 판정 결과만, 3층 온디맨드.
 * **층은 방향이 아니라 밀도다** (활자 크기 · 여백 · 접힘).
 */
const won = (n: number) => n.toLocaleString('ko-KR')

export function PlanDetailPage({
  stockCode,
  planId,
}: {
  stockCode: string
  /** 안 주면 화면이 하나를 «고른다» — 종목으로 들어온 경우다 */
  planId?: number
}) {
  // 종목이 먼저다. 사슬도 차트도 종목 하나에 묶여 있고, 계획은 그 안의 한 마디다
  const { data: siblings = [], isLoading: listing } = usePlanList({ stockCode })

  /**
   * 안 고르고 들어왔을 때 **무엇을 펴 주나.**
   *
   * 「실행 중」이 있으면 그것이다 — 종목당 하나뿐이고(④-2) *「지금 살아 있는
   * 판단」*이라 제일 먼저 봐야 하는 마디다. 없으면 «최신»을 편다.
   */
  const fallback =
    siblings.find((p) => p.status === 'RUNNING') ??
    [...siblings].sort((a, b) => b.writtenAt.localeCompare(a.writtenAt))[0]
  const targetId = planId ?? fallback?.planId

  const { data: plan, isLoading, isError } = usePlanDetail(targetId)
  const { data: position } = useStockPosition(stockCode)

  if (listing || (targetId != null && isLoading))
    return <Empty>불러오는 중…</Empty>
  // 계획이 «하나도 없는» 종목 — 사슬에 빈 자리 하나만 선다. 거기가 첫 계획의 문이다
  if (targetId == null) return <FirstPlanView stockCode={stockCode} />
  if (isError || !plan) return <Empty>계획을 찾지 못했습니다.</Empty>

  return <PlanDetailView plan={plan} position={position} siblings={siblings} />
}

/**
 * 계획이 **하나도 없는 종목**.
 *
 * 사슬에 마디가 없으므로 빈 자리 하나만 서고, 그게 첫 계획의 문이다.
 * 차트는 그대로 뜬다 — 계획이 없어도 종목은 보여야 하고, ④-1-1-1 의 자료가
 * 차트라서 **값을 정하려면 그게 먼저** 있어야 한다.
 *
 * 💀 이 화면이 없을 때는 「첫 계획을 세우는 길이 없다」는 문구만 떠 있었다.
 * 막고 있던 것은 새 계획 칸이 계좌·상한·후보 선을 «이어받는 계획»에서 읽던 것 —
 * 셋 다 계획의 값이 아닌데(계좌·⑦ 통계·종목) 편해서 거기서 읽고 있었다.
 * `PlanDefaults` 로 떼어내니 부모 없이도 선다.
 */
function FirstPlanView({ stockCode }: { stockCode: string }) {
  const { data: defaults } = usePlanDefaults(stockCode)
  const born = useNewPlan(stockCode, [])
  const { data: briefing } = usePlanBriefing(stockCode, born.draft != null)
  const { data: rows = [] } = useScreening(stockCode)
  const picked = rows.find((r) => r.date === born.draft?.snapshotDate)
  const [picking, setPicking] = useState<'entry' | 'stop' | null>(null)
  /**
   * 사슬을 «세로로» 넓힌다. 갈래가 늘면 마디가 세로로 쌓이는데 210px 안에서는
   * 위아래가 잘린다. 폭은 안 건드린다 — 가로는 이미 끌어서 본다
   */
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="flex flex-col gap-3 px-6 pt-4 pb-6">
      <section className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        <span className="font-number text-[18px] font-bold text-white">
          {stockCode}
        </span>
        <span className="text-[12px] text-white/35">계획 없음</span>
      </section>

      <section className="card px-4 py-2">
        <div>
          {/* 마디가 없으니 «빈 자리» 하나가 사슬의 전부다 */}
          <PlanChain
            plans={[]}
            currentId={-1}
            onCreate={born.draft ? born.cancel : born.open}
            creating={born.draft != null}
          />
          {/* 첫 계획이라도 «내 최근 매매» 와 조건별 성과는 있다 (Q17 2) */}
          {born.draft && briefing && (
            <div className="mt-1 border-t border-white/[0.06]">
              <PlanBriefing
                briefing={briefing}
                snap={picked}
                stopLimit={defaults?.stopLimit}
              />
            </div>
          )}
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_324px] items-start gap-3">
        <section
          className={cn(LIT_PANEL, 'sticky top-[68px] min-w-0 px-3 py-3')}
        >
          <PlanChart
            stockCode={stockCode}
            entryPrice={born.draft?.entryPrice ?? 0}
            stopPrice={born.draft?.stopPrice ?? 0}
            candidates={defaults?.stopCandidates ?? []}
            writtenAt={today}
            marksFrom={born.draft?.snapshotDate ?? today}
            drafting
            raiseTo={
              born.draft?.goals[0] != null
                ? goalPrice(
                    born.draft.entryPrice,
                    born.draft.stopPrice,
                    born.draft.goals[0],
                  )
                : null
            }
            editing={born.draft != null}
            picking={picking}
            onPick={(price) => {
              if (picking === 'entry') born.set('entryPrice', price)
              if (picking === 'stop') born.set('stopPrice', price)
              setPicking(null)
            }}
          />
        </section>

        {born.draft && defaults ? (
          <NewPlanForm
            born={born}
            defaults={defaults}
            rows={rows}
            picking={picking}
            onPicking={setPicking}
            briefing={briefing}
          />
        ) : (
          <section
            className={cn(
              LIT_PANEL,
              'min-w-0 px-5 py-10 text-center text-[13px] text-white/40',
            )}
          >
            이 종목에 계획이 없습니다.
            <div className="mt-1 text-[12px] text-white/25">
              사슬의 <span className="text-white/50">+</span> 를 눌러 첫 계획을
              세웁니다.
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

/**
 * 계획 하나를 그리는 몸통.
 *
 * 껍데기(`PlanDetailPage`)와 나눈 이유 — 편집 상태 훅이 `plan` 을 «받아야» 하는데,
 * 로딩 분기 뒤에서는 훅을 부를 수 없다.
 */
function PlanDetailView({
  plan,
  position,
  siblings,
}: {
  plan: PlanDetail
  position?: StockPositionView
  siblings: PlanListItem[]
}) {
  /**
   * 계좌 · 통계 · 종목에서 오는 값들. 계획이 아니라 «그 밖»에서 온다 —
   * 그래서 계획이 하나도 없는 종목에서도 첫 계획을 세울 수 있다
   */
  const { data: defaults } = usePlanDefaults(plan.stockCode)
  const draft = usePlanDraft(plan)
  const { editing, shown } = draft
  /**
   * 폐기와 삭제는 **다른 행위다** (Q8). 훅도 둘이고 자리도 둘이다 —
   * 폐기는 머리줄(평소 보이는 곳), 삭제는 3층 접힘 안(자주 쓸 게 아니다).
   */
  const close = usePlanClose()
  const remove = usePlanRemove(plan.planId)
  // 「이어서 세우기」 — 이 계획에서 갈라져 나오는 새 계획 (ⓐ-1)
  const born = useNewPlan(plan.stockCode, siblings, plan)
  const drafting = born.draft != null
  /**
   * 차트에서 «집는 중»인 칸. 진입가와 스톱가격 둘 다 차트 위의 선이라
   * 숫자를 쓰는 것보다 그 자리를 짚는 것이 실제 동작이다 (④-1-1-1).
   */
  const [picking, setPicking] = useState<'entry' | 'stop' | null>(null)
  /** 좁힌 사슬 — 지난 계획 · 넘친 대기는 오른쪽 위 「⤢ 사슬 전체」 가 보여 준다 */
  const narrowed = narrowChain(siblings, plan.planId)
  /** 고정 칸 안에서 **보는 계획이 보이게** 스크롤한다 — 칸 밖에 있으면 고른 게 안 보였다 */
  const chainBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = chainBoxRef.current
    const cur = box?.querySelector<HTMLElement>('[data-current]')
    if (!box || !cur) return
    const b = box.getBoundingClientRect()
    const c = cur.getBoundingClientRect()
    box.scrollTop += c.top - b.top - (b.height - c.height) / 2
    box.scrollLeft += c.left - b.left - (b.width - c.width) / 2
  }, [plan.planId, siblings.length])
  const today = new Date().toISOString().slice(0, 10)
  /** 고를 차례 단의 후보 (Q16 7) — 카드의 고르기와 차트의 후보 선이 같은 줄을 본다 */
  const pick = useMemo(() => pickOptionsOf(plan), [plan])
  /** 고른 칩 — 카드가 고르고 차트가 「새 스톱」 선으로 긋는다. 계획이 바뀌면 비운다 */
  const [choice, setChoice] = useState<PickChoice | null>(null)
  useEffect(() => setChoice(null), [plan.planId, pick?.index])

  /**
   * 새 계획 전에 볼 것 (Q17 2) — 세우는 동안 사슬 자리를 쓴다.
   * 💀 사슬은 «모양»이라 새 계획에 필요한 «결론»을 안 준다. 참조할 계획을 차트에 고를 때만
   *    「사슬 보기」 로 돌아간다.
   */
  const { data: briefing } = usePlanBriefing(plan.stockCode, drafting)
  /** 이 종목의 스크리닝 행 — 새 계획의 달력이 고르고, 고른 날이 스냅샷이 된다 (Q11 A) */
  const { data: rows = [] } = useScreening(plan.stockCode)
  const picked = rows.find((r) => r.date === born.draft?.snapshotDate)
  /**
   * 머리줄의 관문은 **«오늘» 판정**이다 — 계획을 눌러도 안 바뀐다. 보유 수량 · 평균 단가가 지금 값인데
   * 관문만 그날 값이면 한 줄 안에서 시점이 갈린다 (디자인 4장). 「그날 어땠나」 는 스냅샷 표가 답한다.
   */
  const latestGate = rows.at(-1)
  /**
   * 차트 오른쪽 끝에 설 날 — 살아 있는 계획(실행 중 · 대기)은 마지막 일봉(null),
   * 끝난 계획(실행 완료 · 폐기)은 끝난 날. 끝난 날은 마지막 매도일, 없으면 살아 있던 구간의 끝.
   */
  const viewEnd =
    plan.status === 'RUNNING' || plan.status === 'PLANNED'
      ? null
      : (plan.records
          .filter((r) => r.side === 'SELL')
          .map((r) => r.filledAt.slice(0, 10))
          .sort()
          .at(-1) ?? liveSpan(plan, siblings).to)
  /**
   * 💀 새 계획을 쓰는 동안 사슬 마디를 눌러 **참조할 계획**을 차트에 세웠었다 — 겹쳐 그리면 안 보이고,
   *    번갈아 그리면 옆 폼과 어긋났다. 과거 계획을 하나씩 열어 보며 쓸 일이 없다 (2026-09-17 사용자
   *    「최근에 그랬다 그 정도만 보면 되는 것 아님?」). 걸린 계획은 브리핑이 한 줄씩, 나머지는 통계가 말한다.
   */
  /**
   * **빈 곳**을 누르면 풀린다 — 사슬 카드의 빈 곳과 페이지 배경.
   * 마디 · 버튼 · 입력 · 팝오버 · 대화상자는 빈 곳이 아니다. 차트 · 폼 카드 안도 아니다 —
   * 거기서는 값을 집고 적는 중이라, 누를 때마다 참조가 사라지면 안 된다.
   */
  /**
   * 볼 때도 같다 — 지금 계획 마디를 다시 누르거나 빈 곳을 누르면 흰 테두리와 차트의
   * 계획 선이 빠진다. 캔들만 보고 싶을 때다. 다시 누르면 돌아온다 (2026-09-17).
   * 고치는 중에는 풀지 않는다 — 차트에서 값을 집는 중이다.
   */
  const [lit, setLit] = useState(true)
  useEffect(() => setLit(true), [drafting, plan.planId])
  const hideNow = !drafting && !editing && !lit
  /** 고르는 중 — 새 계획 · 수정이 아닐 때만. 차트의 목표 면이 «도착한» 단으로 선다 */
  const choosing = pick != null && !drafting && !editing && !hideNow

  useEffect(() => {
    const held = !drafting && !editing && lit
    if (!held) return
    const release = (e: MouseEvent) => {
      const t = e.target as Element
      if (
        t.closest(
          'a, button, input, textarea, select, [role="listbox"], [role="dialog"]',
        )
      )
        return
      // 카드 안(차트 · 폼 · 머리줄)은 빈 곳이 아니다. ⚠️ 차트 · 폼 카드는 `.card` 가 아니라
      // LIT_PANEL 이라 클래스로 못 가른다 — 카드는 전부 `section` 이다
      if (t.closest('section') && !t.closest('[data-chain]')) return
      setLit(false)
    }
    document.addEventListener('click', release)
    return () => document.removeEventListener('click', release)
  }, [drafting, editing, lit])
  /**
   * 치우려는 마디의 «이름». 문이 사슬에 있으므로 **지금 보는 계획이 아닐 수
   * 있다** — 어느 마디를 닫는지 칸이 말해야 한다.
   */
  const named = (id: number | null) =>
    siblings.find((p) => p.planId === id)?.title ?? plan.title

  const held = position?.quantity ?? 0

  return (
    <main className="flex flex-col gap-3 px-6 pt-4 pb-6">
      {/* ── 이 종목 · 한 줄 ─────────────────────────────────────────── */}
      <section className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        {/* 종목 이름 — **링크가 아니다.** 이 화면이 곧 종목 세부다 (2026-09-11) */}
        <div className="flex items-baseline gap-2">
          <span className="text-[18px] font-bold text-white">
            {plan.stockName}
          </span>
          <span className="font-number text-[12px] text-white/35">
            {plan.stockCode}
          </span>
        </div>

        {/* 레짐 배지 — 스냅샷 카드가 쓰던 «그» 배지다. 색은 레짐마다 정해져 있다 */}
        {/* 레짐 뱃지 → 진입 관문 뱃지 (2026-09-17) — 레짐과 진입 상태를 하나로.
            오늘의 스크리닝 판정이다. 판정이 없는 날(게이트에 걸림)은 마지막 판정 */}
        {latestGate && (
          <EntryGateBadge
            entryState={latestGate.entryState}
            regime={latestGate.regime}
          />
        )}

        {held > 0 ? (
          <>
            <Stat label="보유 수량" value={`${held}주`} />
            <Stat label="평균 단가" value={won(position!.avgPrice)} />
            {/* 위험노출과 «다른 값»이다. 위험은 스톱가격까지의 거리이고 이건 묶인 돈이다 */}
            <Stat label="평가액" value={won(held * position!.avgPrice)} />
          </>
        ) : (
          <Stat label="보유 수량" value="없음" />
        )}
        {/* ⚠️ 계좌 총액을 **머리줄에서 뺐다** (Q12). 여기 뜨던 것은 «지금» 계좌가 아니라
            보고 있는 계획이 등록할 때 얼린 값이었다 — 세우는 동안에도 옛 총액이 떠 있었다.
            위험노출의 «분모»라 위험노출 숫자 바로 밑으로 옮겼다 */}
      </section>

      {/* ── 계획 사슬 · 전폭 ───────────────────────────────────────────
          차트보다 «위»인 것은 높이가 고정이어서다. 차트는 지표를 켤 때마다 밑으로
          자라므로, 반대로 두면 지표 하나 켤 때마다 사슬이 밀려 내려간다. */}
      <section data-chain className="card px-4 py-2">
        {/* 칸을 «가둔다» — 갈래가 늘어도 카드가 세로로 자라지 않고 안에서 움직인다.
            ⚠️ 찾아가는 줄(실행 중 · 기간 · 확대)이 위에 하나 얹히므로
               그만큼 더 준다. 카드 높이는 그대로다.
            ⚠️ 「계획 사슬」 이름표를 뺐다 (2026-09-11) — 보면 사슬인 걸 안다 */}
        {/* 좁힌 사슬은 마디가 넷 안팎이라 210 → 170 (Q12 — 보조로 내리고 높이만 줄인다).
            대기 둘이 세로로 쌓이는 높이까지는 든다 */}
        {/* 세우는 동안 **사슬은 아예 안 뜬다** — 브리핑이 자리를 쓴다 (2026-09-17 사용자).
            💀 걸린 계획 표 → 브리핑 밑 사슬 → 걸린 계획만 남긴 사슬 을 거쳤다. 새 계획을 세우는 데
               계획 이력은 필요 없었다 — 「최근에 그랬다」 는 브리핑 카드가 말한다 */}
        {drafting ? (
          briefing && (
            <PlanBriefing
              briefing={briefing}
              snap={picked}
              stopLimit={defaults?.stopLimit}
            />
          )
        ) : (
          <div className="relative">
            {/* 오른쪽 위 — 사슬 전체를 팝업으로 (2026-09-17 (C)). 지난 계획 · 대기 팝오버를 대신한다 */}
            <div className="absolute top-1.5 right-0 z-10">
              <ChainOverview
                plans={siblings}
                currentId={plan.planId}
                onClose={close.openFor}
                onRemove={remove.askFor}
              />
            </div>
            {/* **고정 칸** — 지금 높이(대기 둘 + 「+ 새 계획」)에서 멈춘다. 넘치면 칸 안에서 스크롤 (2026-09-17 사용자
                「계속 늘어나면 안 됨」). 151 = 카드 167 − 위아래 여백 16 */}
            <div
              ref={chainBoxRef}
              className="h-[151px] overflow-auto pr-10 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]"
            >
              <PlanChain
                // 좁힌 사슬 — 직전 → 실행 중 → 대기 둘 (Q12)
                plans={narrowed.shown}
                // 흰 테두리 하나 = 보는 계획
                currentId={lit ? plan.planId : null}
                onCreate={born.open}
                // 사슬의 «어느 마디든» 치울 수 있다 — 문턱 판정은 마디가 스스로 한다
                onClose={close.openFor}
                onRemove={remove.askFor}
                // 볼 때는 지금 계획 마디만 켜고 끈다 — 다른 마디는 링크대로 옮겨 간다
                onPick={(id) => {
                  if (id !== plan.planId) return false
                  if (!editing) setLit((v) => !v)
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── 두 단 · 축이 없는 것들 ─────────────────────────────────────── */}
      {/* 차트 : 계획 정보 = 1fr : 448px.
          Q0 이 잰 826px 은 «차트가 유일한 주인공이던 때»의 값이다 — 그때는 오른쪽에
          계획 정보가 없었다. 지금은 「진입가를 차트에서 고르고 그 결과를 옆에서 읽는」
          구조라 두 칸이 같이 읽혀야 하고, 계획 정보가 172px 짜리 두 칸으로 쪼개져
          경고 문구(「✕ 현금 …보다 …크다」)가 잘리고 있었다.
          차트는 770px 로 줄지만 90봉이면 봉당 8.5px 이라 Q0 이 걱정한 516px 과 멀다. */}
      <div className="grid grid-cols-[minmax(0,1fr)_324px] items-start gap-3">
        {/* 차트가 «주»다 — 종목 상세를 대체하는 화면이므로 차트가 그 폭을 가져야 한다.
            Q0 이 잰 값이 826px 이고, 여기 1fr 이 그 근처에 선다 */}
        {/* 차트 카드를 **붙잡아 둔다** (Q12 영역). 계획 칸이 길어 끝까지 내려도 차트가
            옆에 남아야 진입가 · 스톱가격을 차트에서 집을 수 있다.
            top 68 = 상단 내비 56 + 간격 12 */}
        <section
          className={cn(LIT_PANEL, 'sticky top-[68px] min-w-0 px-3 py-3')}
        >
          <PlanChart
            stockCode={plan.stockCode}
            /**
             * 새 계획을 쓰는 동안에는 **그 계획의 값**을 그린다 — 아직 없으면
             * 0 이라 선이 안 그려지고, 대신 `origin` 이 이어받는 자리를 흐리게
             * 말한다. 다 쓰고 나면 두 벌이 같은 축 위에 선다.
             */
            entryPrice={
              born.draft
                ? born.draft.entryPrice
                : hideNow
                  ? 0
                  : shown.entryPrice
            }
            stopPrice={
              born.draft ? born.draft.stopPrice : hideNow ? 0 : shown.stopPrice
            }
            picking={born.draft ? picking : null}
            onPick={(price) => {
              if (picking === 'entry') born.set('entryPrice', price)
              if (picking === 'stop') born.set('stopPrice', price)
              // 한 번 집으면 «끈다» — 켜 둔 채로 끌면 값이 계속 바뀐다
              setPicking(null)
            }}
            candidates={plan.stopCandidates}
            // 새 계획을 쓰는 동안에는 «오늘»로 옮겨간다 — 오늘 세우는 계획이다
            writtenAt={born.draft ? today : plan.writtenAt}
            viewEnd={viewEnd}
            // 지금 계획은 스냅샷 날짜부터, 새 계획은 오늘부터 (Q12 기간만)
            marksFrom={
              // 보기 — 작성일(차트의 회색 점선)부터. 스냅샷 날짜가 앞서도 선은 그날 세운 계획이다
              born.draft ? (born.draft.snapshotDate ?? today) : plan.writtenAt
            }
            drafting={born.draft != null}
            raiseTo={
              born.draft
                ? born.draft.goals[0] != null
                  ? goalPrice(
                      born.draft.entryPrice,
                      born.draft.stopPrice,
                      born.draft.goals[0],
                    )
                  : null
                : choosing
                  ? // 고르는 동안은 «도착한» 목표까지 — 다음 목표는 고른 뒤에 선다
                    pick.goalPrice
                  : hideNow || shown.goals[0] == null
                    ? null
                    : goalPrice(
                        shown.entryPrice,
                        shown.stopPrice,
                        shown.goals[0],
                        plan.initialStopWidth,
                      )
            }
            // 후보 선은 «고를 때»만 뜬다 — 늘 떠 있으면 넷이 캔들을 가린다
            editing={editing}
            // 고른 새 스톱 하나만 긋는다 (Q16 · 후보를 전부 긋지 않는다)
            pickLine={choosing ? choice : null}
          />
          {/* ④-0 스냅샷 줄은 없다 (2026-09-17 사용자 「이 줄 자체를 주지 마라」) —
              날짜는 ① 근거가, 진입 관문은 머리줄이, 트렌드 · 52주 · RS 는 브리핑이 말한다 */}
        </section>

        {/* ── 세부 — **한 자리에 하나만 선다** ────────────────────────────
            새 계획을 쓰는 동안에는 이 칸이 통째로 그 폼이 된다.
            💀 처음엔 세부 «위에» 칸을 하나 덧붙였는데, 이 열이 392px 이라
               6칸짜리 폼이 눌려서 제대로 안 보였다. 그리고 아래 내용을 밀어내
               쓰는 동안 정작 근거가 화면 밖으로 나갔다.
            같은 틀을 쓰면 **쓰는 모양이 곧 될 모양**이라 배울 것도 없다. */}
        {born.draft && defaults ? (
          <NewPlanForm
            born={born}
            defaults={defaults}
            rows={rows}
            picking={picking}
            onPicking={setPicking}
            briefing={briefing}
          />
        ) : (
          <PlanCard
            plan={plan}
            pick={pick}
            choice={choice}
            onChoice={setChoice}
            draft={draft}
            close={close}
            remove={remove}
            named={named}
          />
        )}
      </div>
    </main>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <main className="px-6 pt-6">
    <section className="card px-5 py-14 text-center text-[13px] text-white/40">
      {children}
    </section>
  </main>
)

const Stat = ({
  label,
  value,
  tail,
  className,
}: {
  label: string
  value: string
  tail?: string
  className?: string
}) => (
  <span
    className={cn('flex items-baseline gap-1.5 whitespace-nowrap', className)}
  >
    <span className="text-[11px] text-white/40">{label}</span>
    <span className="font-number text-[15px] text-white">{value}</span>
    {tail && (
      <span className="font-number text-[11px] text-white/40">{tail}</span>
    )}
  </span>
)
