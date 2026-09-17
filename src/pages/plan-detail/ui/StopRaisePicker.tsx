import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { STOP_RAISE_PRESETS, sameStopRaise } from '@/entities/plan'
import type { StopRaise } from '@/entities/plan'

/**
 * 스톱 상향 — **넷 중 하나를 반드시 고른다** (Q12 · ③-3-1).
 *
 * ```text
 * 2R · 3R · 직접 입력(R배수)   발동하면 본전으로
 * 백스톱 : 평균수익률          발동하면 평균수익률 자리로.  통계 5건 전에는 못 고른다
 * ```
 *
 * ⚠️ «끔»이 없다. 차트 위쪽 면(+R)이 늘 이 값까지 칠해진다.
 *
 * ⚠️ 직접 입력은 **칸을 벗어날 때** 받는다 (Q11 F). `2.` 까지 친 순간에 값이
 *    바뀌면 차트 면이 치는 동안 튄다.
 */
export function StopRaisePicker({
  value,
  onChange,
  avgLocked,
}: {
  value: StopRaise | null
  onChange: (next: StopRaise) => void
  /** 백스톱을 못 고르는 이유. 고를 수 있으면 null */
  avgLocked: string | null
}) {
  const custom =
    value?.kind === 'R' &&
    !STOP_RAISE_PRESETS.includes(value.r as (typeof STOP_RAISE_PRESETS)[number])
  const [text, setText] = useState(custom ? String(value.r) : '')

  const commit = () => {
    const r = Number(text)
    if (Number.isFinite(r) && r > 0) onChange({ kind: 'R', r })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STOP_RAISE_PRESETS.map((r) => (
        <Chip
          key={r}
          on={sameStopRaise(value, { kind: 'R', r })}
          onClick={() => onChange({ kind: 'R', r })}
        >
          {r}R
        </Chip>
      ))}
      <Chip
        on={value?.kind === 'AVG'}
        disabled={avgLocked != null}
        onClick={() => onChange({ kind: 'AVG' })}
      >
        백스톱 : 평균수익률
        {avgLocked && (
          <span className="ml-1 text-[10px] text-white/35">{avgLocked}</span>
        )}
      </Chip>
      <label
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]',
          custom
            ? 'bg-white/[0.14] text-white'
            : 'bg-white/[0.04] text-white/40',
        )}
      >
        직접
        <input
          aria-label="스톱 상향 직접 입력 R배수"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
          onBlur={commit}
          inputMode="decimal"
          placeholder="2.5"
          className="bg-bg-input font-number w-10 rounded px-1 text-right text-white outline-none placeholder:text-white/20"
        />
        R
      </label>
    </div>
  )
}

const Chip = ({
  on,
  disabled,
  onClick,
  children,
}: {
  on: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-pressed={on}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'font-number rounded-md px-2 py-0.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40',
      on
        ? 'bg-white/[0.14] text-white'
        : 'bg-white/[0.04] text-white/40 hover:text-white/70',
    )}
  >
    {children}
  </button>
)
