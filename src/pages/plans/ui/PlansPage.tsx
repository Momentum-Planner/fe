import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAccount } from '@/entities/auth'
import { PLAN_STATUS_LABEL, usePlanList } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'
import { useStockSearch } from '@/entities/search'
import { cn } from '@/shared/lib/cn'
import {
  FillSheet,
  NewFillForm,
  closeFill,
  openFill,
  useFillPanel,
} from '@/widgets/fill'

/**
 * 거래 계획 — **이 서비스의 집이다** (Q22).
 *
 * ```text
 * 거래 계획   [실행 중 | 대기 | 완료 · 폐기]                 [+ 새 계획] [+ 체결 기록]
 *
 * ┌ SK하이닉스 실행 중 · 돌파  20주  계획 › ┐ ┌ …  ┐    ← 계획 하나 = 카드 하나 · 균등한 그리드
 * │ 목표 [223,000] 2R            +44만       │ │    │
 * │ 진입 [201,000]                           │ │    │
 * │ 손절 [190,000]               −22만       │ │    │
 * │                              [+ 체결]    │ │    │
 * └──────────────────────────────────────────┘ └────┘
 * ╭ 삼성전자 ─────────────────────────────────────────╮  ← 같은 종목이 둘 이상이면 한 판 (4장 ④)
 * │ ┌ 대기 · 돌파 … ┐ ┌ 대기 · 눌림 … ┐               │    이름은 판 머리에 한 번만
 * ╰───────────────────────────────────────────────────╯
 * ```
 *
 * 💀 **목표에서 거꾸로 짰다.** 「계획 있는 매매로 성과 올리기」 — 세운다 · 체결을 붙인다 ·
 * 결과로 고친다가 전부 계획 하나를 중심으로 돈다. 그래서 계획이 화면의 중심이다.
 *
 * 💀 **사슬은 목록에 두지 않는다** (Q23 · 4장 ③, Q22 의 「종목별 간단한 사슬」 을 뒤집는다).
 * 실행 중 앞뒤에 이전 · 대기가 있을 수도 없을 수도 있어서 목록 안에서는 순서가 안 읽혔다 —
 * 순서는 계획 화면의 사슬이 맡는다. 실행 중 · 대기도 한데 섞지 않고 **거르기로 가른다**.
 *
 * 💀 **체결은 오른쪽 옆 칸 하나** — 카드의 「+ 체결」(종목 · 계획이 골라진 채) 과 위
 * 「+ 체결 기록」(빈 채) 이 같은 폼을 연다. 계획 없는 매매는 이 페이지에 서지 않는다(통계로).
 */

type Scope = 'RUNNING' | 'PLANNED' | 'ENDED'
const SCOPE_LABEL: Record<Scope, string> = {
  RUNNING: '실행 중',
  PLANNED: '대기',
  ENDED: '완료 · 폐기',
}
const inScope = (p: PlanListItem, s: Scope) =>
  s === 'ENDED' ? p.status === 'DONE' || p.status === 'CLOSED' : p.status === s

/**
 * 끝난 계획은 결과로 **세 무리를 한 화면에** — 이익 → 손실 → 폐기 (Q23 · 9장 ②).
 * 💀 「아카이브에서 찾고 싶은 건 결과다 — 가장 수익이 높았던 거래」(7장 · Q14).
 *    두 번째 필터로 넣었다가 뺐다 — 「누르면 새것이 나오면 안 된다」(사용자). 무리는 작은 머리로만 가른다.
 */
type Result = 'WIN' | 'LOSS' | 'CLOSED'
const RESULT_LABEL: Record<Result, string> = {
  WIN: '이익',
  LOSS: '손실',
  CLOSED: '폐기',
}
const resultOf = (p: PlanListItem): Result =>
  p.status === 'CLOSED' ? 'CLOSED' : (p.realized ?? 0) > 0 ? 'WIN' : 'LOSS'
/**
 * 끝난 계획의 정렬 — **손익(원) · 수익률(%) · 최근** (Q23 · 7장 ②).
 * 「가장 많이 번」 과 「가장 효율이 좋았던」 은 다른 매매일 때가 많아 둘을 번갈아 본다.
 * 이익은 큰 것부터 · 손실은 가장 많이 잃은 것부터 · 폐기는 늘 최근부터.
 */
type Sort = 'PNL' | 'PCT' | 'RECENT'
const SORT_LABEL: Record<Sort, string> = {
  PNL: '손익',
  PCT: '수익률',
  RECENT: '최근',
}
const recent = (a: PlanListItem, b: PlanListItem) =>
  b.writtenAt.localeCompare(a.writtenAt)
export const sortFor = (r: Result, s: Sort) => {
  if (r === 'CLOSED' || s === 'RECENT') return recent
  const v = (p: PlanListItem) => (s === 'PNL' ? p.realized : p.realizedPct) ?? 0
  return r === 'WIN'
    ? (a: PlanListItem, b: PlanListItem) => v(b) - v(a)
    : (a: PlanListItem, b: PlanListItem) => v(a) - v(b)
}

/** 무리마다 처음 이만큼 · 나머지는 「더 보기」 로 이어 붙인다 (7장 ② 첫 화면) */
const PAGE = 6

/** 같은 종목끼리 묶는다 — 둘 이상이면 한 판 위에 (Q23 · 4장 ④). 순서는 들어온 순서 그대로 */
const byStock = (list: PlanListItem[]) => {
  const by = new Map<string, PlanListItem[]>()
  for (const p of list) by.set(p.stockCode, [...(by.get(p.stockCode) ?? []), p])
  return [...by.values()]
}

/**
 * 처음 여는 필터 — **비어 있지 않은 첫 것** (Q23 · 2장 ① 빈도).
 * 실행 중이 없는 날 첫 화면이 「없습니다」 한 줄이었다 — 대기가 있어도 한 번 더 눌러야 했다.
 */
export const firstScope = (plans: PlanListItem[]): Scope =>
  (['RUNNING', 'PLANNED', 'ENDED'] as const).find((s) =>
    plans.some((p) => inScope(p, s)),
  ) ?? 'RUNNING'

const EMPTY: Record<Scope, string> = {
  RUNNING: '실행 중인 계획이 없습니다.',
  PLANNED: '대기 중인 계획이 없습니다.',
  ENDED: '끝난 계획이 없습니다.',
}

const won = (n: number) => n.toLocaleString('ko-KR')
const man = (v: number) => {
  const a = Math.abs(v)
  const s = v > 0 ? '+' : v < 0 ? '−' : ''
  return a >= 10_000
    ? `${s}${Math.round(a / 10_000).toLocaleString()}만`
    : `${s}${a.toLocaleString()}`
}
const pct = (r: number) =>
  `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r * 100).toFixed(1)}%`

/** 손절에 닿으면 얼마 — 음수면 아직 잃을 수 있다. 0 이상이면 「본전 이상 카드」 */
export const atStop = (p: PlanListItem) =>
  (p.stopPrice - p.entryPrice) * p.quantity

/** 목표 — 아직 안 닿은 첫 단. 다 닿았으면 마지막 */
const goalR = (p: PlanListItem) =>
  (p.goals.find((g) => !g.hitAt) ?? p.goals.at(-1))?.r ?? null

export function PlansPage() {
  const { data: account } = useAccount()
  const [picked, setScope] = useState<Scope | null>(null)
  const fill = useFillPanel()
  const [newPlan, setNewPlan] = useState(false)
  const panel = fill || newPlan

  const { data: plans = [], isLoading, isError } = usePlanList({})
  // 사용자가 누르기 전까지는 비어 있지 않은 첫 필터
  const scope = picked ?? firstScope(plans)
  const [sort, setSort] = useState<Sort>('PNL')
  const [shown, setShown] = useState<Record<Result, number>>({
    WIN: PAGE,
    LOSS: PAGE,
    CLOSED: PAGE,
  })

  /** 보일 무리 — 완료 · 폐기 만 결과로 셋, 나머지는 머리 없는 하나 */
  const sections = useMemo(() => {
    const list = plans.filter((x) => inScope(x, scope))
    if (scope === 'ENDED')
      return (Object.keys(RESULT_LABEL) as Result[])
        .map((r) => {
          const all = list
            .filter((p) => resultOf(p) === r)
            .sort(sortFor(r, sort))
          return {
            key: r as Result | null,
            label: RESULT_LABEL[r] as string | null,
            groups: byStock(all.slice(0, shown[r])),
            more: all.length > shown[r],
          }
        })
        .filter((x) => x.groups.length > 0)
    const sorted = [...list].sort((a, b) =>
      // 실행 중은 손절에 닿으면 가장 많이 잃는 것부터 (Q23 · 9장 ① 위치)
      scope === 'RUNNING'
        ? atStop(a) - atStop(b)
        : b.writtenAt.localeCompare(a.writtenAt),
    )
    return sorted.length
      ? [{ key: null, label: null, groups: byStock(sorted), more: false }]
      : []
  }, [plans, scope, sort, shown])

  const onFill = (p: PlanListItem) => {
    setNewPlan(false)
    openFill({
      stock: { code: p.stockCode, name: p.stockName },
      planId: p.planId,
      // 대기는 매수만 · 실행 중은 비워 둔다 — 추가 매수일 수도 있다 (10장 E)
      side: p.status === 'PLANNED' ? 'BUY' : undefined,
      price: p.status === 'PLANNED' ? p.entryPrice : 0,
      quantity: p.status === 'PLANNED' ? p.quantity : 0,
    })
  }

  return (
    <main
      className={cn(
        'grid items-start gap-4 px-6 pt-6 pb-10',
        panel && 'xl:grid-cols-[minmax(0,1fr)_440px]',
      )}
    >
      <section className="card flex min-w-0 flex-col px-5 pt-5 pb-5">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="m-0 text-[18px] font-bold text-white">거래 계획</h3>
          <div className="flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5">
            {(Object.keys(SCOPE_LABEL) as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-[12px] transition-colors',
                  scope === s
                    ? 'bg-white/[0.14] text-white'
                    : 'text-white/50 hover:text-white/75',
                )}
              >
                {SCOPE_LABEL[s]}
              </button>
            ))}
          </div>
          {scope === 'ENDED' && (
            <div className="flex items-baseline gap-2 text-[12px]">
              <span className="text-white/35">정렬</span>
              {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sort === k}
                  onClick={() => setSort(k)}
                  className={
                    sort === k
                      ? 'font-medium text-white'
                      : 'text-white/45 hover:text-white/75'
                  }
                >
                  {SORT_LABEL[k]}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeFill()
                setNewPlan(true)
              }}
              className="rounded-pill px-3 py-1.5 text-[12px] text-white/85 ring-1 ring-white/20 hover:bg-white/[0.06]"
            >
              + 새 계획
            </button>
            {/**
             * **가장 밝은 버튼은 체결 기록이다** (Q23 · 8장 ① 관습 · 패턴 56) — F2 거래 기록이
             * 유일한 필수 행동이다. 상단 바로 올렸다가 **이 페이지에만 두는 것으로 되돌렸다** (4장 ⑦).
             */}
            <button
              type="button"
              onClick={() => {
                setNewPlan(false)
                openFill()
              }}
              className="rounded-pill text-fg-inverse bg-white px-3 py-1.5 text-[12px] font-bold hover:bg-white/90"
            >
              + 체결 기록
            </button>
          </div>
        </header>

        {!account?.isLoggedIn ? (
          <Empty>로그인 후 이용할 수 있습니다.</Empty>
        ) : isLoading ? (
          <Empty>불러오는 중…</Empty>
        ) : isError ? (
          <Empty>계획을 불러오지 못했습니다.</Empty>
        ) : sections.length === 0 ? (
          <Empty>{EMPTY[scope]}</Empty>
        ) : (
          sections.map((sec) => (
            <section key={sec.key ?? 'all'} aria-label={sec.label ?? undefined}>
              {sec.label && (
                <h4 className="m-0 mt-5 text-[12px] font-medium text-white/50">
                  {sec.label}
                </h4>
              )}
              {/* 계획 하나 = 카드 하나 · 균등한 그리드 (Q23 · 4장 ③ · 패턴 28) */}
              <div
                className={cn(
                  'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5',
                  sec.label ? 'mt-2' : 'mt-4',
                )}
              >
                {sec.groups.map((g) =>
                  g.length === 1 ? (
                    <PlanTile key={g[0]!.planId} p={g[0]!} onFill={onFill} />
                  ) : (
                    <section
                      key={g[0]!.stockCode}
                      aria-label={g[0]!.stockName}
                      className="col-span-full rounded-xl px-2.5 pt-2 pb-2.5 ring-1 ring-white/15"
                    >
                      <h4 className="t-h3 m-0 px-1.5 pb-2 text-white">
                        {g[0]!.stockName}
                      </h4>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                        {g.map((p) => (
                          <PlanTile
                            key={p.planId}
                            p={p}
                            onFill={onFill}
                            hideName
                          />
                        ))}
                      </div>
                    </section>
                  ),
                )}
              </div>
              {sec.more && sec.key && (
                <button
                  type="button"
                  onClick={() =>
                    setShown((v) => ({ ...v, [sec.key!]: v[sec.key!] + PAGE }))
                  }
                  className="rounded-pill mt-2.5 w-full py-1.5 text-[12px] text-white/60 ring-1 ring-white/12 hover:text-white/85"
                >
                  더 보기
                </button>
              )}
            </section>
          ))
        )}
      </section>

      {/**
       * 체결 · 새 계획 칸 — **넓으면 오른쪽 칸, 좁으면 서랍** (Q23 · 4장 ⑥).
       * 💀 1280px 미만에서 칸이 목록 밑에 붙어, 카드의 「+ 체결」 을 눌러도 폼이 화면 밖이었다.
       */}
      {fill ? (
        <FillSheet dock onClose={closeFill}>
          <NewFillForm
            // 다른 카드를 누르면 폼이 그 계획으로 새로 선다
            key={fill.start?.planId ?? 'blank'}
            start={fill.start}
            onClose={closeFill}
          />
        </FillSheet>
      ) : newPlan ? (
        <FillSheet dock onClose={() => setNewPlan(false)}>
          <NewPlanStart onClose={() => setNewPlan(false)} />
        </FillSheet>
      ) : null}
    </main>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="m-0 py-14 text-center text-[13px] text-white/40">{children}</p>
)

/**
 * 계획 카드 — 머리(종목 · 상태 · 계획 이름 · 수량 · 「계획 ›」) + 가격 세 줄 + 「+ 체결」.
 *
 * 가격은 **차트처럼 가격 높은 순 한 줄씩** — 태그 색도 차트 축 태그와 같다 (Q23 · 4장 ②).
 * 태그는 **속을 비운 윤곽** (4장 ⑤) — 채운 태그는 카드 셋이면 색 덩어리 아홉이라 중심점이 흩어졌다.
 * 셋 다 중요하니 크기로 가르지 않고, 닿으면 얼마인지(원)를 오른쪽에 붙인다.
 * 끝난 계획은 가격 대신 결과(실현 손익)를 싣는다.
 */
function PlanTile({
  p,
  onFill,
  hideName,
}: {
  p: PlanListItem
  onFill: (p: PlanListItem) => void
  /** 같은 종목 판 안이면 이름은 판 머리에 한 번만 */
  hideName?: boolean
}) {
  const running = p.status === 'RUNNING'
  const waiting = p.status === 'PLANNED'
  const act = running || waiting
  const goal = goalR(p)
  const { entryPrice: entry, stopPrice: stop, quantity: qty } = p
  // 1R 은 실행 때 박힌 최초 손절폭 — 손절가를 올려도 목표가는 안 변한다. 대기면 계획 손절폭
  const oneR = p.initialStopWidth ?? entry - stop
  // 본전 이상 카드 — 손절을 진입 위로 올려 오늘 챙길 일이 적다. 한 단 흐리게 (9장 ① 밝기)
  const evenUp = running && stop >= entry
  const goalPrice = goal !== null && oneR > 0 ? entry + goal * oneR : null

  return (
    <article
      className={cn(
        'flex flex-col rounded-lg px-4 pt-3 pb-3',
        act ? 'bg-bg-elevated' : 'bg-white/[0.03]',
        evenUp && 'opacity-55 transition-opacity hover:opacity-100',
      )}
    >
      <header className="flex items-baseline gap-2">
        {!hideName && (
          <span className="t-h3 truncate text-white">{p.stockName}</span>
        )}
        <span
          className={cn(
            'shrink-0 text-[11px]',
            running ? 'text-candle-up' : 'text-white/55',
          )}
        >
          {PLAN_STATUS_LABEL[p.status]}
        </span>
        <span className="truncate text-[11px] text-white/45">{p.title}</span>
        <Link
          to="/stocks/$ticker/plan/$planId"
          params={{ ticker: p.stockCode, planId: String(p.planId) }}
          aria-label={`${p.title} 계획 보기`}
          className="ml-auto flex shrink-0 items-center text-[11px] text-white/55 hover:text-white"
        >
          계획
          <ChevronRight size={13} aria-hidden />
        </Link>
      </header>

      {act ? (
        <>
          <dl className="m-0 mt-2.5 flex flex-col gap-1.5">
            {goalPrice !== null && (
              <PriceLine
                label="목표"
                price={goalPrice}
                tag="text-candle-up ring-candle-up/60"
                note={`${goal}R`}
                amount={(goalPrice - entry) * qty}
              />
            )}
            <PriceLine
              label="진입"
              price={entry}
              tag="text-white ring-white/40"
            />
            <PriceLine
              label="손절"
              price={stop}
              tag="text-candle-down ring-candle-down/60"
              // 손절폭 % — 손절폭 상한과 바로 견준다 (Q23 · 9장 ③ 필요한 정확성)
              note={entry > 0 ? pct((stop - entry) / entry) : undefined}
              amount={(stop - entry) * qty}
            />
          </dl>
          <div className="mt-3 flex items-center">
            <span className="t-num text-[11px] text-white/45">{qty}주</span>
            <button
              type="button"
              onClick={() => onFill(p)}
              className="rounded-pill ml-auto px-2.5 py-1 text-[11px] text-white/85 ring-1 ring-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              + 체결
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2 flex items-baseline gap-2">
          <span className="t-num text-[11px] text-white/40">
            {p.writtenAt.slice(0, 10)}
          </span>
          {p.realized !== null && (
            <span
              className={cn(
                't-num ml-auto text-[13px]',
                p.realized > 0
                  ? 'text-candle-up'
                  : p.realized < 0
                    ? 'text-candle-down'
                    : 'text-white/55',
              )}
            >
              {p.realized === 0 ? '본전' : man(p.realized)}
              {/* 수익률로도 줄 세우므로 같이 싣는다 (7장 ②) */}
              {p.realizedPct !== null && (
                <span className="ml-1.5 text-[11px] text-white/45">
                  {pct(p.realizedPct / 100)}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </article>
  )
}

function PriceLine({
  label,
  price,
  tag,
  note,
  amount,
}: {
  label: string
  price: number
  tag: string
  note?: string
  amount?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-7 text-[11px] text-white/45">{label}</dt>
      <dd className="m-0 flex flex-1 items-center gap-1.5">
        <span
          className={cn(
            'font-number rounded-[3px] px-1.5 text-[13px] leading-[20px] tabular-nums ring-1 ring-inset',
            tag,
          )}
        >
          {won(Math.round(price))}
        </span>
        {note && <span className="text-[11px] text-white/45">{note}</span>}
        {amount !== undefined && (
          <span
            className={cn(
              't-num ml-auto text-[12px]',
              amount > 0
                ? 'text-candle-up'
                : amount < 0
                  ? 'text-candle-down'
                  : 'text-white/55',
            )}
          >
            {amount === 0 ? '본전' : man(Math.round(amount))}
          </span>
        )}
      </dd>
    </div>
  )
}

/**
 * 새 계획 — 종목을 고르면 그 종목의 계획 화면으로 간다. 계획 폼은 거기 산다 (Q11 · Q12).
 */
function NewPlanStart({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const { data: found = [] } = useStockSearch(q.trim().length >= 1 ? q : '')
  return (
    <section className="bg-bg-surface ring-border-default flex flex-col gap-3 rounded-lg px-5 py-4 ring-1">
      <header className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-white">새 계획</span>
        <span className="text-[11px] text-white/40">
          종목을 고르면 그 종목의 계획 화면에서 세운다
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-[11px] text-white/35 hover:text-white/70"
        >
          닫기
        </button>
      </header>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름이나 코드"
        aria-label="새 계획 종목"
        className="bg-bg-input rounded-md px-2 py-1.5 text-[13px] text-white outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/30"
      />
      {found.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {found.slice(0, 10).map((s) => (
            <Link
              key={s.stockCode}
              to="/stocks/$ticker"
              params={{ ticker: s.stockCode }}
              className="rounded-md bg-white/[0.06] px-2 py-1 text-[12px] text-white/80 hover:bg-white/[0.12]"
            >
              {s.stockName}{' '}
              <span className="font-number text-[10px] text-white/40">
                {s.stockCode}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
