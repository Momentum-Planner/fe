import { Link } from '@tanstack/react-router'
import { ArrowUpDown, ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAccount } from '@/entities/auth'
import { usePlanDefaults, usePlanList } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'
import { useStockSearch } from '@/entities/search'
import { cn } from '@/shared/lib/cn'
import {
  FillSheet,
  NewFillForm,
  closeFill,
  openFill,
  useFillPanel,
} from './fill'

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

/**
 * **예상 위험노출 %** — 계획대로 다 샀다면 · 지금 손절 기준 (Q23 · 사용자 「예상 위험노출만」).
 * max(0, 계획 진입 − 지금 손절) × 계획 수량 ÷ 계좌 총액. 손절을 R 로 올려야 줄고, 본전 이상이면 0.
 * 💀 체결 기준(보유 · 평단) 으로 재 봤다가 걷었다 — 위험노출은 손절을 올려야 바뀌는 값이지 체결로 바뀌는 값이 아니다.
 * R배수와 다른 값이다. 계좌 총액을 모르면 null.
 */
export const riskOf = (p: PlanListItem, accountTotal: number) =>
  accountTotal > 0
    ? (Math.max(0, p.entryPrice - p.stopPrice) * p.quantity * 100) /
      accountTotal
    : null
/** 위험노출 구간 — 1% 미만 / 1~2.5% / 2.5% 초과(경고만 · 막지 않는다) */
const riskTone = (v: number) =>
  v > 2.5 ? 'text-warning' : v === 0 ? 'text-white/35' : 'text-white'

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
    if (scope === 'RUNNING') return sorted
    /**
     * 대기 · 폐기 — **같은 종목은 붙여 세운다** (Q23 · 줄 4장 ④ 나 근접성). 종목 순서는 그 안 가장 최근 계획 순.
     * 판 · 테두리 없이 붙이기만 — 같은 종목 줄은 이름 옆 작은 번호(PlanRow seq · 다). 흐림 · 막대는 걷었다
     */
    const by = new Map<string, PlanListItem[]>()
    for (const p of sorted)
      by.set(p.stockCode, [...(by.get(p.stockCode) ?? []), p])
    return [...by.values()].flat()
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

  // 계좌 총액 — 사용자에 하나(F7). 목에선 종목별 기본값에 실려 온다 — 아무 실행 중 종목으로 꺼낸다
  const running = plans.filter((p) => p.status === 'RUNNING')
  const { data: defaults } = usePlanDefaults(
    running[0]?.stockCode ?? plans[0]?.stockCode,
  )
  const accountTotal = defaults?.accountTotal ?? 0

  const showSheet =
    !!account?.isLoggedIn && !isLoading && !isError && rows.length > 0

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
        'grid items-start gap-4 px-3 pt-4 pb-10 sm:px-6 sm:pt-6',
        fill && 'xl:grid-cols-[minmax(0,1fr)_440px]',
      )}
    >
      <section className="card flex min-w-0 flex-col px-3 pb-5 sm:px-5">
        {/**
         * **도구 줄 + 열 머리를 함께 붙잡는다** (Q23 · 줄 4장 ⑦ 다) — 상단 바(56px) 밑에 붙어 따라온다.
         * 어디까지 내려가도 거르고 · 찾고 · 「+ 체결 기록」 을 누르고, 흰 숫자가 어느 열인지 머리가 알려 준다.
         * @container 는 이 틀에 — 머리와 줄이 같은 폭을 보고 접혀야 열이 맞는다.
         */}
        <div className="@container">
          {/* 판과 같은 색 · 같은 둥근 윗모서리 (2026-09-19 사용자 · 「제일 밖 박스 테두리」).
              💀 bg-surface(#1e1e1e)는 판(카드 그라데이션 ≈ #0b0b0b)보다 밝아 위 띠만 떠 보였고,
              네모 모서리가 판의 둥근 모서리를 덮었다. 붙잡혀 내용 위에 떠야 해서 불투명 — 판 위쪽 색에 가장 가까운 #0a0a0a */}
          <div className="bg-bg-input sticky top-[56px] z-20 -mx-3 rounded-t-lg px-3 pt-4 sm:-mx-5 sm:px-5 sm:pt-5">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="m-0 text-[18px] font-bold text-white">
                거래 계획
              </h3>
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
              {/* 줄이 바뀌면(@3xl 미만) 한 줄을 다 쓴다 — 오른쪽에 붙어 들여 쓴 것처럼 «깨져» 보였다 (2026-09-19 사용자) */}
              <div className="flex basis-full items-center gap-2 @min-[700px]:ml-auto @min-[700px]:basis-auto">
                {/**
                 * 거래 계획만의 찾기 — 지금 거르기 안의 카드를 줄이고, 실행 중 · 대기 에선 찾은 종목의 빈 칸이 선다.
                 * 💀 처음엔 배경과 같은 어두운 칸이라 「안 보인다」 — 테두리 · 돋보기 · 지우기를 붙였다.
                 */}
                <label className="rounded-pill bg-bg-input relative flex h-8 min-w-0 flex-1 items-center ring-1 ring-white/20 transition-shadow focus-within:ring-white/45 @min-[700px]:w-[240px] @min-[700px]:flex-none">
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
                  className="rounded-pill text-fg-inverse bg-white px-3 py-1.5 text-[12px] font-bold whitespace-nowrap hover:bg-white/90"
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
                          <span
                            aria-hidden
                            className="text-[10px] text-white/60"
                          >
                            {result === 'LOSS' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {showSheet && (
              <div className="bg-bg-elevated mt-4 rounded-t-lg">
                <SheetHead kind={kindOf(scope)} />
              </div>
            )}
          </div>

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
                <div className="bg-bg-elevated overflow-hidden rounded-lg @min-[700px]:rounded-t-none">
                  {rows.map((p, i) => (
                    <PlanRow
                      key={p.planId}
                      p={p}
                      onFill={onFill}
                      seq={
                        // 종목끼리 붙여 세우는 대기 · 폐기에서만 — 실행 중이 붙는 건 우연이다
                        scope === 'PLANNED' || scope === 'CLOSED'
                          ? seqOf(rows, i)
                          : null
                      }
                      risk={riskOf(p, accountTotal)}
                    />
                  ))}
                </div>
              )}
              {slots.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
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
        </div>
      </section>

      {/**
       * 체결 칸 — 누를 때만 · 넓으면 오른쪽 칸, 좁으면 서랍 (Q23 · 4장 ⑥).
       * 늘 세워 두는 안(C) 은 써 보고 A(현재가 막대) 로 옮겼다.
       */}
      {fill && (
        <FillSheet dock onClose={closeFill}>
          <NewFillForm
            // 다른 줄을 누르면 폼이 그 계획으로 새로 선다
            key={fill.start?.planId ?? 'blank'}
            start={fill.start}
            onClose={closeFill}
          />
        </FillSheet>
      )}
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
 * 판이 좁으면(700px 미만) 머리를 감추고 줄이 위아래로 접힌다.
 * 700 ~ 896 에선 표는 두고 현재가 열만 비운다 — 체결 칸을 열면 1280 에서 판 안쪽이 721 까지 준다 (2026-09-19 사용자 「현재가만 날리면」)
 */
/**
 * 열 틀 — **값 열은 고정 폭 · 숫자 오른쪽 맞춤 · 남는 폭은 버튼 앞 한 칸(1fr)** (Q23 · 줄 4장 ③ 나).
 * 버튼 칸은 104 고정 — max-content 였을 때 머리(버튼 없음 · 0)와 줄(103)의 폭이 달라
 * 좁은 판에서 머리의 이름 칸만 넓어져 숫자 열 머리가 오른쪽으로 밀렸다 (2026-09-19 사용자 「숫자랑 안 맞아」).
 * 💀 값 열이 판 폭을 나눠 가져 넓을수록 벌어졌고, 왼쪽 맞춤이라 자릿수가 다른 줄은 끝이 어긋났다.
 */
const COLS =
  // 가 (열 간격) — 값은 96px 고정으로 촘촘히 한 덩어리 · 이름 288 · 남는 폭은 버튼 앞 한 칸 · 버튼 칸은 내용 폭
  // 「조화」(값 1fr : 틈 0.6fr) 는 써 보고 「별로」 로 되돌렸다
  '@min-[700px]:grid @min-[700px]:grid-cols-[minmax(160px,224px)_repeat(3,minmax(88px,112px))_minmax(0,1fr)_104px] @min-[700px]:items-center @min-[700px]:gap-x-4'
const LIVE_COLS =
  '@min-[700px]:grid @min-[700px]:grid-cols-[minmax(150px,224px)_repeat(3,minmax(84px,112px))_minmax(96px,132px)_minmax(0,1fr)_104px] @4xl:grid-cols-[minmax(160px,224px)_repeat(3,minmax(88px,112px))_minmax(100px,132px)_minmax(150px,1fr)_104px] @min-[700px]:items-center @min-[700px]:gap-x-4'
const ENDED_COLS = COLS
/** 실행 중 · 대기는 값 열이 넷 — 손절 뒤에 「예상 위험노출」 */
const RUN_COLS =
  '@min-[700px]:grid @min-[700px]:grid-cols-[minmax(150px,224px)_repeat(3,minmax(84px,112px))_minmax(96px,132px)_minmax(0,1fr)_104px] @4xl:grid-cols-[minmax(160px,224px)_repeat(3,minmax(88px,112px))_minmax(100px,132px)_minmax(150px,1fr)_104px] @min-[700px]:items-center @min-[700px]:gap-x-4'

type Kind = 'RUNNING' | 'PLANNED' | 'ENDED'
const kindOf = (s: Scope): Kind =>
  s === 'RUNNING' ? 'RUNNING' : s === 'PLANNED' ? 'PLANNED' : 'ENDED'
const colsOf = (k: Kind) =>
  k === 'RUNNING' ? RUN_COLS : k === 'PLANNED' ? LIVE_COLS : ENDED_COLS

function SheetHead({ kind }: { kind: Kind }) {
  const ended = kind === 'ENDED'
  const cols = ended
    ? ['종목 · 계획', '쓴 날', '실현 손익', '수익률']
    : ['종목 · 계획', '목표', '진입', '손절', '예상 위험노출']
  return (
    <div
      className={cn(
        'hidden border-b border-white/[0.08] px-3 py-2 text-[11px] text-white/45 sm:px-5',
        colsOf(kind),
      )}
    >
      {cols.map((c, i) => (
        <span
          key={c}
          className={cn(
            i > 0 && 'text-right',
            // 가격 셋과 위험노출을 조금 떼어 놓는다 — 폭 132(값 96 + 36) · 옅은 세로선
            c === '예상 위험노출' &&
              '@min-[700px]:self-stretch @min-[700px]:border-l @min-[700px]:border-white/[0.08]',
          )}
        >
          {/* 색은 머리에만 — 차트 태그 색을 한 번 알려 준다 (Q23 · 줄 4장 ⑤ 나) */}
          {!ended && (c === '목표' || c === '손절') ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                c === '목표' ? 'text-candle-up' : 'text-candle-down',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  c === '목표' ? 'bg-candle-up' : 'bg-candle-down',
                )}
              />
              {c}
            </span>
          ) : c === '예상 위험노출' ? (
            // 칸이 좁으면(판 896 미만) 「노출」 을 뺀다 — 102px 칸에서 두 줄로 꺾였다
            <span className="whitespace-nowrap">
              예상 위험
              <span className="hidden @4xl:inline">노출</span>
            </span>
          ) : (
            c
          )}
        </span>
      ))}
      {ended ? (
        <span />
      ) : (
        // 「현재가」 — 전날 종가(마감 뒤 값) 가 손절 · 목표 사이 어디 있나 (Q23 · 줄 배치 A · 이름은 랭킹 · 검색과 맞춘다)
        <span className="overflow-hidden whitespace-nowrap @min-[700px]:self-stretch @min-[700px]:text-transparent @4xl:border-l @4xl:border-white/[0.08] @4xl:pl-4 @4xl:text-inherit">
          현재가
        </span>
      )}
      <span />
    </div>
  )
}

/**
 * 같은 종목 무리 안의 몇 번째인가 — 무리가 둘 이상일 때만 (1부터). 혼자면 null.
 * 이름 옆 작은 번호로 보인다 (2026-09-19 사용자 · 다). 흐림 · 왼쪽 막대는 「어색」
 */
function seqOf(rows: PlanListItem[], i: number): number | null {
  const code = rows[i]?.stockCode
  let start = i
  while (start > 0 && rows[start - 1]?.stockCode === code) start--
  let end = i
  while (end < rows.length - 1 && rows[end + 1]?.stockCode === code) end++
  return end > start ? i - start + 1 : null
}

function PlanRow({
  p,
  onFill,
  seq = null,
  risk = null,
}: {
  p: PlanListItem
  onFill: (p: PlanListItem) => void
  /** 같은 종목 무리 안의 번호 — 이름 옆 작은 알약 (줄 4장 ④ · 다) */
  seq?: number | null
  /** 예상 위험노출 % — 계좌 총액을 모르면 null */
  risk?: number | null
}) {
  const running = p.status === 'RUNNING'
  const waiting = p.status === 'PLANNED'
  const act = running || waiting
  const goal = goalR(p)
  const { entryPrice: entry, stopPrice: stop } = p
  // 1R 은 실행 때 박힌 최초 손절폭 — 손절가를 올려도 목표가는 안 변한다. 대기면 계획 손절폭
  const oneR = p.initialStopWidth ?? entry - stop

  const goalPrice = goal !== null && oneR > 0 ? entry + goal * oneR : null
  const tone = (v: number) =>
    v > 0 ? 'text-candle-up' : v < 0 ? 'text-candle-down' : 'text-white/55'

  /** 줄 끝 › — 줄 전체가 계획 화면으로 간다는 표지 (링크는 이름에 걸려 줄을 덮는다) */
  const chevron = (
    <ChevronRight size={16} aria-hidden className="shrink-0 text-white/55" />
  )

  return (
    <article
      className={cn(
        // 줄무늬 리듬 — 선 대신 번갈아 한 단 밝은 바탕 (Q23 · 줄 4장 ② 다)
        // 줄 전체가 계획 화면 — 이름 링크가 줄을 덮는다(after:inset-0) · 「+ 체결」 만 위에 뜬다 (Q23 · 줄 4장 ⑥ 나)
        // 좁으면(판 896 미만) 네 칸 격자 — 이름 · 동작 한 줄, 값 넷 한 줄, 현재가 한 줄 (값이 한 줄씩 늘어져 줄이 길었다)
        'group relative grid cursor-pointer grid-cols-4 gap-x-3 gap-y-2 px-3 py-3 transition-colors even:bg-white/[0.035] hover:bg-white/[0.06] sm:px-5',
        colsOf(running ? 'RUNNING' : waiting ? 'PLANNED' : 'ENDED'),
      )}
    >
      {/* 종목 · 계획 */}
      <div className="col-span-3 min-w-0 pr-4 @min-[700px]:col-span-1">
        <div className="flex items-baseline gap-2">
          <Link
            to="/stocks/$ticker/plan/$planId"
            params={{ ticker: p.stockCode, planId: String(p.planId) }}
            aria-label={`${p.stockName} ${p.title} 계획 보기`}
            className={cn(
              "truncate text-[15px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-1 focus-visible:after:ring-white/40",
              'font-bold text-white',
            )}
          >
            {p.stockName}
          </Link>
          {seq !== null && (
            <span
              aria-label={`같은 종목 ${seq}번째 계획`}
              className="rounded-pill shrink-0 px-1.5 text-[10px] leading-4 font-medium text-white/55 ring-1 ring-white/20"
            >
              {seq}
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
            tone="text-white"
            note={goalPrice !== null ? `${goal}R` : null}
          />
          <Cell head="진입" value={entry} tone="text-white" note={null} />
          <Cell
            head="손절"
            value={stop}
            tone="text-white"
            // 손절폭 % — 손절폭 상한과 매일 견준다 (9장 ③). 금액(원) 은 계획 화면에서
            note={entry > 0 ? pct((stop - entry) / entry) : null}
          />
          {/* 예상 위험노출 — 본전 이상이면 0% (「본전 이상」 칩을 걷고 이 값이 대신 말한다) */}
          <div className="flex min-w-0 flex-col gap-0.5 @min-[700px]:items-end @min-[700px]:justify-center @min-[700px]:gap-0 @min-[700px]:self-stretch @min-[700px]:border-l @min-[700px]:border-white/[0.08]">
            <span className="text-[11px] text-white/45 @min-[700px]:hidden">
              예상 위험
            </span>
            <span
              className={cn(
                't-num text-[15px] font-medium',
                risk === null ? 'text-white/30' : riskTone(risk),
              )}
            >
              {risk === null ? '—' : `${risk.toFixed(1)}%`}
            </span>
            <span className="hidden text-[11px] @min-[700px]:invisible @min-[700px]:block">
              ·
            </span>
          </div>
          {/* 동작은 한 단 흐리게 — 올린 줄 · 키보드로 들어온 줄에서만 밝아진다 (Q23 · 줄 4장 ① 나) */}
          <NowBar p={p} goalPrice={goalPrice} />
          <div className="order-first col-start-4 row-start-1 flex items-center justify-end gap-4 opacity-45 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 @min-[700px]:order-none @min-[700px]:col-start-auto @min-[700px]:row-start-auto @min-[700px]:pl-4">
            <button
              type="button"
              onClick={() => onFill(p)}
              className="rounded-pill relative z-10 px-3 py-1 text-[12px] whitespace-nowrap text-white/85 ring-1 ring-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              + 체결
            </button>
            {chevron}
          </div>
        </>
      ) : (
        <>
          <span className="t-num text-[13px] text-white/55 @min-[700px]:text-right">
            {p.writtenAt.slice(0, 10)}
          </span>
          <span
            className={cn(
              't-num text-[15px] font-medium @min-[700px]:text-right',
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
              't-num text-[13px] @min-[700px]:text-right',
              p.realizedPct === null ? 'text-white/30' : tone(p.realizedPct),
            )}
          >
            {p.realizedPct === null ? '—' : pct(p.realizedPct / 100)}
          </span>
          <span aria-hidden className="hidden @min-[700px]:block" />
          <div className="col-start-4 row-start-1 flex justify-end opacity-45 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 @min-[700px]:col-start-auto @min-[700px]:row-start-auto @min-[700px]:pl-4">
            {chevron}
          </div>
        </>
      )}
    </article>
  )
}

/**
 * **지금 어디쯤** — 손절 ─ 진입 ─ 목표 막대 위에 전날 종가 점 (Q23 · 줄 배치 A).
 * 💀 넓은 판에서 어떻게 두어도 남던 빈 공간을 이 목록을 매일 여는 이유 — 「지금 가격이 손절 · 목표 사이 어디쯤인가」 로 채운다.
 * 손절까지 3% 안이면 주황. 판이 넓을 때(@6xl) 만 막대를 그리고, 좁으면 「손절까지 −x%」 글자만.
 */
function NowBar({
  p,
  goalPrice,
}: {
  p: PlanListItem
  goalPrice: number | null
}) {
  const now = p.lastClose
  if (now === null)
    return (
      <span className="col-span-4 text-[11px] text-white/30 @min-[700px]:invisible @min-[700px]:col-span-1 @min-[700px]:self-stretch @min-[700px]:border-l @min-[700px]:border-white/[0.08] @min-[700px]:pl-4 @4xl:visible">
        —
      </span>
    )
  const toStop = (p.stopPrice - now) / now
  const toGoal = goalPrice !== null ? (goalPrice - now) / now : null
  const near = toStop > -0.03
  const lo = p.stopPrice
  const hi = goalPrice ?? Math.max(now, p.entryPrice) * 1.05
  const at = (v: number) =>
    `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`
  return (
    // 위험노출과 사이에 옅은 세로선 (사용자 「선 좀」)
    // 오른쪽 동작(+ 체결) 과 떼어 둔다 — 막대 끝 점이 버튼에 붙지 않게 (pr-8)
    <div className="col-span-4 flex min-w-0 flex-col justify-center gap-1 @min-[700px]:invisible @min-[700px]:col-span-1 @min-[700px]:self-stretch @min-[700px]:pr-8 @min-[700px]:pl-4 @4xl:visible @4xl:border-l @4xl:border-white/[0.08]">
      <div className="from-candle-down/40 to-candle-up/40 relative hidden h-1 rounded-full bg-gradient-to-r via-white/15 @6xl:block">
        <span
          aria-hidden
          className="absolute -top-1 h-3 w-px bg-white/50"
          style={{ left: at(p.entryPrice) }}
        />
        <span
          aria-hidden
          className="border-bg-elevated absolute -top-[5px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 bg-white"
          style={{ left: at(now) }}
        />
      </div>
      <div className="t-num flex items-baseline justify-between gap-3 text-[11px]">
        <span className={near ? 'text-warning' : 'text-white/55'}>
          손절까지 {pct(toStop)}
        </span>
        <span className="text-white/80">{won(now)}</span>
        {toGoal !== null && (
          <span className="hidden text-white/55 @6xl:inline">
            목표까지 {pct(toGoal)}
          </span>
        )}
      </div>
    </div>
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
    // 좁으면 [열 이름 값 보조] 한 줄 · 판이 넓으면(@3xl) 값 오른쪽 맞춤 + 보조는 값 밑 (줄 4장 ③)
    <div className="flex min-w-0 flex-col gap-0.5 @min-[700px]:items-end @min-[700px]:gap-0">
      <span className="text-[11px] text-white/45 @min-[700px]:hidden">
        {head}
      </span>
      <span
        className={cn('t-num text-[14px] font-medium sm:text-[15px]', tone)}
      >
        {value !== null ? won(Math.round(value)) : '—'}
      </span>
      <span
        className={cn(
          't-num truncate text-[11px] text-white/45',
          !note && 'hidden @min-[700px]:invisible @min-[700px]:block',
        )}
      >
        {note ?? '·'}
      </span>
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
      // 표 밑의 가로 줄 (2026-09-19 사용자 · 가) — 이름 왼쪽 · 버튼 오른쪽, 표의 줄과 같은 안쪽 여백.
      // 점선이 «아직 없는 줄». 💀 카드 시절의 가운데 정렬 상자(약 170px)가 표 밑에서 혼자 떠 보였다
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-dashed border-white/25 px-3 py-2.5 sm:px-5"
    >
      <span className="min-w-0 truncate text-[15px] font-bold text-white/85">
        {name}
        {none && (
          <span className="ml-2 text-[11px] font-normal text-white/40">
            계획 없음
          </span>
        )}
      </span>
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
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
