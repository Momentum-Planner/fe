import { Link } from '@tanstack/react-router'
import { ArrowUpDown, ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAccount } from '@/entities/auth'
import { usePlanList } from '@/entities/plan'
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
 * 거래 계획   [실행 중 | 대기 | 완료 | 폐기]                  (찾기) [+ 체결 기록]
 *   「+ 새 계획」 은 뺐다 — 검색바 → 빈 칸, 또는 오늘의 후보 → 종목 화면에서 세운다 (2026-09-19)
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

/**
 * 거르기 넷 — **[실행 중 | 대기 | 완료 | 폐기] 한 줄** (사용자 「나눌 거면 차라리 한 줄로 길게 · 실행 중하고 대기는 분리 · 이전처럼」).
 * 한 번에 하나만 보인다. 종목끼리 판으로 묶지 않는다 — 「묶는 건 더 보기 힘들다 · 그냥 카드」.
 */
type Scope = 'RUNNING' | 'PLANNED' | 'DONE' | 'CLOSED'
const SCOPE_LABEL: Record<Scope, string> = {
  RUNNING: '실행 중',
  PLANNED: '대기',
  DONE: '완료',
  CLOSED: '폐기',
}
const inScope = (p: PlanListItem, s: Scope) => p.status === s

/**
 * 완료는 결과로 **두 무리를 한 화면에** — 이익 → 손실 (Q23 · 9장 ②).
 * 💀 「아카이브에서 찾고 싶은 건 결과다 — 가장 수익이 높았던 거래」(7장 · Q14).
 */
type Result = 'WIN' | 'LOSS'
const resultOf = (p: PlanListItem): Result =>
  (p.realized ?? 0) > 0 ? 'WIN' : 'LOSS'
/**
 * 완료의 정렬 — **손익(원) · 수익률(%) · 최근** (Q23 · 7장 ②).
 * 「가장 많이 번」 과 「가장 효율이 좋았던」 은 다른 매매일 때가 많아 둘을 번갈아 본다.
 * 이익은 큰 것부터 · 손실은 가장 많이 잃은 것부터.
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
  if (s === 'RECENT') return recent
  const v = (p: PlanListItem) => (s === 'PNL' ? p.realized : p.realizedPct) ?? 0
  return r === 'WIN'
    ? (a: PlanListItem, b: PlanListItem) => v(b) - v(a)
    : (a: PlanListItem, b: PlanListItem) => v(a) - v(b)
}

/**
 * 처음 여는 필터 — **비어 있지 않은 첫 것** (Q23 · 2장 ① 빈도).
 * 실행 중이 없는 날 첫 화면이 「없습니다」 한 줄이었다 — 대기가 있어도 한 번 더 눌러야 했다.
 */
export const firstScope = (plans: PlanListItem[]): Scope =>
  (['RUNNING', 'PLANNED', 'DONE', 'CLOSED'] as const).find((s) =>
    plans.some((p) => inScope(p, s)),
  ) ?? 'RUNNING'

const EMPTY: Record<Scope, string> = {
  RUNNING: '실행 중인 계획이 없습니다.',
  PLANNED: '대기 중인 계획이 없습니다.',
  DONE: '실행 완료한 계획이 없습니다.',
  CLOSED: '폐기한 계획이 없습니다.',
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

const norm = (v: string) => v.replace(/\s+/g, '').toLowerCase()

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
  const panel = fill

  const { data: plans = [], isLoading, isError } = usePlanList({})
  // 사용자가 누르기 전까지는 비어 있지 않은 첫 필터
  const scope = picked ?? firstScope(plans)
  const [sort, setSort] = useState<Sort>('PNL')
  const [result, setResult] = useState<Result | 'ALL'>('ALL')
  const [query, setQuery] = useState('')

  const q = query.trim()
  /** 보일 줄 — 전부 그리고 스크롤로 본다 */
  const rows = useMemo(() => {
    // 거래 계획만의 찾기 — 종목 이름 · 코드 · 계획 이름 (띄어쓰기 · 대소문자 무시)
    const nq = norm(q)
    const list = plans.filter(
      (x) =>
        inScope(x, scope) &&
        (!nq ||
          norm(x.stockName).includes(nq) ||
          x.stockCode.includes(nq) ||
          norm(x.title).includes(nq)),
    )
    if (scope === 'DONE') {
      // 결과 거르기 — 모두 · 이익 · 손실 (사용자 「이익 · 손실도 필터로」). 모두는 큰 이익 → 큰 손실 한 줄
      const done = list
        .filter((p) => result === 'ALL' || resultOf(p) === result)
        .sort(sortFor(result === 'LOSS' ? 'LOSS' : 'WIN', sort))
      return done
    }
    const sorted = [...list].sort((a, b) =>
      // 실행 중은 손절에 닿으면 가장 많이 잃는 것부터 (Q23 · 9장 ① 위치)
      scope === 'RUNNING' ? atStop(a) - atStop(b) : recent(a, b),
    )
    return sorted
  }, [plans, scope, sort, result, q])

  /**
   * **찾으면 카드 끝에 점선 빈 칸 — 찾은 종목의 새 계획** (Q23 · 검색바가 새 계획 · 체결을 맡는다, 가).
   * 실행 중 · 대기 에서만. 계획이 하나도 없는 종목은 「계획 없이 체결」 칸도 붙는다.
   * 💀 버튼 글자를 바꾸는 안(A) 은 「너무 동적」 — 찾으면 밑에 계획이 바로 보이니 그 자리에서 연다.
   */
  const live = scope === 'RUNNING' || scope === 'PLANNED'
  const { data: hits = [] } = useStockSearch(live ? q : '')
  const slots = live && q ? hits : []

  const fillBare = (code: string, name: string) => {
    openFill({
      stock: { code, name },
      planId: 'NONE',
      // 계획 없는 매매는 매수 · 매도 둘 다라 비워 둔다 (10장 E)
      side: undefined,
      price: 0,
      quantity: 0,
    })
  }

  const onFill = (p: PlanListItem) => {
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
          <div className="ml-auto flex items-center gap-2">
            {/**
             * 거래 계획만의 찾기 — 지금 거르기 안의 카드를 줄이고, 실행 중 · 대기 에선 찾은 종목의 빈 칸이 선다.
             * 💀 처음엔 배경과 같은 어두운 칸이라 「안 보인다」 — 테두리 · 돋보기 · 지우기를 붙였다.
             */}
            <label className="rounded-pill bg-bg-input relative flex h-8 w-[240px] items-center ring-1 ring-white/20 transition-shadow focus-within:ring-white/45">
              <Search
                size={14}
                aria-hidden
                className="pointer-events-none absolute left-3 text-white/50"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="종목 · 계획 이름으로 찾기"
                aria-label="계획 찾기"
                className="h-full w-full bg-transparent pr-8 pl-8 text-[13px] text-white outline-none placeholder:text-white/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="찾기 지우기"
                  className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </label>
            {/**
             * **가장 밝은 버튼은 체결 기록이다** (Q23 · 8장 ① 관습 · 패턴 56) — F2 거래 기록이
             * 유일한 필수 행동이다. 상단 바로 올렸다가 **이 페이지에만 두는 것으로 되돌렸다** (4장 ⑦).
             */}
            <button
              type="button"
              onClick={() => {
                openFill()
              }}
              className="rounded-pill text-fg-inverse bg-white px-3 py-1.5 text-[12px] font-bold hover:bg-white/90"
            >
              + 체결 기록
            </button>
          </div>
        </header>

        {/**
         * 완료의 도구 줄 — **왼쪽 결과 거르기 · 오른쪽 정렬** (사용자 「정렬로 보이게 · 이익 · 손실도 필터로」).
         * 정렬은 ↕ 아이콘 + 「정렬」 로 거르기와 모양을 가른다 — 둘 다 같은 알약이면 무엇이 무엇인지 안 읽힌다.
         */}
        {scope === 'DONE' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Seg
              label="결과"
              value={result}
              options={[
                ['ALL', '모두'],
                ['WIN', '이익'],
                ['LOSS', '손실'],
              ]}
              onChange={setResult}
            />
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 text-[12px] text-white/45">
                <ArrowUpDown size={13} aria-hidden />
                정렬
              </span>
              <div className="flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5">
                {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={sort === k}
                    onClick={() => setSort(k)}
                    className={cn(
                      'flex items-center gap-1 rounded-sm px-2.5 py-1 text-[12px] transition-colors',
                      sort === k
                        ? 'bg-white/[0.14] text-white'
                        : 'text-white/50 hover:text-white/75',
                    )}
                  >
                    {SORT_LABEL[k]}
                    {sort === k && k !== 'RECENT' && (
                      <span aria-hidden className="text-[10px] text-white/60">
                        {result === 'LOSS' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!account?.isLoggedIn ? (
          <Empty>로그인 후 이용할 수 있습니다.</Empty>
        ) : isLoading ? (
          <Empty>불러오는 중…</Empty>
        ) : isError ? (
          <Empty>계획을 불러오지 못했습니다.</Empty>
        ) : rows.length === 0 && slots.length === 0 ? (
          <Empty>
            {q ? `「${q}」 에 맞는 계획이 없습니다.` : EMPTY[scope]}
          </Empty>
        ) : (
          <>
            {rows.length > 0 && (
              /* 계획 하나 = 한 판 위의 줄 하나 · 열 이름은 머리에 한 번 (Q23 · 목록 나) */
              /**
               * **판 폭에 맞춰 줄이 접힌다 — 화면 폭이 아니라** (컨테이너 쿼리 @container).
               * 💀 오른쪽 체결 칸(440px) 이 열리면 판이 좁아지는데 열 틀이 화면 폭(lg) 을 봐서 줄이 넘쳤다.
               */
              <div className="bg-bg-elevated @container mt-4 overflow-hidden rounded-lg">
                <SheetHead ended={scope === 'DONE' || scope === 'CLOSED'} />
                {rows.map((p) => (
                  <PlanRow key={p.planId} p={p} onFill={onFill} />
                ))}
              </div>
            )}
            {slots.length > 0 && (
              <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {slots.map((h) => {
                  const none = !plans.some((p) => p.stockCode === h.stockCode)
                  return (
                    <Slot
                      key={h.stockCode}
                      code={h.stockCode}
                      name={h.stockName}
                      none={none}
                      onFillBare={() => fillBare(h.stockCode, h.stockName)}
                    />
                  )
                })}
              </div>
            )}
          </>
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
      ) : null}
    </main>
  )
}

/**
 * 거르기 한 벌 — **한 틀 안에 묶는다** (사용자 「이것도 좀 묶어 줘」). 위 상태 거르기와 같은 모양,
 * 눌린 칸만 이익 빨강 · 손실 파랑.
 */
function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-white/45">{label}</span>
      <div className="flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={cn(
              'rounded-sm px-2.5 py-1 text-[12px] transition-colors',
              value === v
                ? v === 'WIN'
                  ? 'bg-candle-up/20 text-candle-up'
                  : v === 'LOSS'
                    ? 'bg-candle-down/20 text-candle-down'
                    : 'bg-white/[0.14] text-white'
                : 'text-white/50 hover:text-white/75',
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
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
/**
 * **한 판 목록** (Q23 · 사용자 「붕 떠 보인다」 → 나) — 카드를 걷고 판 하나에 줄을 쌓는다.
 * 열 이름은 머리에 한 번 · 줄 사이는 옅은 선 · 머리와 줄이 **같은 열 틀** 을 써서 세로로 곧게 선다.
 * 💀 따로 떠 있는 긴 카드는 둥근 판 · 틈 · 줄마다 반복되는 「목표 · 진입 · 손절」 때문에 떠 보였다.
 * 판이 좁으면(@3xl = 768px 미만) 머리를 감추고 줄이 위아래로 접힌다.
 */
const LIVE_COLS =
  '@3xl:grid @3xl:grid-cols-[minmax(180px,1.6fr)_repeat(3,minmax(110px,1fr))_150px] @3xl:items-center'
const ENDED_COLS =
  '@3xl:grid @3xl:grid-cols-[minmax(180px,1.6fr)_repeat(3,minmax(100px,1fr))_150px] @3xl:items-center'

function SheetHead({ ended }: { ended: boolean }) {
  const cols = ended
    ? ['종목 · 계획', '쓴 날', '실현 손익', '수익률']
    : ['종목 · 계획', '목표', '진입', '손절']
  return (
    <div
      className={cn(
        'hidden border-b border-white/[0.08] px-5 py-2 text-[11px] text-white/45',
        ended ? ENDED_COLS : LIVE_COLS,
      )}
    >
      {cols.map((c) => (
        <span key={c}>{c}</span>
      ))}
      <span />
    </div>
  )
}

function PlanRow({
  p,
  onFill,
}: {
  p: PlanListItem
  onFill: (p: PlanListItem) => void
}) {
  const running = p.status === 'RUNNING'
  const waiting = p.status === 'PLANNED'
  const act = running || waiting
  const goal = goalR(p)
  const { entryPrice: entry, stopPrice: stop } = p
  // 1R 은 실행 때 박힌 최초 손절폭 — 손절가를 올려도 목표가는 안 변한다. 대기면 계획 손절폭
  const oneR = p.initialStopWidth ?? entry - stop
  // 본전 이상 — 손절을 진입 위로 올려 오늘 챙길 일이 적다. 작은 표시 하나
  const evenUp = running && stop >= entry
  const goalPrice = goal !== null && oneR > 0 ? entry + goal * oneR : null
  const tone = (v: number) =>
    v > 0 ? 'text-candle-up' : v < 0 ? 'text-candle-down' : 'text-white/55'

  const link = (
    <Link
      to="/stocks/$ticker/plan/$planId"
      params={{ ticker: p.stockCode, planId: String(p.planId) }}
      aria-label={`${p.title} 계획 보기`}
      className="flex shrink-0 items-center text-[12px] text-white/55 hover:text-white"
    >
      계획
      <ChevronRight size={14} aria-hidden />
    </Link>
  )

  return (
    <article
      className={cn(
        // 줄무늬 리듬 — 선 대신 번갈아 한 단 밝은 바탕 (Q23 · 줄 4장 ② 다)
        'group flex flex-col gap-2 px-5 py-3 transition-colors even:bg-white/[0.035] hover:bg-white/[0.06]',
        act ? LIVE_COLS : ENDED_COLS,
      )}
    >
      {/* 종목 · 계획 */}
      <div className="min-w-0 pr-4">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[15px] font-bold text-white">
            {p.stockName}
          </span>
          {evenUp && (
            <span className="bg-candle-up/15 text-candle-up shrink-0 rounded-xs px-1.5 text-[10px] leading-[16px]">
              본전 이상
            </span>
          )}
        </div>
        <p className="m-0 mt-0.5 truncate text-[11px] text-white/45">
          {/* 회색은 칸마다 하나 — 수량은 계획 화면에서 (Q23 · 줄 보조 글자 나) */}
          {p.title}
        </p>
      </div>

      {act ? (
        <>
          <Cell
            head="목표"
            value={goalPrice}
            tone="text-candle-up"
            note={goalPrice !== null ? `${goal}R` : null}
          />
          <Cell head="진입" value={entry} tone="text-white" note={null} />
          <Cell
            head="손절"
            value={stop}
            tone="text-candle-down"
            // 손절폭 % — 손절폭 상한과 매일 견준다 (9장 ③). 금액(원) 은 계획 화면에서
            note={entry > 0 ? pct((stop - entry) / entry) : null}
          />
          {/* 동작은 한 단 흐리게 — 올린 줄 · 키보드로 들어온 줄에서만 밝아진다 (Q23 · 줄 4장 ① 나) */}
          <div className="flex items-center justify-end gap-4 opacity-45 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            {link}
            <button
              type="button"
              onClick={() => onFill(p)}
              className="rounded-pill px-3 py-1 text-[12px] text-white/85 ring-1 ring-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              + 체결
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="t-num text-[13px] text-white/55">
            {p.writtenAt.slice(0, 10)}
          </span>
          <span
            className={cn(
              't-num text-[15px] font-medium',
              p.realized === null ? 'text-white/30' : tone(p.realized),
            )}
          >
            {p.realized === null
              ? '—'
              : p.realized === 0
                ? '본전'
                : man(p.realized)}
          </span>
          {/* 수익률로도 줄 세우므로 같이 싣는다 (7장 ②) */}
          <span
            className={cn(
              't-num text-[13px]',
              p.realizedPct === null ? 'text-white/30' : tone(p.realizedPct),
            )}
          >
            {p.realizedPct === null ? '—' : pct(p.realizedPct / 100)}
          </span>
          <div className="flex justify-end opacity-45 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            {link}
          </div>
        </>
      )}
    </article>
  )
}

/** 값 한 칸 — 값 · 그 옆에 작은 R · % · 금액. 좁을 때만 앞에 열 이름을 붙인다 */
function Cell({
  head,
  value,
  tone,
  note,
}: {
  head: string
  value: number | null
  tone: string
  note: string | null
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="w-8 shrink-0 text-[11px] text-white/45 @3xl:hidden">
        {head}
      </span>
      <span className={cn('t-num text-[15px] font-medium', tone)}>
        {value !== null ? won(Math.round(value)) : '—'}
      </span>
      {note && (
        <span className="t-num truncate text-[11px] text-white/45">{note}</span>
      )}
    </div>
  )
}

/**
 * 찾은 종목의 점선 빈 칸 — 새 계획은 그 종목 계획 화면에서 세운다 (Q11 · Q12).
 * 계획이 하나도 없는 종목이면 「계획 없이 체결」 도 같은 칸에.
 */
function Slot({
  code,
  name,
  none,
  onFillBare,
}: {
  code: string
  name: string
  none: boolean
  onFillBare: () => void
}) {
  const btn =
    'rounded-pill px-3 py-1 text-[12px] text-white/75 ring-1 ring-white/20 transition-colors hover:bg-white/[0.06] hover:text-white'
  return (
    <div
      role="group"
      aria-label={`${name} 빈 칸`}
      className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/25 px-4 py-3"
    >
      <span className="text-[13px] font-medium text-white/85">
        {name}
        {none && (
          <span className="ml-1.5 text-[11px] font-normal text-white/40">
            계획 없음
          </span>
        )}
      </span>
      <div className="flex flex-wrap justify-center gap-1.5">
        <Link to="/stocks/$ticker" params={{ ticker: code }} className={btn}>
          + 새 계획
        </Link>
        {none && (
          <button type="button" onClick={onFillBare} className={btn}>
            + 계획 없이 체결
          </button>
        )}
      </div>
    </div>
  )
}
