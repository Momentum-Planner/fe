import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { fromServerRegime } from '@/shared/lib/snapshots'
import { RegimeBadge } from '@/shared/ui/RegimeBadge'
import { useRegimeInsight } from '@/entities/stock'
import {
  PLAN_STATUS_LABEL,
  usePlanDefaults,
  usePlanDetail,
  usePlanList,
  useStockPosition,
  useUpdatePlan,
} from '@/entities/plan'
import type {
  PlanDetail,
  PlanListItem,
  StockPositionView,
} from '@/entities/plan'
import { PlanChain } from './PlanChain'
import { PlanChart } from './PlanChart'
import { RiskBar } from './RiskBar'
import { NewPlanForm } from './NewPlanForm'
import { useNewPlan } from './useNewPlan'
import { usePlanClose, usePlanRemove } from './usePlanRetire'
import { usePlanDraft } from './usePlanDraft'

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

/** 손절폭의 «절대» 상한. 통계가 없어도 이 위로는 안 간다 (④-1-1-2) */
const HARD_LIMIT = 10

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
  const [picking, setPicking] = useState<'entry' | 'stop' | null>(null)
  /**
   * 사슬을 «세로로» 넓힌다. 갈래가 늘면 마디가 세로로 쌓이는데 210px 안에서는
   * 위아래가 잘린다. 폭은 안 건드린다 — 가로는 이미 끌어서 본다
   */
  const [wide, setWide] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="flex flex-col gap-3 px-6 pt-4 pb-6">
      <section className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        <span className="font-number text-[18px] font-bold text-white">
          {stockCode}
        </span>
        <span className="text-[12px] text-white/35">계획 없음</span>
      </section>

      <section className="card px-4 py-3">
        <div className={cn('relative', wide ? 'h-[460px]' : 'h-[210px]')}>
          {/* 마디가 없으니 «빈 자리» 하나가 사슬의 전부다 */}
          <PlanChain
            plans={[]}
            currentId={-1}
            zoomed={wide}
            onZoom={() => setWide((v) => !v)}
            onCreate={born.draft ? born.cancel : born.open}
            creating={born.draft != null}
          />
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_392px] items-start gap-3">
        <section className="card min-w-0 px-3 py-3">
          <PlanChart
            stockCode={stockCode}
            entryPrice={born.draft?.entryPrice ?? 0}
            stopPrice={born.draft?.stopPrice ?? 0}
            candidates={defaults?.stopCandidates ?? []}
            writtenAt={today}
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
            picking={picking}
            onPicking={setPicking}
          />
        ) : (
          <section className="card min-w-0 px-5 py-10 text-center text-[13px] text-white/40">
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
   * 레짐은 **«오늘» 판정**이다 — 계획을 눌러도 안 바뀐다.
   *
   * 머리줄은 「이 종목이 «지금» 어디에 서 있나」를 답하는 자리다. 보유 수량·평균
   * 단가가 지금 값인데 레짐만 그날 값이면 한 줄 안에서 시점이 갈린다 — 어느 게 어느
   * 시점인지 매번 물어야 한다 (디자인 4장 ⑤ · ⑧).
   * 「그날 어땠나」는 2층 근거 블록이 스냅샷으로 답한다.
   */
  const { data: regime } = useRegimeInsight(plan.stockCode)
  /**
   * 계좌 · 통계 · 종목에서 오는 값들. 계획이 아니라 «그 밖»에서 온다 —
   * 그래서 계획이 하나도 없는 종목에서도 첫 계획을 세울 수 있다
   */
  const { data: defaults } = usePlanDefaults(plan.stockCode)
  const update = useUpdatePlan(plan.planId)
  const { editing, shown, derived, patch, dirty, begin, cancel, set } =
    usePlanDraft(plan)
  /**
   * 폐기와 삭제는 **다른 행위다** (Q8). 훅도 둘이고 자리도 둘이다 —
   * 폐기는 머리줄(평소 보이는 곳), 삭제는 3층 접힘 안(자주 쓸 게 아니다).
   */
  const close = usePlanClose()
  const remove = usePlanRemove(plan.planId)
  // 「이어서 세우기」 — 이 계획에서 갈라져 나오는 새 계획 (ⓐ-1)
  const born = useNewPlan(plan.stockCode, siblings, plan)
  /**
   * 차트에서 «집는 중»인 칸. 진입가와 스톱가격 둘 다 차트 위의 선이라
   * 숫자를 쓰는 것보다 그 자리를 짚는 것이 실제 동작이다 (④-1-1-1).
   */
  const [picking, setPicking] = useState<'entry' | 'stop' | null>(null)
  /**
   * 사슬을 «세로로» 넓힌다. 갈래가 늘면 마디가 세로로 쌓이는데 210px 안에서는
   * 위아래가 잘린다. 폭은 안 건드린다 — 가로는 이미 끌어서 본다
   */
  const [wide, setWide] = useState(false)
  /**
   * 치우려는 마디의 «이름». 문이 사슬에 있으므로 **지금 보는 계획이 아닐 수
   * 있다** — 어느 마디를 닫는지 칸이 말해야 한다.
   */
  const named = (id: number | null) =>
    siblings.find((p) => p.planId === id)?.title ?? plan.title

  const held = position?.quantity ?? 0
  const walked = plan.status === 'RUNNING' || plan.status === 'DONE'
  const stopWidth = derived.stopWidth
  const needCash = derived.needCash

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
        {regime && <RegimeBadge regime={fromServerRegime(regime.regime)} />}

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
        {/* 계좌 총액은 위험노출의 «분모»다 (F7). 계획이 등록 시점 값을 얼려 간다 */}
        <Stat
          label="계좌 총액"
          value={won(plan.accountTotal)}
          className="ml-auto"
        />
      </section>

      {/* ── 계획 사슬 · 전폭 ───────────────────────────────────────────
          차트보다 «위»인 것은 높이가 고정이어서다. 차트는 지표를 켤 때마다 밑으로
          자라므로, 반대로 두면 지표 하나 켤 때마다 사슬이 밀려 내려간다. */}
      <section className="card px-4 py-3">
        {/* 칸을 «가둔다» — 갈래가 늘어도 카드가 세로로 자라지 않고 안에서 움직인다.
            ⚠️ 찾아가는 줄(실행 중 · 기간 · 확대)이 위에 하나 얹히므로
               그만큼 더 준다. 카드 높이는 그대로다.
            ⚠️ 「계획 사슬」 이름표를 뺐다 (2026-09-11) — 보면 사슬인 걸 안다 */}
        <div className={cn('relative', wide ? 'h-[460px]' : 'h-[210px]')}>
          <PlanChain
            plans={siblings}
            currentId={plan.planId}
            zoomed={wide}
            onZoom={() => setWide((v) => !v)}
            // 쓰는 동안 그 자리가 **「쓰는 중」으로 켜진다.** 없애지 않는다 —
            // 세부 칸이 «어느 마디»를 만드는 중인지를 사슬이 말해야 한다
            // 만드는 중에 다시 누르면 «끝낸다» — 켠 자리에서 끈다
            onCreate={born.draft ? born.cancel : born.open}
            creating={born.draft != null}
            // 사슬의 «어느 마디든» 치울 수 있다 — 문턱 판정은 마디가 스스로 한다
            onClose={close.openFor}
            onRemove={remove.askFor}
          />
        </div>
      </section>

      {/* ── 두 단 · 축이 없는 것들 ─────────────────────────────────────── */}
      {/* 차트 : 계획 정보 = 1fr : 448px.
          Q0 이 잰 826px 은 «차트가 유일한 주인공이던 때»의 값이다 — 그때는 오른쪽에
          계획 정보가 없었다. 지금은 「진입가를 차트에서 고르고 그 결과를 옆에서 읽는」
          구조라 두 칸이 같이 읽혀야 하고, 계획 정보가 172px 짜리 두 칸으로 쪼개져
          경고 문구(「✕ 현금 …보다 …크다」)가 잘리고 있었다.
          차트는 770px 로 줄지만 90봉이면 봉당 8.5px 이라 Q0 이 걱정한 516px 과 멀다. */}
      <div className="grid grid-cols-[minmax(0,1fr)_448px] items-start gap-3">
        {/* 차트가 «주»다 — 종목 상세를 대체하는 화면이므로 차트가 그 폭을 가져야 한다.
            Q0 이 잰 값이 826px 이고, 여기 1fr 이 그 근처에 선다 */}
        <section className="card min-w-0 px-3 py-3">
          <PlanChart
            stockCode={plan.stockCode}
            /**
             * 새 계획을 쓰는 동안에는 **그 계획의 값**을 그린다 — 아직 없으면
             * 0 이라 선이 안 그려지고, 대신 `origin` 이 이어받는 자리를 흐리게
             * 말한다. 다 쓰고 나면 두 벌이 같은 축 위에 선다.
             */
            entryPrice={born.draft ? born.draft.entryPrice : shown.entryPrice}
            stopPrice={born.draft ? born.draft.stopPrice : shown.stopPrice}
            picking={born.draft ? picking : null}
            onPick={(price) => {
              if (picking === 'entry') born.set('entryPrice', price)
              if (picking === 'stop') born.set('stopPrice', price)
              // 한 번 집으면 «끈다» — 켜 둔 채로 끌면 값이 계속 바뀐다
              setPicking(null)
            }}
            candidates={plan.stopCandidates}
            writtenAt={plan.writtenAt}
            // 후보 선은 «고를 때»만 뜬다 — 늘 떠 있으면 넷이 캔들을 가린다
            editing={editing}
          />
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
            picking={picking}
            onPicking={setPicking}
          />
        ) : (
          <section className="card min-w-0 px-5 py-4">
            {/* 머리줄 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-[12px]',
                  plan.status === 'RUNNING'
                    ? 'bg-brand-red/15 text-brand-red'
                    : plan.status === 'PLANNED'
                      ? 'bg-brand-blue/15 text-brand-blue'
                      : 'bg-white/[0.08] text-white/70',
                )}
              >
                {PLAN_STATUS_LABEL[plan.status]}
              </span>
              {/* 계획 이름 — 값만 봐서는 어느 계획인지 못 가른다.
                **고칠 수 있다** — 세우고 나서야 「이게 무슨 계획이었지」가
                분명해지는 일이 잦다. 고치는 자리도 «읽는 그 자리»다 */}
              {editing ? (
                <input
                  value={shown.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="계획 이름"
                  className="bg-bg-input w-[220px] rounded-md px-2 py-0.5 text-[15px] font-bold text-white outline-none placeholder:font-normal placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
                />
              ) : (
                <span className="text-[15px] font-bold text-white">
                  {plan.title}
                </span>
              )}
              <span className="font-number text-[11px] text-white/30">
                {plan.writtenAt} 작성
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {editing ? (
                  <>
                    {/* 「저장」은 «고친 게 있을 때만» 산다 — 안 고치고 누르는 저장은
                      아무 일도 안 하면서 한 일처럼 보인다 */}
                    <Btn
                      onClick={() => {
                        update.mutate(patch, { onSuccess: cancel })
                      }}
                      disabled={!dirty || update.isPending}
                      tone="go"
                    >
                      {update.isPending ? '저장 중…' : '저장'}
                    </Btn>
                    <Btn onClick={cancel}>취소</Btn>
                  </>
                ) : (
                  <>
                    {/* ⚠️ **여기에는 「수정」밖에 없다.** 흐름을 바꾸는 셋
                      (이어서 세우기 · 폐기 · 삭제)은 전부 **사슬**이 문이다.
                      버튼으로 두면 그 일이 «어느 마디»에 일어나는지가 화면에
                      없어서 매번 다시 물어야 한다. 사슬에서는 자리가 곧 답이다.

                      ```
                      사슬   흐름을 «바꾸는 문»    + · 폐기 · 삭제
                      세부   값을 «만지는 자리»    수정 + 그 문들이 여는 칸
                      ``` */}
                    <Btn onClick={begin}>수정</Btn>
                  </>
                )}
              </div>
            </div>

            {/* ── 1층 · 위험노출.  이 카드 안에서 «결론»이 3열보다 먼저 온다 ── */}
            <div className="mt-3.5 rounded-[10px] bg-white/[0.04] px-3.5 py-3">
              {/* 산출값이 «즉시» 따라온다 — 손을 떼기 전에 결과를 본다 (디자인 9장 ④) */}
              <RiskBar before={plan.riskBefore} after={derived.riskAfter} />
            </div>

            {/* ── 「얼마에 얼마나」 — 한 줄 ─────────────────────────────
              **새 계획 칸과 같은 배치다** (`NewPlanForm`). 쓰는 모양과 읽는
              모양이 같아야 세우고 나서 배울 것이 없다.
              진입가와 수량은 같은 판단의 두 쪽이고(곱하면 필요 현금),
              스톱가격은 「어디서 자를까」라 다른 판단이라 아래로 뗀다. */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Cell
                label="진입 예상가"
                value={won(shown.entryPrice)}
                edit={
                  editing && {
                    value: shown.entryPrice,
                    onChange: (n) => set('entryPrice', n),
                  }
                }
                sub={editing ? '차트를 보고 넣는다' : undefined}
              />
              <Cell
                label="수량"
                value={`${shown.quantity}주`}
                unit="주"
                edit={
                  editing && {
                    value: shown.quantity,
                    onChange: (n) => set('quantity', n),
                  }
                }
                sub={`필요 현금 ${won(needCash)}`}
                // ✕ 「기록상 현금보다 큰 매수는 막는다」 — 살 돈이 있는지를
                //   증권사 앱에 미루지 않는다 (④-1-3)
                block={
                  needCash > plan.accountCash
                    ? `✕ 현금 ${won(plan.accountCash)} 보다 ${won(needCash - plan.accountCash)} 크다`
                    : undefined
                }
              />
            </div>

            {/* ── 스톱가격 — 따로 선다. 「어디서 자를까」는 다른 판단이다 ──── */}
            <div className="mt-2 rounded-[10px] bg-white/[0.04] px-3.5 py-3">
              <div className="grid grid-cols-2 items-end gap-3">
                <Cell
                  label="스톱가격"
                  value={won(shown.stopPrice)}
                  edit={
                    editing && {
                      value: shown.stopPrice,
                      onChange: (n) => set('stopPrice', n),
                    }
                  }
                  sub={
                    plan.initialStopWidth
                      ? `1R ${won(plan.initialStopWidth)} · ${stopWidth.toFixed(2)}%`
                      : `1R ${won(derived.oneR)} · ${stopWidth.toFixed(2)}%`
                  }
                  // ⚠ 「손절폭 10% 초과 — 그 종목은 포기한다」. 막지는 않는다
                  warn={
                    stopWidth > HARD_LIMIT
                      ? `⚠ 손절폭 ${HARD_LIMIT}% 초과 — 포기하는 자리다`
                      : stopWidth > plan.stopLimit
                        ? `⚠ 상한 ${plan.stopLimit}% 초과`
                        : undefined
                  }
                />

                {/**
                 * 손절폭 상한 — **고칠 때만 뜬다.**
                 *
                 * 💀 늘 띄웠더니 읽는 화면에 「상한 2.36% · 평균수익 4.72% ÷
                 * 손익비 2」가 상시로 서 있었다. 이미 정해진 스톱가격을 보는
                 * 자리에서는 **상한이 아무 일도 안 한다** — 넘었으면 스톱가격 칸에
                 * ⚠ 가 이미 붙어 있다.
                 *
                 * 상한은 «고를 때» 쓰는 선이다 (④-1-1-2 — `min(평균수익 ÷ 손익비,
                 * 10%)`). 정하는 것이 차트가 아니라 **내 평균 수익**이라, 어디까지
                 * 내려갈 수 있는지를 «지금 정하는 사람»만 알면 된다.
                 */}
                {editing && (
                  <div className="pb-1 text-right text-[10px] leading-tight">
                    <span className="text-white/45">
                      상한 {plan.stopLimit}%
                    </span>
                    <div className="text-white/25">
                      {plan.stopLimitBasis
                        ? `평균수익 ${plan.stopLimitBasis.avgWin}% ÷ 손익비 ${plan.stopLimitBasis.targetRR}`
                        : `통계 없음 — ${HARD_LIMIT}%`}
                    </div>
                  </div>
                )}
              </div>

              {/**
               * 후보 선 — **서비스가 하나를 정해 주지 않는다** (④-1-1-2).
               * 읽을 때는 「왜 «거기»에 뒀나」를 답하는 목록이고, 고칠 때는
               * 고르는 목록이다. 그래서 고칠 때만 «버튼»이 된다 —
               * 안 눌리는 것이 버튼처럼 생기면 눌러 보게 된다.
               */}
              <div className="mt-2 flex flex-col gap-0.5 border-t border-white/[0.06] pt-2">
                {plan.stopCandidates.map((c) => {
                  const chosen = c.price === shown.stopPrice
                  const row = (
                    <>
                      <span className={chosen ? 'text-white' : 'text-white/45'}>
                        {c.label}
                      </span>
                      <span className="font-number text-right text-white/75 tabular-nums">
                        {won(c.price)}
                      </span>
                      <span className="font-number text-right text-white/35 tabular-nums">
                        −{c.width}%
                      </span>
                    </>
                  )
                  const shape = cn(
                    'grid grid-cols-[104px_1fr_50px] items-center gap-2 rounded-md px-2 py-1 text-left text-[12px]',
                    chosen && 'bg-white/[0.09]',
                    // 상한을 넘는 선은 «지우지 않고» 흐리게 남긴다 —
                    // 지우면 「왜 이 선이 없나」를 다시 물어야 한다
                    c.overLimit && !chosen && 'opacity-35',
                  )
                  return editing ? (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => set('stopPrice', c.price)}
                      className={cn(shape, 'hover:bg-white/[0.12]')}
                    >
                      {row}
                    </button>
                  ) : (
                    <div key={c.label} className={shape}>
                      {row}
                    </div>
                  )
                })}
              </div>

              {/**
               * 스톱 갱신 규칙 셋 — **스톱가격과 «같이» 선다** (③-3 · ④-1-4).
               *
               * 💀 접힘 안에 뒀었다. 「어디서 자를까」와 「수익이 나면 어디로
               * 올릴까」는 **같은 선의 두 시점**이라 떨어뜨릴 이유가 없었다 —
               * 무엇을 켜 뒀는지가 스톱가격을 볼 때 같이 보여야 한다.
               *
               * **꺼둔 규칙도 자리를 지킨다** (③-3-1) — 셋 중 무엇을 껐는지가
               * 화면에서 사라지면 껐다는 사실을 잊는다.
               */}
              <div className="mt-2 border-t border-white/[0.06] pt-2">
                <div className="mb-1.5 text-[10px] text-white/40">
                  스톱 갱신 규칙
                </div>
                {editing ? (
                  <div className="flex flex-col gap-1.5">
                    {/* 스톱 상향은 «임계 R» 을 같이 고른다 — 켬/끔만으로는 안 된다 (④-1-4) */}
                    <div className="flex items-center gap-1.5">
                      <Toggle
                        on={shown.raiseAtR != null}
                        onClick={() =>
                          set('raiseAtR', shown.raiseAtR == null ? 2 : null)
                        }
                      >
                        스톱 상향
                      </Toggle>
                      {shown.raiseAtR != null &&
                        [2, 3].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => set('raiseAtR', r)}
                            className={cn(
                              'font-number rounded-md px-2 py-0.5 text-[11px]',
                              shown.raiseAtR === r
                                ? 'bg-white/[0.14] text-white'
                                : 'bg-white/[0.04] text-white/40 hover:text-white/70',
                            )}
                          >
                            {r}R
                          </button>
                        ))}
                    </div>
                    <Toggle
                      on={shown.trail50}
                      onClick={() => set('trail50', !shown.trail50)}
                    >
                      50일선 트레일링
                    </Toggle>
                    <Toggle
                      on={shown.backstop}
                      onClick={() => set('backstop', !shown.backstop)}
                    >
                      백스톱
                    </Toggle>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <Tag on={shown.raiseAtR != null}>
                      스톱 상향 {shown.raiseAtR ?? '—'}R
                    </Tag>
                    <Tag on={shown.trail50}>50일선 트레일링</Tag>
                    <Tag on={shown.backstop}>백스톱</Tag>
                  </div>
                )}
              </div>
            </div>

            {/**
             * 메모 — **고정 칸이다. 접지 않는다.**
             *
             * 분류가 안 붙는 자유 서술이라(④) 접어 두면 아무도 안 쓴다.
             * 계획에서 「왜」를 담는 유일한 자리다.
             */}
            <div className="mt-2">
              {editing ? (
                <textarea
                  value={shown.memo}
                  onChange={(e) => set('memo', e.target.value)}
                  rows={3}
                  placeholder="왜 여기서 사려는가"
                  className="bg-bg-input w-full resize-y rounded-md px-2.5 py-2 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
                />
              ) : plan.memo ? (
                <div className="rounded-[10px] bg-white/[0.04] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/60">
                  {plan.memo}
                </div>
              ) : (
                <div className="text-[11px] text-white/25">메모 없음</div>
              )}
            </div>

            {/* 실행된 계획이면 «실제»가 1층이다 — 계획값보다 체결이 답이라서 */}
            {walked && plan.records.length > 0 && (
              <div className="mt-2 rounded-[10px] bg-white/[0.04] px-3 py-2.5">
                <div className="flex items-baseline gap-2 text-[11px]">
                  <span className="text-white/40">체결</span>
                  <span className="font-number text-white/70">
                    {plan.recordCount}건 · 체결률{' '}
                    {Math.round(plan.fillRate * 100)}%
                  </span>
                  <ActualVsPlan plan={plan} />
                </div>
                {/* 체결이 붙으면 폐기도 삭제도 «없다» — 「안 갔다」가 거짓이 되고
                  거래 기록이 이 계획을 가리킨다. 버튼이 사라진 이유를 여기서
                  말한다. 버튼만 없애면 「왜 없나」를 다시 물어야 한다 (4장 ⑤) */}
                {plan.status === 'RUNNING' && (
                  <div className="mt-1 text-[11px] text-white/35">
                    체결이 붙어 치울 수 없다 — 끝내는 길은 매도 계획이다
                  </div>
                )}
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {plan.records.map((r) => (
                    <div
                      key={r.recordId}
                      className="font-number grid grid-cols-[92px_32px_1fr_56px] items-center gap-2 text-[12px]"
                    >
                      <span className="text-white/40">
                        {r.filledAt.slice(5)}
                      </span>
                      <span className="text-white/55">
                        {r.side === 'BUY' ? '매수' : '매도'}
                      </span>
                      <span className="text-right text-white/85">
                        {won(r.price)}
                      </span>
                      <span className="text-right text-white/55">
                        {r.quantity}주
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 폐기 사유를 «받는» 자리. 보여주는 자리와 같은 칸이다 ──────
              사유가 **필수다** — 폐기는 판단이고, 판단에는 이유가 있다.
              ⑦가 폐기 비율로 세므로 이유 없이 닫힌 행이 쌓이면 그 비율이
              아무것도 못 말한다 (Q8). */}
            {close.target != null && (
              <div className="border-warning/30 mt-2 rounded-[10px] border bg-white/[0.04] px-3 py-2.5">
                <div className="text-[11px] text-white/55">
                  폐기 — <span className="text-white/80">안 가기로 한 것</span>
                  이다. 계획은 사라지지 않고 ⑦의 폐기 비율에 센다.
                </div>
                <textarea
                  value={close.reason}
                  onChange={(e) => close.setReason(e.target.value)}
                  rows={2}
                  autoFocus
                  // 카테고리로 고르게 하지 않는다 (④-2)
                  placeholder="왜 안 가기로 했는가"
                  className="bg-bg-input mt-2 w-full resize-y rounded-md px-2.5 py-2 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
                />
                <div className="mt-2 flex items-center gap-1.5">
                  <Btn
                    onClick={close.doClose}
                    disabled={!close.reason.trim() || close.pending}
                    tone="go"
                  >
                    {close.pending ? '폐기 중…' : '폐기'}
                  </Btn>
                  <Btn onClick={close.cancel}>취소</Btn>
                  {!close.reason.trim() && (
                    <span className="text-[11px] text-white/35">
                      사유 없이 닫을 수 없다
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── 삭제 — 폐기와 «나란히», 뜻은 이 패널이 말한다 ──────────── */}
            {remove.target != null && (
              <div className="border-brand-red/30 mt-2 rounded-[10px] border bg-white/[0.04] px-3 py-2.5">
                <div className="text-[11px] leading-relaxed text-white/55">
                  <span className="text-white/80">
                    「{named(remove.target)}」
                  </span>{' '}
                  — 잘못 적은 것이다. 행이 사라지고 ⑦가 «세지 않는다». 폐기와
                  달리 판단이 아니라 기록을 고치는 것이라 사유를 안 받는다.
                </div>
                <div className="text-warning mt-1 text-[11px]">
                  ⚠ 되돌릴 수 없다
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Btn
                    onClick={remove.confirm}
                    disabled={remove.pending}
                    tone="go"
                  >
                    {remove.pending ? '삭제 중…' : '삭제한다'}
                  </Btn>
                  <Btn onClick={remove.cancel}>취소</Btn>
                </div>
              </div>
            )}

            {plan.status === 'CLOSED' && (
              <div className="mt-2 rounded-[10px] bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/60">
                <span className="text-white/35">폐기 사유 — </span>
                {plan.closeReason}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

/**
 * ⚠️ `TrendTag` 를 지웠다 (2026-09-11) — **근거 블록을 통째로 들어냈다.**
 *    ④-0 의 25개 값을 「알아볼 수 있게」 보여주는 문제가 안 풀렸고,
 *    계획 루프(⑦→⑧)를 어떻게 돌릴지 정한 뒤에 다시 세우기로 했다.
 *    스냅샷 «데이터»는 그대로 붙는다 — F4 가 사후에 못 만든다고 했으므로.
 */

/** 계획가와 실제 평단의 차이 — 이 화면에서 «처음» 보이는 값이다 */
function ActualVsPlan({ plan }: { plan: PlanDetail }) {
  const buys = plan.records.filter((r) => r.side === 'BUY')
  const qty = buys.reduce((n, r) => n + r.quantity, 0)
  if (!qty) return null
  const avg = buys.reduce((n, r) => n + r.price * r.quantity, 0) / qty
  const diff = ((avg - plan.entryPrice) / plan.entryPrice) * 100
  return (
    <span className="font-number ml-auto text-white/50">
      평단 {won(Math.round(avg))} · 계획가 대비{' '}
      <span className={diff > 0 ? 'text-brand-red' : 'text-white/70'}>
        {diff > 0 ? '+' : ''}
        {diff.toFixed(2)}%
      </span>
    </span>
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

const Btn = ({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  /** `go` 는 «실제로 저장하는» 버튼. 나머지와 무게가 달라야 한다 */
  tone?: 'go'
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'rounded-full px-3 py-1 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      tone === 'go'
        ? 'bg-brand-red/85 hover:bg-brand-red text-white'
        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white',
    )}
  >
    {children}
  </button>
)

const Tag = ({
  children,
  on = true,
}: {
  children: React.ReactNode
  on?: boolean
}) => (
  <span
    className={cn(
      'rounded-md px-2 py-0.5 text-[11px]',
      on ? 'bg-white/[0.08] text-white/75' : 'bg-white/[0.03] text-white/25',
    )}
  >
    {children}
  </span>
)

/**
 * 1층 한 칸.
 *
 * 경고가 «두 종»이다 — `warn` 은 넘어도 가는 것(⚠), `block` 은 막는 것(✕).
 * 색만으로 가르지 않는다. 기호가 형태로 갈리므로 색이 무너져도 남는다 (디자인 2장 ⑨).
 */
const Cell = ({
  label,
  value,
  sub,
  warn,
  block,
  edit,
  unit,
}: {
  label: string
  value: string
  sub?: string
  warn?: string
  block?: string
  /**
   * 넣을 수 있는 값이면 입력칸이 된다.
   *
   * 라벨로 「(입력)」이라 적지 않는다 — 화면에 설명문이 다시 는다.
   * **바탕이 들어가 있고 커서가 서는 것**이 「여기는 넣는 자리」라는 표시다.
   * 산출값은 바탕이 없고 굵다 (디자인 2장 ② — 항목마다 «하나씩» 배정된 시각 속성).
   */
  edit?: false | { value: number; onChange: (n: number) => void }
  unit?: string
}) => (
  <div
    className={cn(
      'min-w-0 rounded-[10px] px-3 py-2',
      block
        ? 'bg-brand-red/[0.10] ring-brand-red/40 ring-1'
        : 'bg-white/[0.04]',
    )}
  >
    <div className="text-[11px] text-white/40">{label}</div>
    {edit ? (
      <div className="mt-0.5 flex items-baseline gap-1">
        <input
          type="number"
          value={edit.value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) edit.onChange(n)
          }}
          /**
           * ⚠️ 이름을 «따로» 건다. 칸 이름이 `<div>` 로 위에 떠 있어서 입력칸과
           *    묶여 있지 않다 — 읽는 쪽에서 「이게 무슨 칸인지」를 모른다.
           *    새 계획 칸(`NewPlanForm`)도 같은 이유로 `aria-label` 을 쓴다.
           */
          aria-label={label}
          className="font-number bg-bg-input w-full min-w-0 rounded-md px-2 py-1 text-[16px] font-bold text-white outline-none focus:ring-1 focus:ring-white/30"
        />
        {unit && <span className="text-[12px] text-white/40">{unit}</span>}
      </div>
    ) : (
      <div
        className={cn(
          'font-number mt-0.5 truncate text-[16px] font-bold',
          block ? 'text-brand-red' : 'text-white',
        )}
      >
        {value}
      </div>
    )}
    {sub && (
      <div className="font-number mt-0.5 truncate text-[11px] text-white/35">
        {sub}
      </div>
    )}
    {(block ?? warn) && (
      <div
        className={cn(
          'font-number mt-1 text-[11px]',
          block ? 'text-brand-red' : 'text-warning',
        )}
      >
        {block ?? warn}
      </div>
    )}
  </div>
)

/** 켬/끔 — 켜지면 값이 «들어 있는» 것이 보인다 */
const Toggle = ({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 self-start rounded-md px-2 py-0.5 text-[11px] transition-colors',
      on
        ? 'bg-white/[0.12] text-white/85'
        : 'bg-white/[0.03] text-white/35 hover:text-white/60',
    )}
  >
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        on ? 'bg-brand-red' : 'bg-white/20',
      )}
    />
    {children}
  </button>
)

/** 3층 한 자리. 접혀 있을 때 세로를 안 먹도록 가로로 늘어놓는다 */
