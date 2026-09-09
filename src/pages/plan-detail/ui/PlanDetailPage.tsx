import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import {
  ENTRY_STATE_LABEL,
  PLAN_STATUS_LABEL,
  usePlanDetail,
  usePlanList,
  useStockPosition,
} from '@/entities/plan'
import type { PlanDetail } from '@/entities/plan'
import { PlanChain } from './PlanChain'

/**
 * 계획 싱글.
 *
 * 좌우 두 단이다.
 *
 *   왼쪽   포지션 + 계획 사슬   — 이 «종목»이 어떻게 흘러왔고 지금 어디에 서 있나
 *   오른쪽 계획 정보            — 그 사슬의 «한 마디»인 이 계획
 *
 * 왼쪽은 계획을 옮겨 다녀도 안 변한다. 오른쪽만 바뀐다.
 * 포지션이 사슬과 한 단에 있는 이유 — 사슬 전체가 옮겨 온 «결과»가 지금 포지션이다.
 *
 * 사슬은 좁은 단에서도 «가로»다. 칸 자체가 끌어서 움직이는 뷰포트라
 * 폭이 모자라면 잘리는 게 아니라 밀린다.
 *
 * 「지금 위험 0.90%」와 판단의 「→ 3.65%」가 같은 화면에 있어야 한다 (④-1의 미지).
 */
const won = (n: number) => n.toLocaleString('ko-KR')

export function PlanDetailPage({ planId }: { planId: number }) {
  const { data: plan, isLoading, isError } = usePlanDetail(planId)
  const { data: position } = useStockPosition(plan?.stockCode)
  const { data: siblings = [] } = usePlanList(
    plan ? { stockCode: plan.stockCode } : {},
  )

  if (isLoading) return <Empty>불러오는 중…</Empty>
  if (isError || !plan) return <Empty>계획을 찾지 못했습니다.</Empty>

  return (
    <main className="grid grid-cols-[minmax(440px,40%)_minmax(0,1fr)] items-stretch gap-3 px-6 pt-6 pb-6">
      {/* ── 왼쪽 · 이 종목 ── */}
      <div className="flex h-full min-w-0 flex-col gap-3">
        <section className="card px-4 py-3">
          <div className="flex items-baseline gap-2">
            <Link
              to="/stocks/$ticker"
              params={{ ticker: plan.stockCode }}
              className="text-[15px] font-bold text-white hover:underline"
            >
              {plan.stockName}
            </Link>
            <span className="font-number text-[11px] text-white/30">
              {plan.stockCode}
            </span>
          </div>
          {/* 포지션 — 사슬 전체가 «옮겨 온 결과»가 지금 이 값이다 */}
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            <Fact
              label="보유"
              value={position?.quantity ? `${position.quantity}주` : '없음'}
            />
            <Fact
              label="평단"
              value={position?.quantity ? won(position.avgPrice) : '—'}
            />
            {/* 손절가는 종목이 «자기 필드로 안 든다» — 실행 중 계획의 PlannedStop 이 그 값 */}
            <Fact
              label="현재 손절"
              value={position?.stopPrice ? won(position.stopPrice) : '없음'}
            />
            <Fact
              label="지금 위험"
              value={`${(position?.riskExposure ?? 0).toFixed(2)}%`}
            />
            {/* 계좌 총액은 위험노출의 «분모»다 (F7). 계획이 등록 시점 값을 얼려 간다 */}
            <Fact label="계좌" value={won(plan.accountTotal)} />
            {/* 이 종목에 «얼마나» 들어가 있나 — 위험노출과 다른 값이다.
                위험은 손절까지의 거리이고, 이건 실제로 묶인 돈이다 */}
            <Fact
              label="이 종목"
              value={
                position?.quantity
                  ? `${won(position.quantity * position.avgPrice)} · ${(
                      ((position.quantity * position.avgPrice) /
                        plan.accountTotal) *
                      100
                    ).toFixed(1)}%`
                  : '—'
              }
            />
          </div>
        </section>

        <section className="card flex min-h-0 min-w-0 flex-1 flex-col px-4 py-3">
          <div className="mb-2 text-[11px] font-bold tracking-wide text-white/35">
            계획 사슬
            <span className="ml-2 font-normal text-white/20">끌어서 이동</span>
          </div>
          {/* 칸을 «가둔다» — 안 그러면 사슬 내용만큼 카드가 자라서 넘칠 게 없고,
              그러면 세로로 끌 것도 없어진다. absolute 라 내용이 높이를 못 민다 */}
          <div className="relative min-h-[200px] flex-1">
            <PlanChain plans={siblings} currentId={plan.planId} />
          </div>
        </section>
      </div>

      {/* ── 오른쪽 · 이 계획 ── */}
      <section className="card min-w-0 px-5 py-4">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-white/35">
          계획 정보
        </div>
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
          <span className="text-[15px] font-bold text-white">{plan.title}</span>
          <span className="text-[12px] text-white/45">
            {plan.side === 'BUY' ? '매수' : '매도'}
          </span>
          <span className="font-number text-[11px] text-white/30">
            {plan.writtenAt} 작성
          </span>
          <div className="ml-auto flex gap-1.5">
            <Btn>수정</Btn>
            <Btn>폐쇄</Btn>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_252px] items-start gap-4">
          <Block
            title="판단"
            note="진입 → 손절 → 수량. 순서가 거꾸로 되지 않는다"
          >
            <Step
              n="진입 예상가"
              value={won(plan.entryPrice)}
              sub="차트를 보고 넣는다"
            />
            <Arrow />
            <Step
              n="손절가"
              value={won(plan.stopPrice)}
              sub={`1R ${plan.initialStopWidth ? won(plan.initialStopWidth) : '실행될 때 박힌다'}`}
            >
              {/* 후보 선은 「왜 여기에 손절을 뒀나」의 답인데, 실행 중·완료·폐기에서는
                  이미 «지나간» 선택이다. 고를 수 있는 상태(대기)에서만 펴 둔다 */}
              <details className="mt-2" open={plan.status === 'PLANNED'}>
                <summary className="cursor-pointer text-[11px] text-white/35">
                  후보 선 {plan.stopCandidates.length}개 · 상한 {plan.stopLimit}
                  %
                </summary>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {plan.stopCandidates.map((c) => (
                    <div
                      key={c.label}
                      className={cn(
                        'grid grid-cols-[76px_88px_56px] items-center gap-2 rounded-md px-2 py-1 text-[12px]',
                        c.chosen && 'bg-white/[0.09]',
                        c.overLimit && !c.chosen && 'opacity-35',
                      )}
                    >
                      <span
                        className={c.chosen ? 'text-white' : 'text-white/50'}
                      >
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
                  <div className="mt-0.5 text-[11px] text-white/30">
                    넘는 선은 흐리게. 지우지 않는다
                  </div>
                </div>
              </details>
            </Step>
            <Arrow />
            <Step
              n="수량"
              value={`${plan.quantity}주`}
              sub={`필요 현금 ${won(plan.entryPrice * plan.quantity)}`}
            />
            <Arrow />
            <div className="rounded-[10px] bg-white/[0.05] px-3 py-2.5">
              <div className="text-[11px] text-white/40">
                위험노출 — 입력이 아니라 «결과»다
              </div>
              <div className="font-number mt-1 flex flex-wrap items-baseline gap-2 text-[15px]">
                <span className="text-white/45">
                  {plan.riskBefore.toFixed(2)}%
                </span>
                <span className="text-white/25">→</span>
                <span
                  className={cn(
                    'font-bold',
                    plan.riskAfter > 2.5 ? 'text-brand-red' : 'text-white',
                  )}
                >
                  {plan.riskAfter.toFixed(2)}%
                </span>
                {plan.riskAfter > 2.5 && (
                  <span className="text-brand-red text-[12px]">
                    ⚠ 2.5% 초과 — 경고만 한다. 막지 않는다
                  </span>
                )}
              </div>
              <div className="font-number mt-1 text-[11px] text-white/30">
                계좌 {won(plan.accountTotal)}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Tag on={plan.plannedStop.raiseAtR != null}>
                스톱 상향 {plan.plannedStop.raiseAtR ?? '—'}R
              </Tag>
              <Tag on={plan.plannedStop.trail50}>50일선 트레일링</Tag>
              <Tag on={plan.plannedStop.backstop}>백스톱</Tag>
            </div>
          </Block>

          <div className="flex flex-col gap-5">
            <Block
              title="근거"
              note={`${plan.snapshot.date} 판정 · 사후에 못 만든다`}
            >
              <div className="flex flex-wrap gap-1.5">
                <Tag>{ENTRY_STATE_LABEL[plan.snapshot.entryState]}</Tag>
                <Tag>펀더 {plan.snapshot.fundamentalScore}</Tag>
                <Tag>훼손 {plan.snapshot.damageScore}</Tag>
                <Tag>
                  진입 위치 {plan.snapshot.entryPosition > 0 ? '+' : ''}
                  {plan.snapshot.entryPosition}%
                </Tag>
              </div>
              {/* 게이트(8조건·VCP·RS·베이스)는 접는다 — 계획이 서 있다는 게 통과의 증거다 */}
              <details className="mt-2.5">
                <summary className="cursor-pointer text-[11px] text-white/35">
                  게이트 · VCP · RS 보기
                </summary>
                <div className="mt-2 text-[12px] text-white/45">
                  ⚠️ 목에 없다. DailyScreeningResult 의 나머지 필드가 붙을
                  자리다.
                </div>
              </details>
            </Block>

            <Block
              title="실행"
              note={`체결 ${plan.recordCount}건 · 체결률 ${Math.round(plan.fillRate * 100)}%`}
            >
              {plan.records.length === 0 ? (
                <div className="text-[12px] text-white/35">
                  {plan.status === 'CLOSED'
                    ? `폐쇄 — ${plan.closeReason}`
                    : '아직 체결이 없다'}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {plan.records.map((r) => (
                    <div
                      key={r.recordId}
                      className="grid grid-cols-[minmax(0,1fr)_32px_82px_44px] items-center gap-2 text-[12px]"
                    >
                      <span className="font-number truncate text-white/40">
                        {r.filledAt.slice(5)}
                      </span>
                      <span className="text-white/55">
                        {r.side === 'BUY' ? '매수' : '매도'}
                      </span>
                      <span className="font-number text-right text-white/85">
                        {won(r.price)}
                      </span>
                      <span className="font-number text-right text-white/55">
                        {r.quantity}주
                      </span>
                    </div>
                  ))}
                  <ActualVsPlan plan={plan} />
                </div>
              )}
            </Block>

            {plan.memo && (
              <Block title="메모">
                <div className="text-[12px] leading-relaxed text-white/60">
                  {plan.memo}
                </div>
              </Block>
            )}
          </div>
        </div>
      </section>
    </main>
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
    <div className="font-number mt-1.5 border-t border-white/[0.06] pt-1.5 text-[12px] text-white/50">
      평단 {won(Math.round(avg))} · 계획가 대비{' '}
      <span className={diff > 0 ? 'text-brand-red' : 'text-white/70'}>
        {diff > 0 ? '+' : ''}
        {diff.toFixed(2)}%
      </span>
    </div>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <main className="px-6 pt-6">
    <section className="card px-5 py-14 text-center text-[13px] text-white/40">
      {children}
    </section>
  </main>
)

const Fact = ({ label, value }: { label: string; value: string }) => (
  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
    <span className="text-white/35">{label}</span>
    <span className="font-number text-white/85">{value}</span>
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

function Block({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2 border-b border-white/[0.07] pb-1.5">
        <span className="text-[12px] font-bold text-white/85">{title}</span>
        {note && <span className="text-[11px] text-white/30">{note}</span>}
      </div>
      {children}
    </div>
  )
}

function Step({
  n,
  value,
  sub,
  children,
}: {
  n: string
  value: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-[10px] bg-white/[0.04] px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] text-white/40">{n}</span>
        <span className="font-number text-[14px] font-bold text-white">
          {value}
        </span>
        {sub && <span className="text-[11px] text-white/35">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

const Arrow = () => <div className="ml-3 h-2 w-px bg-white/15" aria-hidden />
