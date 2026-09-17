import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  GOAL_R_PRESETS,
  goalPrice,
  goalState,
  stopPickLabel,
} from '@/entities/plan'
import type { StopGoal } from '@/entities/plan'
import { Pair, won } from './planParts'

/**
 * **스톱 사다리 편집기** (Q16 · ③-3-1). 계획 때는 목표 R 만 건다.
 *
 * ```text
 * ✓ ① 2R  1,200,000   09-12 닿음 → 본전           닿은 단 — 잠긴다
 *   ② [2][3][4][5][__]R      1,240,000  ×    안 닿은 단 — 고친다 · 지운다
 *
 * ⚠️ 「+ 단 추가」 를 뺐다 (2026-09-17 사용자 — 「안 해도 된다」). 새 계획은 ① 단 하나다.
 *    모델은 여러 단을 그대로 든다 — 이미 여러 단인 계획은 그대로 보이고 고친다.
 * ```
 *
 * 💀 Q12 의 「스톱 상향 칩 + 50일선 트레일링 켬/끔」 을 갈아 끼웠다. 옮길 자리는 여기서
 *    안 묻는다 — 닿은 날 후보에서 고른다 (Q16 4).
 *
 * ⚠️ 직접 입력은 **칸을 벗어날 때** 받는다 (Q11 F). `2.` 까지 친 순간에 값이 바뀌면
 *    차트 면이 치는 동안 튄다.
 */
export function StopLadderEditor({
  value,
  locked,
  onChange,
  entryPrice,
  stopPrice,
  initialStopWidth,
}: {
  /** 안 닿은 단들의 목표 R. 비어 있는 단은 null */
  value: (number | null)[]
  /** 닿은 단 — 앞에서부터. 못 고친다 */
  locked: StopGoal[]
  onChange: (next: (number | null)[]) => void
  entryPrice: number
  stopPrice: number
  initialStopWidth: number | null
}) {
  const priceOf = (r: number | null) =>
    r == null ? null : goalPrice(entryPrice, stopPrice, r, initialStopWidth)
  const setAt = (i: number, r: number | null) =>
    onChange(value.map((v, k) => (k === i ? r : v)))

  return (
    <div className="flex flex-col gap-1">
      {locked.map((g, i) => (
        <LockedRow key={`l${i}`} n={i} goal={g} price={priceOf(g.r)} />
      ))}
      {value.map((r, i) => {
        const n = locked.length + i
        const floor = (i === 0 ? locked.at(-1)?.r : value[i - 1]) ?? 0
        return (
          <div
            key={n}
            className="flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-1 whitespace-nowrap"
          >
            <span className="w-3.5 shrink-0 text-[12px] text-white/35">
              {circled(n)}
            </span>
            {/* 칩에는 숫자만 — R 은 끝에 한 번 (324px 한 줄에 가격까지 들어간다) */}
            {GOAL_R_PRESETS.map((p) => (
              <Chip
                key={p}
                label={`${p}R`}
                on={r === p}
                disabled={p <= floor}
                onClick={() => setAt(i, p)}
              >
                {p}
              </Chip>
            ))}
            <DirectR
              value={r}
              preset={r != null && GOAL_R_PRESETS.some((p) => p === r)}
              onCommit={(v) => setAt(i, v)}
              label={`${circled(n)} 단 목표 직접 입력 R배수`}
            />
            <span className="font-number ml-auto shrink-0 text-[12px] text-white/60 tabular-nums">
              {priceOf(r) != null ? won(priceOf(r) as number) : ''}
            </span>
            {value.length + locked.length > 1 && (
              <button
                type="button"
                aria-label={`${circled(n)} 단 지우기`}
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                className="px-1 text-[13px] text-white/30 hover:text-white/70"
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 사다리 읽기 (Q16). 닿은 단 · 고를 차례 · 다음 목표 · 그 뒤가 한 줄씩 선다.
 * 다음 목표가 어디쯤인지 보여야 「얼마나 더 오르면 올릴 수 있는지」 를 미리 안다 (③-3-1).
 */
export function StopLadderView({
  goals,
  entryPrice,
  stopPrice,
  initialStopWidth,
}: {
  goals: StopGoal[]
  entryPrice: number
  stopPrice: number
  initialStopWidth: number | null
}) {
  const nextIdx = goals.findIndex((g) => g.hitAt == null)
  return (
    <div className="flex flex-col">
      {goals.map((g, i) => {
        const state = goalState(g)
        const price = goalPrice(entryPrice, stopPrice, g.r, initialStopWidth)
        const quiet = (state === 'WAIT' && i !== nextIdx) || state === 'SKIPPED'
        return (
          // 계획 카드의 두 칸 격자에 선다 — 왼쪽 목표 · 오른쪽 그 결과
          <Pair
            key={i}
            className={cn('py-0.5 text-[12px]', quiet && 'text-white/35')}
            left={
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'w-3 text-white/40',
                    state === 'PICKED' && 'text-success',
                    state === 'PICK' && 'text-warning',
                  )}
                >
                  {state === 'PICKED' ? '✓' : circled(i)}
                </span>
                <span className="font-number">{g.r}R</span>
                <span className="font-number ml-auto tabular-nums">
                  {price != null ? won(price) : '—'}
                </span>
              </div>
            }
            right={
              <div
                className={cn(
                  'truncate',
                  state === 'PICK' ? 'text-warning' : 'text-white/50',
                )}
              >
                {state === 'PICKED' && g.picked
                  ? `${g.hitAt?.slice(5)} → ${stopPickLabel(g.picked)} ${won(g.picked.price)}`
                  : state === 'SKIPPED'
                    ? `${g.hitAt?.slice(5)} 도착 — 안 고름`
                    : state === 'PICK'
                      ? `${g.hitAt?.slice(5)} 도착 — 고를 차례`
                      : i === nextIdx
                        ? '다음 목표'
                        : ''}
              </div>
            }
          />
        )
      })}
    </div>
  )
}

function LockedRow({
  n,
  goal,
  price,
}: {
  n: number
  goal: StopGoal
  price: number | null
}) {
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-[12px] text-white/40">
      <span className="w-4">{circled(n)}</span>
      <span className="font-number">{goal.r}R</span>
      <span className="font-number">{price != null ? won(price) : ''}</span>
      <span className="ml-auto truncate">
        {goal.picked
          ? `${goal.hitAt?.slice(5)} → ${stopPickLabel(goal.picked)}`
          : goal.skipped
            ? `${goal.hitAt?.slice(5)} 안 고름`
            : `${goal.hitAt?.slice(5)} 닿음`}
      </span>
      <span aria-label="닿은 단은 못 고친다">🔒</span>
    </div>
  )
}

/** 끝수 R — 칸을 벗어날 때 받는다 */
function DirectR({
  value,
  preset,
  onCommit,
  label,
}: {
  value: number | null
  preset: boolean
  onCommit: (r: number | null) => void
  label: string
}) {
  const [text, setText] = useState(
    value != null && !preset ? String(value) : '',
  )
  const on = value != null && !preset
  return (
    <label
      className={cn(
        'flex shrink-0 items-center gap-0.5 rounded-md py-0.5 pr-1 text-[12px]',
        on ? 'text-white' : 'text-white/40',
      )}
    >
      {/* 빈 칸 자체가 직접 입력이다 — 「직접」 글자를 뺐다 */}
      <input
        aria-label={label}
        value={on ? text : preset ? '' : text}
        onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
        onBlur={() => {
          const r = Number(text)
          if (text && Number.isFinite(r) && r > 0) onCommit(r)
        }}
        inputMode="decimal"
        placeholder="2.5"
        className={cn(
          'bg-bg-input font-number w-8 rounded px-1 text-right text-white outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/30',
          on && 'ring-1 ring-white/40',
        )}
      />
      R
    </label>
  )
}

const Chip = ({
  label,
  on,
  disabled,
  onClick,
  children,
}: {
  /** 칩 글자가 숫자뿐이라 읽는 이름은 따로 — 「3R」 */
  label?: string
  on: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={on}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'font-number w-6 shrink-0 rounded-md py-0.5 text-center text-[12px] disabled:cursor-not-allowed disabled:opacity-30',
      on
        ? 'bg-white/[0.14] text-white'
        : 'bg-white/[0.04] text-white/40 hover:text-white/70',
    )}
  >
    {children}
  </button>
)

const circled = (i: number) => '①②③④⑤⑥⑦⑧⑨⑩'[i] ?? `${i + 1}`
