import { useMemo, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { useAccount } from '@/entities/auth'
import { PLAN_STATUS_LABEL, usePlanList } from '@/entities/plan'
import type { PlanListItem, PlanStatus } from '@/entities/plan'

/**
 * 거래 계획 — **계획 컬렉션**.
 *
 * 목록의 «원소»는 계획이다. 종목은 갈래를 묶는 머리줄일 뿐이라
 * 필터도 정렬도 계획 기준으로 선다 (종목 컬렉션이 되면 루트 내비에 종목이 둘이 된다).
 *
 * 스냅샷 목록(`/captures`)이 있던 자리다 — Q3 이 「승격 대상」으로 남겨둔 그 자리이고,
 * 스냅샷 → TradePlan 승격이 곧 이 화면이다.
 *
 * ⚠️ TradePlan API 가 백엔드에 없다. msw 목이 유일한 구현이다.
 */

/** 「지금 할 일」이 기본이다. 지난 것은 필터를 풀면 그대로 나온다 — 지우지 않는다 */
const DEFAULT_STATUSES: PlanStatus[] = ['RUNNING', 'PLANNED']
const ALL_STATUSES: PlanStatus[] = ['RUNNING', 'PLANNED', 'DONE', 'CLOSED']

/** 실행 중이 맨 위. 돈이 걸린 것은 하나뿐이라 작성일 순으로 밀리면 안 된다 */
const STATUS_RANK: Record<PlanStatus, number> = {
  RUNNING: 0,
  PLANNED: 1,
  DONE: 2,
  CLOSED: 3,
}

export function PlansPage() {
  const { data: account } = useAccount()
  const [statuses, setStatuses] = useState<PlanStatus[]>(DEFAULT_STATUSES)
  const [keyword, setKeyword] = useState('')

  const { data: plans = [], isLoading, isError } = usePlanList({ statuses })

  /** 종목으로 묶는다 — 갈래를 그리려면 뿌리가 있어야 한다 */
  const groups = useMemo(() => {
    const q = keyword.trim()
    const rows = q
      ? plans.filter((p) => p.stockName.includes(q) || p.stockCode.includes(q))
      : plans

    const byStock = new Map<string, PlanListItem[]>()
    for (const p of rows) {
      const list = byStock.get(p.stockCode) ?? []
      list.push(p)
      byStock.set(p.stockCode, list)
    }

    return [...byStock.values()]
      .map((list) => {
        const sorted = [...list].sort(
          (a, b) =>
            STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            b.writtenAt.localeCompare(a.writtenAt),
        )
        return {
          // 그룹은 «계획이 있어서» 만들어지므로 첫 줄이 늘 있다. 타입은 그것을
          // 모르니 빈 그룹을 아래에서 걸러낸다
          head: sorted.at(0),
          plans: sorted,
          // 대기이 둘 이상이면 갈래다 — 하나만 실현되고 나머지는 사용자가 닫는다
          branch: sorted.filter((p) => p.status === 'PLANNED').length,
        }
      })
      .filter((g): g is typeof g & { head: NonNullable<typeof g.head> } =>
        Boolean(g.head),
      )
      .sort(
        (a, b) =>
          STATUS_RANK[a.head.status] - STATUS_RANK[b.head.status] ||
          b.head.writtenAt.localeCompare(a.head.writtenAt),
      )
  }, [plans, keyword])

  const toggle = (s: PlanStatus) =>
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )

  return (
    <main className="flex flex-col gap-4 px-6 pt-6 pb-6">
      <section className="card flex w-full min-w-0 flex-col px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold text-white">거래 계획</h3>
            <div className="mt-1 text-[12px] text-white/45">
              {groups.length}개 종목 · 계획 {plans.length}개
            </div>
          </div>
        </div>

        {/* 상태로 가른다 — 넷이 한 목록에 섞이면 「지금 할 일」이 안 보인다 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] transition-colors',
                statuses.includes(s)
                  ? 'bg-white/[0.14] font-semibold text-white'
                  : 'bg-white/[0.04] text-white/45 hover:text-white/70',
              )}
            >
              {PLAN_STATUS_LABEL[s]}
            </button>
          ))}
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="종목명"
            className="ml-2 h-[30px] w-[140px] rounded-full bg-white/[0.04] px-3 text-[12px] text-white placeholder:text-white/30 focus:bg-white/[0.07] focus:outline-none"
          />
        </div>

        {!account?.isLoggedIn && (
          <p className="m-0 py-14 text-center text-[13px] text-white/40">
            로그인 후 이용할 수 있습니다.
          </p>
        )}

        {account?.isLoggedIn && isLoading && (
          <p className="m-0 py-14 text-center text-[13px] text-white/40">
            불러오는 중…
          </p>
        )}

        {account?.isLoggedIn && isError && (
          <p className="m-0 py-14 text-center text-[13px] text-white/40">
            계획을 불러오지 못했습니다.
          </p>
        )}

        {account?.isLoggedIn &&
          !isLoading &&
          !isError &&
          groups.length === 0 && (
            <p className="m-0 py-14 text-center text-[13px] text-white/40">
              조건에 맞는 계획이 없습니다.
            </p>
          )}

        {/* 임시 — 흐름 안 셋을 늘어놨다가 지웠다. 컬렉션은 「언제 보는 화면인가」가
            정해져야 열이 나온다. 싱글을 먼저 정하고 돌아온다 */}
        {account?.isLoggedIn && (
          <div className="mt-4 flex flex-col gap-2.5">
            {groups.map((g) => (
              <div
                key={g.head.stockCode}
                className="rounded-[12px] bg-white/[0.03] px-4 py-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-white">
                    {g.head.stockName}
                  </span>
                  <span className="font-number text-[11px] text-white/35">
                    {g.head.stockCode}
                  </span>
                  <span className="font-number ml-auto text-[12px] text-white/45">
                    지금 {g.head.riskBefore.toFixed(2)}%
                  </span>
                </div>
                <div className="mt-2 flex flex-col">
                  {g.plans.map((p) => (
                    <div
                      key={p.planId}
                      // 매수·매도 칸을 뺐다 — **계획에 그런 구분이 없다.**
                      // 파는 일은 계획 «안»(스톱가격·갱신 규칙)에 있다
                      className="grid grid-cols-[56px_minmax(0,1fr)_74px_120px] items-center gap-2 py-1.5 text-[13px]"
                    >
                      <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-center text-[11px] text-white/70">
                        {PLAN_STATUS_LABEL[p.status]}
                      </span>
                      <span className="font-number text-white/85">
                        {p.entryPrice.toLocaleString('ko-KR')}
                        <span className="text-white/25"> → </span>
                        {p.stopPrice.toLocaleString('ko-KR')}
                      </span>
                      <span className="font-number text-right text-white/55">
                        {p.quantity}주
                      </span>
                      <span className="font-number text-right">
                        <span className="text-white/35">
                          {p.riskBefore.toFixed(2)}%
                        </span>
                        <span className="text-white/25"> → </span>
                        <span
                          className={
                            p.riskAfter > 2.5 ? 'text-brand-red' : 'text-white'
                          }
                        >
                          {p.riskAfter.toFixed(2)}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
