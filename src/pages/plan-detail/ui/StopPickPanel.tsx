import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  pendingGoal,
  pickProblem,
  stopPickOptions,
  toStopPick,
  usePickStop,
} from '@/entities/plan'
import type { PlanDetail, StopPick, StopPickOption } from '@/entities/plan'
import { RLadder } from './RHelp'
import { won } from './planParts'

/**
 * 고를 차례 단의 후보 — 카드와 차트가 **같은 줄**을 본다 (Q16 7).
 * 고를 차례가 없거나 1R 이 없으면 null.
 */
export function pickOptionsOf(plan: PlanDetail) {
  const pending = pendingGoal(plan.goals)
  const basis = plan.pickBasis
  if (!pending || !basis || plan.initialStopWidth == null) return null
  return {
    index: pending.index,
    goal: pending.goal,
    goalPrice: plan.entryPrice + pending.goal.r * plan.initialStopWidth,
    basis,
    options: stopPickOptions({
      entryPrice: plan.entryPrice,
      initialStopWidth: plan.initialStopWidth,
      goalR: pending.goal.r,
      currentStop: plan.stopPrice,
      avgWinPct: basis.avgWinPct,
      sampleCount: basis.sampleCount,
      ma20: basis.ma20,
      ma50: basis.ma50,
    }),
  }
}

/** 고른 자리 — 카드와 차트가 같은 값을 본다. 차트는 이 가격에 「새 스톱」 선을 긋는다 */
export interface PickChoice {
  label: string
  price: number
  pick: StopPick
}

/**
 * 후보를 **성질로 묶는다** (Q16 · 4장 29 제목을 붙인 섹션).
 *
 * 💀 가격순 목록(목표 → 지금 스톱)으로 세웠더니 머리 「목표 3R 도착」 과 첫 줄 「목표 3R」 이
 *    같은 말을 두 번 했고, 줄마다 이름 · R · 가격이 같은 무게로 늘어서 무엇으로 지킬지가
 *    안 읽혔다. 사용자가 「R 로 지키기 · 통계로 · 이평선」 칩 묶음을 «제일 읽기 좋다»고 골랐다.
 */
const GROUPS: { title: string; kinds: StopPickOption['kind'][] }[] = [
  { title: 'R 로 지키기', kinds: ['BREAKEVEN', 'R'] },
  { title: '통계로', kinds: ['AVG'] },
  { title: '이평선', kinds: ['MA20', 'MA50'] },
]

/**
 * **목표 도착 — 스톱을 옮길 자리를 고른다** (Q16). 계획 카드 맨 위에 선다.
 *
 * ```text
 * 목표 3R 도착 · 09-17 종가 1,240,000
 * 후보                 가격      종가 대비
 * R 로 지키기
 *   본전           1,120,000     −9.7%      (흐림) 본전 — 지금 스톱 이하
 *   +1R            1,160,000     −6.5%
 * 통계로 · 이평선 …
 * 직접          [_______] [원|R]
 * ─────────────────────────────
 * 평균 수익률 4.7%   1,120,000 → 1,172,864 · +1.3R
 * [ 이 자리로 옮기기 ]
 * ```
 *
 * - 후보는 **전부** 뜬다. 계획 때 골라 두지 않았다 — 그날 장을 보고 고른다 (Q16 4)
 * - 고른 칩 하나가 차트에 「새 스톱」 선으로 선다. 후보를 전부 긋지 않는다
 * - 못 고르는 까닭은 **그 묶음 바로 밑**에 (10장 F — 영향받는 컨트롤 옆)
 * - 이평선은 **그날 값으로 한 번** 옮긴다. 매일 따라가지 않는다
 * - 옮기면 곧 손절가가 바뀐다. 「증권사에서 고쳤나」 를 따로 묻지 않는다
 */
export function StopPickPanel({
  plan,
  pick,
  value,
  onChange,
}: {
  plan: PlanDetail
  pick: NonNullable<ReturnType<typeof pickOptionsOf>>
  value: PickChoice | null
  onChange: (next: PickChoice | null) => void
}) {
  const mutation = usePickStop(plan.planId)
  const w = plan.initialStopWidth ?? 0
  /**
   * **그날 종가에서 얼마나 아래인가** — 후보를 이 값으로 견준다 (2026-09-17).
   * 종가가 곧 «지금 가격»이라, 스톱이 거기서 몇 % 밑에 서는지가 다시 내려가면 내주는 몫이다.
   */
  const fromClose = (price: number) => {
    const close = pick.basis.close
    const pct = close > 0 ? ((price - close) / close) * 100 : 0
    return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(1)}%`
  }
  const rText = (price: number) => {
    const r = w > 0 ? (price - plan.entryPrice) / w : 0
    return `${r >= 0 ? '+' : ''}${r.toFixed(1)}R`
  }

  return (
    <section
      aria-label="스톱 옮길 자리 고르기"
      className="ring-warning/40 bg-warning/[0.06] mt-3 rounded-lg px-3 py-2.5 ring-1"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-warning text-[13px] font-bold">
          목표 {pick.goal.r}R 도착
        </span>
        <span className="font-number text-[11px] text-white/45">
          {pick.basis.date.slice(5)} 종가 {won(pick.basis.close)}
        </span>
        <span className="ml-auto">
          <RLadder
            entryPrice={plan.entryPrice}
            oneR={plan.initialStopWidth ?? 0}
            goalR={pick.goal.r}
          />
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {/* 표 — 정확한 값을 견준다 (2026-09-17). 칩에 붙인 % 로는 가격이 안 보였다 */}
        <div
          className={cn(
            PICK_COLS,
            'border-b border-white/[0.06] px-1.5 pb-0.5 text-[10px] text-white/35',
          )}
        >
          <span>후보</span>
          <span className="text-right">가격</span>
          <span className="text-right">종가 대비</span>
        </div>
        {GROUPS.map((g) => {
          const opts = pick.options.filter((o) => g.kinds.includes(o.kind))
          const blocked = opts.filter((o) => o.blocked)
          return (
            <div key={g.title}>
              <div className="mb-0.5 px-1.5 text-[11px] text-white/40">
                {g.title}
              </div>
              <div className="flex flex-col gap-px">
                {opts.map((o) => {
                  const on = value?.label === o.label
                  return (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${o.label}${o.price != null ? ` ${won(o.price)} 종가 대비 ${fromClose(o.price)}` : ''}`}
                      disabled={o.blocked != null}
                      onClick={() =>
                        o.price != null &&
                        onChange(
                          on
                            ? null
                            : {
                                label: o.label,
                                price: o.price,
                                pick: toStopPick(o),
                              },
                        )
                      }
                      className={cn(
                        PICK_COLS,
                        'rounded-md px-1.5 py-1 text-left text-[12px] disabled:cursor-not-allowed disabled:opacity-35',
                        on
                          ? 'bg-brand-blue/20 text-brand-blue ring-brand-blue/60 ring-1'
                          : 'text-white/80 hover:bg-white/[0.08]',
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      <span className="font-number text-right tabular-nums">
                        {o.price != null ? won(o.price) : '—'}
                      </span>
                      <span
                        className={cn(
                          'font-number text-right tabular-nums',
                          on ? 'text-brand-blue/80' : 'text-white/45',
                        )}
                      >
                        {o.price != null ? fromClose(o.price) : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* 못 고르는 까닭 — 그 묶음 바로 밑 (10장 F) */}
              {blocked.length > 0 && (
                <div className="mt-0.5 px-1.5 text-[11px] text-white/30">
                  {blocked.map((o) => `${o.label} — ${o.blocked}`).join(' · ')}
                </div>
              )}
            </div>
          )
        })}

        <div>
          <div className="mb-1 text-[11px] text-white/40">직접</div>
          <DirectPick
            entryPrice={plan.entryPrice}
            oneR={w}
            currentStop={plan.stopPrice}
            goal={pick.goalPrice}
            fromClose={fromClose}
            on={value?.label === DIRECT}
            onChange={(price) =>
              onChange(
                price == null
                  ? value?.label === DIRECT
                    ? null
                    : value
                  : { label: DIRECT, price, pick: { kind: 'DIRECT', price } },
              )
            }
          />
        </div>
      </div>

      {/* 고른 것 — 지금 스톱에서 어디로 가나 */}
      <div className="mt-2.5 border-t border-white/[0.08] pt-2">
        {value ? (
          <div className="flex items-baseline gap-2 text-[12px]">
            <span className="text-brand-blue truncate">{value.label}</span>
            <span className="font-number ml-auto shrink-0 text-white/45 tabular-nums">
              {won(plan.stopPrice)} →
            </span>
            <span className="font-number shrink-0 text-white tabular-nums">
              {won(value.price)}
            </span>
            <span className="font-number shrink-0 text-[11px] text-white/40">
              종가 {fromClose(value.price)} · {rText(value.price)}
            </span>
          </div>
        ) : (
          <div className="font-number text-[11px] text-white/35">
            지금 스톱 {won(plan.stopPrice)}
            <span className="font-text"> · 안 고르면 그대로</span>
          </div>
        )}
        <button
          type="button"
          disabled={value == null || mutation.isPending}
          onClick={() =>
            value &&
            mutation.mutate(
              { goalIndex: pick.index, pick: value.pick },
              { onSuccess: () => onChange(null) },
            )
          }
          className="bg-warning/20 text-warning hover:bg-warning/30 mt-2 w-full rounded-md py-1.5 text-[13px] font-bold disabled:bg-white/[0.04] disabled:font-normal disabled:text-white/30"
        >
          {mutation.isPending ? '옮기는 중…' : '이 자리로 옮기기'}
        </button>
      </div>
      {mutation.error && (
        <div className="text-brand-red mt-1 text-[11px]">
          ✕ {mutation.error.message}
        </div>
      )}
    </section>
  )
}

const DIRECT = '직접'

/** 고르기 표의 열 — 후보 · 가격 · 종가 대비 */
const PICK_COLS =
  'grid grid-cols-[minmax(0,1fr)_84px_60px] items-center gap-1.5'

/**
 * 직접 — [원 | R] 을 바꿔 친다 (Q16 5). 스톱가격 칸의 [원 | %] 와 같은 짝.
 * 설 수 있는 값일 때만 올려 보낸다. 못 서면 까닭을 칸 옆에 (10장 F).
 */
function DirectPick({
  entryPrice,
  oneR,
  currentStop,
  goal,
  fromClose,
  on,
  onChange,
}: {
  entryPrice: number
  oneR: number
  currentStop: number
  goal: number
  /** 종가 대비 % — 칩과 같은 잣대로 읽어 준다 */
  fromClose: (price: number) => string
  on: boolean
  onChange: (price: number | null) => void
}) {
  const [unit, setUnit] = useState<'won' | 'r'>('won')
  const [text, setText] = useState('')
  const priceOf = (t: string, u: 'won' | 'r') => {
    const n = Number(t)
    if (t === '' || !Number.isFinite(n)) return null
    return u === 'won' ? n : Math.round(entryPrice + n * oneR)
  }
  const price = priceOf(text, unit)
  const problem = price == null ? null : pickProblem(price, currentStop, goal)
  const update = (t: string, u: 'won' | 'r') => {
    setText(t)
    const p = priceOf(t, u)
    onChange(p != null && pickProblem(p, currentStop, goal) == null ? p : null)
  }

  return (
    <div className="flex items-center gap-1.5 text-[12px]">
      <input
        aria-label={unit === 'won' ? '직접 스톱가격' : '직접 스톱 R배수'}
        value={
          unit === 'won' && text ? Number(text).toLocaleString('ko-KR') : text
        }
        onChange={(e) =>
          update(
            e.target.value.replace(unit === 'won' ? /[^0-9]/g : /[^0-9.]/g, ''),
            unit,
          )
        }
        inputMode={unit === 'won' ? 'numeric' : 'decimal'}
        className={cn(
          'bg-bg-input font-number w-28 min-w-0 rounded px-1.5 py-0.5 text-right text-white outline-none focus:ring-1 focus:ring-white/30',
          on && 'ring-brand-blue/60 ring-1',
        )}
      />
      <div className="flex shrink-0 overflow-hidden rounded ring-1 ring-white/10">
        {(['won', 'r'] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => {
              setUnit(u)
              update('', u)
            }}
            className={cn(
              'px-1.5 py-0.5 text-[11px]',
              unit === u ? 'bg-white/[0.14] text-white' : 'text-white/40',
            )}
          >
            {u === 'won' ? '원' : 'R'}
          </button>
        ))}
      </div>
      {/* 친 단위의 «반대편»을 읽어 준다. 못 서는 값이면 까닭을 */}
      <span
        className={cn(
          'font-number ml-auto text-[11px] tabular-nums',
          problem ? 'text-brand-red/80' : 'text-white/45',
        )}
      >
        {price == null
          ? ''
          : (problem ??
            `${unit === 'r' ? `${won(price)} · ` : ''}종가 ${fromClose(price)}`)}
      </span>
    </div>
  )
}
