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
 * **목표 편집기** (Q16 · ③-3-1). 계획 때는 목표 R **하나**만 건다.
 *
 * ```text
 * 목표 [2][3][4][5][__]R      1,240,000
 * ```
 *
 * 💀 처음엔 목표를 여러 단 쌓는 사다리였다. 「+ 단 추가」 를 뺐고(「안 해도 된다」), 카드에도
 *    이력 · 고를 차례 · 다음 목표가 줄줄이 서 있었다(「하나만」). 목표는 하나다 — 도착해서 스톱을
 *    옮기고 나면 다음 목표를 새로 건다. 모델은 도착한 목표를 이력으로 그대로 든다.
 *
 * 💀 Q12 의 「스톱 상향 칩 + 50일선 트레일링 켬/끔」 을 갈아 끼웠다. 옮길 자리는 여기서
 *    안 묻는다 — 도착한 날 후보에서 고른다 (Q16 4).
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
  /** 안 닿은 목표 R — 하나. 비었으면 [] 또는 [null] */
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
  /**
   * 목표는 **하나**다 (Q16 「목표 하나」). 안 닿은 목표가 없으면(도착해서 골랐으면)
   * 빈 칸 하나를 띄워 다음 목표를 새로 건다.
   */
  const r = value[0] ?? null
  const set = (next: number | null) => onChange([next])
  const floor = locked.at(-1)?.r ?? 0

  return (
    <div className="flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-1 whitespace-nowrap">
      <span className="shrink-0 text-[12px] text-white/40">목표</span>
      {/* 칩에는 숫자만 — R 은 끝에 한 번 (324px 한 줄에 가격까지 들어간다).
          도착한 목표 이하는 흐려진다 — 다음 목표는 더 위다 */}
      {GOAL_R_PRESETS.map((p) => (
        <Chip
          key={p}
          label={`${p}R`}
          on={r === p}
          disabled={p <= floor}
          onClick={() => set(p)}
        >
          {p}
        </Chip>
      ))}
      <DirectR
        value={r}
        preset={r != null && GOAL_R_PRESETS.some((p) => p === r)}
        onCommit={set}
        label="목표 직접 입력 R배수"
      />
      <span className="font-number ml-auto shrink-0 text-[12px] text-white/60 tabular-nums">
        {priceOf(r) != null ? won(priceOf(r) as number) : ''}
      </span>
    </div>
  )
}

/**
 * 목표 읽기 — **한 줄**이다 (2026-09-17 · Q16 「목표 하나」).
 *
 * 고를 차례가 있으면 그 목표, 아니면 다음 목표, 둘 다 없으면 마지막으로 도착한 목표.
 * 💀 도착한 이력 · 고를 차례 · 다음 목표를 전부 줄로 늘어놓았더니 셋이 같은 무게로 읽혔다.
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
  const pending = goals.find((g) => goalState(g) === 'PICK')
  const g = pending ?? goals.find((x) => x.hitAt == null) ?? goals.at(-1)
  if (!g) return <div className="text-[12px] text-white/30">목표 없음</div>
  const state = goalState(g)
  const price = goalPrice(entryPrice, stopPrice, g.r, initialStopWidth)
  return (
    <Pair
      className="py-0.5 text-[12px]"
      left={
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'w-3 text-white/40',
              state === 'PICKED' && 'text-success',
              state === 'PICK' && 'text-warning',
            )}
          >
            {state === 'PICKED' ? '✓' : '●'}
          </span>
          <span className="font-number">목표 {g.r}R</span>
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
                : '아직 안 닿음'}
        </div>
      }
    />
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
  // 칩을 누르면 쓰던 글자를 비운다 — 렌더 중에 이전 값과 견줘 맞춘다
  const [seenPreset, setSeenPreset] = useState(preset ? value : null)
  if (preset && value !== seenPreset) {
    setSeenPreset(value)
    setText('')
  }
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
        // 💀 칩이 켜져 있으면 칸을 늘 ''로 박아 두어 쳐도 글자가 안 들어갔다 (2026-09-17)
        value={text}
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
