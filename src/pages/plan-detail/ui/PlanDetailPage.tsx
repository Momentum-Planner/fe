import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { REGIME_LABEL, fromServerRegime } from '@/shared/lib/snapshots'
import { RegimeBadge } from '@/shared/ui/RegimeBadge'
import { useRegimeInsight } from '@/entities/stock'
import {
  ENTRY_STATE_LABEL,
  PLAN_STATUS_LABEL,
  usePlanDetail,
  usePlanList,
  useStockPosition,
} from '@/entities/plan'
import type { PlanDetail } from '@/entities/plan'
import { PlanChain } from './PlanChain'
import { PlanChart } from './PlanChart'
import { RiskBar } from './RiskBar'

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

export function PlanDetailPage({ planId }: { planId: number }) {
  const { data: plan, isLoading, isError } = usePlanDetail(planId)
  const { data: position } = useStockPosition(plan?.stockCode)
  const { data: siblings = [] } = usePlanList(
    plan ? { stockCode: plan.stockCode } : {},
  )
  /**
   * 레짐은 **«오늘» 판정**이다 — 계획을 눌러도 안 바뀐다.
   *
   * 머리줄은 「이 종목이 «지금» 어디에 서 있나」를 답하는 자리다. 보유 수량·평균
   * 단가가 지금 값인데 레짐만 그날 값이면 한 줄 안에서 시점이 갈린다 — 어느 게 어느
   * 시점인지 매번 물어야 한다 (디자인 4장 ⑤ · ⑧).
   * 「그날 어땠나」는 2층 근거 블록이 스냅샷으로 답한다.
   */
  const { data: regime } = useRegimeInsight(
    plan?.stockCode ?? '',
    undefined,
    !!plan,
  )

  if (isLoading) return <Empty>불러오는 중…</Empty>
  if (isError || !plan) return <Empty>계획을 찾지 못했습니다.</Empty>

  const walked = plan.status === 'RUNNING' || plan.status === 'DONE'
  const held = position?.quantity ?? 0

  return (
    <main className="flex flex-col gap-3 px-6 pt-4 pb-6">
      {/* ── 이 종목 · 한 줄 ─────────────────────────────────────────── */}
      <section className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        <Link
          to="/stocks/$ticker"
          params={{ ticker: plan.stockCode }}
          className="flex items-baseline gap-2 hover:underline"
        >
          <span className="text-[18px] font-bold text-white">
            {plan.stockName}
          </span>
          <span className="font-number text-[12px] text-white/35">
            {plan.stockCode}
          </span>
        </Link>

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
        <div className="mb-1.5 text-[11px] font-bold tracking-wide text-white/45">
          계획 사슬
        </div>
        {/* 칸을 «가둔다» — 갈래가 늘어도 카드가 세로로 자라지 않고 안에서 움직인다 */}
        <div className="relative h-[186px]">
          <PlanChain plans={siblings} currentId={plan.planId} />
        </div>
      </section>

      {/* ── 두 단 · 축이 없는 것들 ─────────────────────────────────────── */}
      <div className="grid grid-cols-[minmax(0,1fr)_392px] items-start gap-3">
        {/* 차트가 «주»다 — 종목 상세를 대체하는 화면이므로 차트가 그 폭을 가져야 한다.
            Q0 이 잰 값이 826px 이고, 여기 1fr 이 그 근처에 선다 */}
        <section className="card min-w-0 px-3 py-3">
          <PlanChart
            stockCode={plan.stockCode}
            entryPrice={plan.entryPrice}
            stopPrice={plan.stopPrice}
            candidates={plan.stopCandidates}
            writtenAt={plan.writtenAt}
          />
        </section>

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
            {/* 계획 이름 — 값만 봐서는 어느 계획인지 못 가른다 */}
            <span className="text-[15px] font-bold text-white">
              {plan.title}
            </span>
            <span className="text-[12px] text-white/45">
              {plan.side === 'BUY' ? '매수' : '매도'}
            </span>
            <span className="font-number text-[11px] text-white/30">
              {plan.writtenAt} 작성
            </span>
            <div className="ml-auto flex gap-1.5">
              <Btn>수정</Btn>
              <Btn>폐기</Btn>
            </div>
          </div>

          {/* ── 1층 · 위험노출.  이 카드 안에서 «결론»이 3열보다 먼저 온다 ── */}
          <div className="mt-3.5 rounded-[10px] bg-white/[0.04] px-3.5 py-3">
            <RiskBar before={plan.riskBefore} after={plan.riskAfter} />
          </div>

          {/* ── 1층 · 진입 → 스톱가격 → 수량.  «순서가 거꾸로 되지 않는다» (④-1) ──
              좌→우가 곧 그 순서다. 세로로 쌓으면 결론(위험노출)이 맨 밑으로 밀린다 */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Cell label="진입 예상가" value={won(plan.entryPrice)} sub="" />
            <Cell
              label="스톱가격"
              value={won(plan.stopPrice)}
              sub={
                plan.initialStopWidth
                  ? `1R ${won(plan.initialStopWidth)}`
                  : `상한 ${plan.stopLimit}%`
              }
            />
            <Cell
              label="수량"
              value={`${plan.quantity}주`}
              sub={`필요 현금 ${won(plan.entryPrice * plan.quantity)}`}
            />
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
              <div className="mt-1.5 flex flex-col gap-0.5">
                {plan.records.map((r) => (
                  <div
                    key={r.recordId}
                    className="font-number grid grid-cols-[92px_32px_1fr_56px] items-center gap-2 text-[12px]"
                  >
                    <span className="text-white/40">{r.filledAt.slice(5)}</span>
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

          {plan.status === 'CLOSED' && (
            <div className="mt-2 rounded-[10px] bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/60">
              <span className="text-white/35">폐기 사유 — </span>
              {plan.closeReason}
            </div>
          )}

          {/* ── 2층 · 판정 «결과»만. 정도를 버린다 (디자인 4장 ⑤) ────────── */}
          <div className="mt-4 border-t border-white/[0.07] pt-3">
            <div className="mb-2 flex items-baseline gap-2 text-[11px]">
              <span className="font-bold text-white/85">근거</span>
              {/* 스냅샷 값은 «전부 같은 날짜»다 — DailyScreeningResult 한 행에서 온다.
                  값마다 날짜를 달면 「다른 날인가?」를 묻게 만든다 */}
              <span className="font-number text-white/30">
                {plan.snapshot.date} 판정
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Tag>{ENTRY_STATE_LABEL[plan.snapshot.entryState]}</Tag>
              {/* 그날 레짐. 머리줄의 배지는 «오늘» 것이라 값이 다를 수 있다 */}
              <Tag>{REGIME_LABEL[plan.snapshot.regime]}</Tag>
              <Tag>펀더 {plan.snapshot.fundamentalScore}/7</Tag>
              <Tag>
                진입 위치 {plan.snapshot.entryPosition > 0 ? '+' : ''}
                {plan.snapshot.entryPosition}%
              </Tag>
              <TrendTag
                passed={plan.snapshot.trendPassed}
                failed={plan.snapshot.trendFailed}
              />
              {/* 훼손만 «출처가 다르다» — ⑤-3 가 장중에 찍는다. 그래서 시각이 붙는다 */}
              <Tag>
                훼손 {plan.snapshot.damageScore}
                <span className="ml-1 text-white/30">
                  · {plan.snapshot.damageAt.slice(5)}
                </span>
              </Tag>
            </div>
          </div>

          {/* ── 3층 · 온디맨드.  가로로 늘어놓는다 — 접혀 있어도 세로 자리를 안 먹게 ── */}
          <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.07] pt-3">
            <Fold
              title={`후보 선 ${plan.stopCandidates.length}개`}
              open={plan.status === 'PLANNED'}
            >
              <div className="flex flex-col gap-0.5">
                {plan.stopCandidates.map((c) => (
                  <div
                    key={c.label}
                    className={cn(
                      'grid grid-cols-[84px_92px_56px] items-center gap-2 rounded-md px-2 py-1 text-[12px]',
                      c.chosen && 'bg-white/[0.09]',
                      c.overLimit && !c.chosen && 'opacity-35',
                    )}
                  >
                    <span className={c.chosen ? 'text-white' : 'text-white/50'}>
                      {c.label}
                    </span>
                    <span className="font-number text-right text-white/80">
                      {won(c.price)}
                    </span>
                    <span className="font-number text-right text-white/40">
                      −{c.width}%
                    </span>
                  </div>
                ))}
              </div>
            </Fold>

            <Fold title="게이트 · VCP · RS · 실적">
              {/* ⚠️ 목에 없다 — DailyScreeningResult 의 나머지 필드가 붙을 자리.
                  실적은 «공시일» 기준이라 여기만 날짜가 또 다르다 (④-0) */}
              <div className="text-[12px] text-white/35">준비 중</div>
            </Fold>

            <Fold title="스톱 갱신 규칙">
              <div className="flex flex-wrap gap-1.5">
                <Tag on={plan.plannedStop.raiseAtR != null}>
                  스톱 상향 {plan.plannedStop.raiseAtR ?? '—'}R
                </Tag>
                <Tag on={plan.plannedStop.trail50}>50일선 트레일링</Tag>
                <Tag on={plan.plannedStop.backstop}>백스톱</Tag>
              </div>
            </Fold>

            {plan.memo && (
              <Fold title="메모">
                <div className="max-w-[420px] text-[12px] leading-relaxed text-white/60">
                  {plan.memo}
                </div>
              </Fold>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

/**
 * 트렌드 템플릿 — **8칸 도트를 안 쓴다.**
 *
 * ①-1 게이트가 8/8 을 요구하므로 계획이 선 종목은 대개 8/8 이다. 도트 여덟은
 * 정상 케이스에 「몇 칸이 켜졌나」를 매번 세는 비용을 물린다. 어긋난 것만
 * 이름으로 쓰면 정상일 때는 한 줄로 끝나고, 어긋났을 때는 «무엇이» 어긋났는지가
 * 다시 묻지 않아도 나온다 (디자인 4장 ⑤ — 회색을 뭉치지 않는다).
 */
function TrendTag({ passed, failed }: { passed: number; failed: string[] }) {
  if (failed.length === 0)
    return (
      <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[11px] text-white/75">
        ✓ 트렌드 템플릿
      </span>
    )
  return (
    <span className="bg-warning/15 text-warning rounded-md px-2 py-0.5 text-[11px]">
      ⚠ 트렌드 {passed}/8 — {failed.join(' · ')} ✕
    </span>
  )
}

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

const Btn = ({ children }: { children: React.ReactNode }) => (
  <button
    type="button"
    className="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
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

/** 1층 한 칸. 진입 → 스톱가격 → 수량이 같은 폭으로 나란히 선다 */
const Cell = ({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) => (
  <div className="min-w-0 rounded-[10px] bg-white/[0.04] px-3 py-2">
    <div className="text-[11px] text-white/40">{label}</div>
    <div className="font-number mt-0.5 truncate text-[16px] font-bold text-white">
      {value}
    </div>
    {sub && (
      <div className="font-number mt-0.5 truncate text-[11px] text-white/35">
        {sub}
      </div>
    )}
  </div>
)

/** 3층 한 자리. 접혀 있을 때 세로를 안 먹도록 가로로 늘어놓는다 */
const Fold = ({
  title,
  open,
  children,
}: {
  title: string
  open?: boolean
  children: React.ReactNode
}) => (
  <details open={open} className="min-w-0">
    <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/70">
      {title}
    </summary>
    <div className="mt-2">{children}</div>
  </details>
)
