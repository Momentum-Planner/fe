import { useState } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * 계획 칸의 부품 — **새 계획 폼과 계획 보기 카드가 같이 쓴다** (Q11 · Q12).
 *
 * 💀 보기 카드가 옛 배치(위험노출 막대 · 회색 상자 칸)로 남아 있어 폼과 모양이 갈렸다.
 * 「쓰는 모양이 곧 될 모양」이어야 세우고 나서 배울 것이 없다 — 부품을 한 곳에 둔다.
 */
export const won = (n: number) => n.toLocaleString('ko-KR')

/** 섹션 하나 — 구분선 + 소제목 (Q12 게슈탈트 「구분선」) */
export function Section({
  title,
  tail,
  first,
  children,
}: {
  title: string
  tail?: React.ReactNode
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'pt-2.5 pb-1',
        first ? 'mt-1.5' : 'mt-2 border-t border-white/[0.06]',
      )}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[13px] font-bold text-white/80">{title}</span>
        {tail && <span className="ml-auto">{tail}</span>}
      </div>
      {children}
    </div>
  )
}

/**
 * **두 칸 격자** — 계획 카드의 모든 줄이 이 가운데 선을 나눠 쓴다 (2026-09-17).
 *
 * ```text
 * 진입 예상가   │ 스톱가격
 * 수량          │ 위험노출
 * ✓ 2R 1,200,000 │ 08-26 → 본전
 * ```
 *
 * 💀 섹션마다 제 격자(`gap-2` · `16px_36px_76px_1fr` · `84px_28px_1fr_40px`)를 따로 썼더니
 *    세로로 줄이 하나도 안 맞았다. 가운데 선 하나를 모든 섹션이 공유한다 — 선은 «살짝만».
 */
export function Pair({
  left,
  right,
  className,
}: {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2', className)}>
      <div className="min-w-0 pr-3">{left}</div>
      <div className="min-w-0 border-l border-white/[0.06] pl-3">{right}</div>
    </div>
  )
}

/** 값 밑의 한 줄 — 비어도 높이를 지켜 왼쪽 · 오른쪽 칸의 줄이 맞는다 */
export const Foot = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => (
  <div
    className={cn(
      'font-number mt-0.5 min-h-[15px] text-[11px] leading-snug text-white/40',
      className,
    )}
  >
    {children}
  </div>
)

/**
 * 숫자 칸 — **숫자와 쉼표만 받고, 치는 동안 쉼표를 찍는다** (Q11 D · F).
 * 그 밖의 글자는 아예 안 찍힌다. 「만」「억」은 안 읽는다.
 */
export function MoneyField({
  label,
  value,
  onChange,
  onBlur,
  unit,
  block,
  warn,
  picking,
  onPick,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  onBlur: () => void
  unit?: string
  block?: string
  warn?: string
  picking?: boolean
  onPick?: () => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <FieldLabel label={label} picking={picking} onPick={onPick} />
      <div className="relative">
        <input
          aria-label={label}
          value={value ? won(value) : ''}
          onChange={(e) =>
            onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
          }
          onBlur={onBlur}
          inputMode="numeric"
          className={cn(
            'bg-bg-input font-number w-full rounded-md px-2 py-1 text-right text-[14px] text-white outline-none focus:ring-1 focus:ring-white/30',
            unit && 'pr-6',
            block && 'ring-brand-red/50 ring-1',
            picking && 'ring-brand-blue/60 ring-1',
          )}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[12px] text-white/35">
            {unit}
          </span>
        )}
      </div>
      <Message block={block} warn={warn} />
    </div>
  )
}

/**
 * 스톱가격 — **[원|%] 전환** (Q11 D).
 * % 로 치면 칸을 벗어날 때 진입가 기준 가격으로 바꿔 넣는다. % 칸만 점(.)을 받는다.
 */
export function StopField({
  entry,
  value,
  onChange,
  onBlur,
  picking,
  onPick,
  block,
  warn,
}: {
  entry: number
  value: number
  onChange: (n: number) => void
  onBlur: () => void
  picking?: boolean
  onPick?: () => void
  block?: string
  warn?: string
}) {
  const [unit, setUnit] = useState<'won' | 'pct'>('won')
  const [pct, setPct] = useState('')
  const pctBlock =
    unit === 'pct' && pct !== '' && entry <= 0
      ? '✕ 진입가를 먼저 넣는다'
      : undefined

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <FieldLabel label="스톱가격" picking={picking} onPick={onPick} />
      <div className="flex gap-1">
        <input
          aria-label={unit === 'won' ? '스톱가격' : '스톱가격 %'}
          value={unit === 'won' ? (value ? won(value) : '') : pct}
          onChange={(e) =>
            unit === 'won'
              ? onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
              : setPct(e.target.value.replace(/[^0-9.]/g, ''))
          }
          onBlur={() => {
            if (unit === 'pct' && entry > 0 && Number(pct) > 0)
              onChange(Math.round(entry * (1 - Number(pct) / 100)))
            onBlur()
          }}
          inputMode={unit === 'won' ? 'numeric' : 'decimal'}
          placeholder={unit === 'pct' ? '3.5' : undefined}
          className={cn(
            'bg-bg-input font-number w-full min-w-0 rounded-md px-2 py-1 text-right text-[14px] text-white outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/30',
            (block ?? pctBlock) && 'ring-brand-red/50 ring-1',
            picking && 'ring-brand-blue/60 ring-1',
          )}
        />
        <div className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
          {(['won', 'pct'] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => {
                setUnit(u)
                setPct('')
              }}
              className={cn(
                'px-1.5 text-[11px]',
                unit === u ? 'bg-white/[0.14] text-white' : 'text-white/40',
              )}
            >
              {u === 'won' ? '원' : '%'}
            </button>
          ))}
        </div>
      </div>
      {unit === 'pct' && value > 0 && !pctBlock && (
        <span className="font-number text-[11px] text-white/35">
          → {won(value)}
        </span>
      )}
      <Message block={block ?? pctBlock} warn={warn} />
    </div>
  )
}

export function FieldLabel({
  label,
  picking,
  onPick,
}: {
  label: string
  picking?: boolean
  onPick?: () => void
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-white/40">
      {label}
      {/* ④-1-1-1 의 📦 자료가 「차트」다 — 그 «자리»를 짚는 것이 실제 동작이다 */}
      {onPick && (
        <button
          type="button"
          onClick={onPick}
          className={cn(
            'rounded-full px-1.5 py-[1px] text-[9px] transition-colors',
            picking
              ? 'bg-brand-blue/25 text-brand-blue'
              : 'bg-white/[0.06] text-white/35 hover:text-white/70',
          )}
        >
          {picking ? '차트에서 집는 중' : '차트에서 집기'}
        </button>
      )}
    </span>
  )
}

/** ✕ 는 막는 것, ⚠ 는 넘어도 가는 것 — 기호가 형태로 갈리므로 색이 무너져도 남는다 */
export const Message = ({ block, warn }: { block?: string; warn?: string }) =>
  block ? (
    <span className="text-brand-red text-[11px]">{block}</span>
  ) : warn ? (
    <span className="text-warning text-[11px]">{warn}</span>
  ) : null

/** 켬/끔 하나. 세부 화면의 `Toggle` 과 같은 모양이다 */
export const Sw = ({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 self-start rounded-md px-2 py-0.5 text-[12px] transition-colors',
      on
        ? 'bg-white/[0.12] text-white/85'
        : 'bg-white/[0.03] text-white/35 hover:text-white/60',
    )}
  >
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        on ? 'bg-brand-red' : 'bg-white/20',
      )}
    />
    {children}
  </button>
)

export const Btn = ({
  children,
  onClick,
  disabled,
  go,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  go?: boolean
  className?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'rounded-full px-3 py-1 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      go
        ? 'bg-brand-red/85 hover:bg-brand-red text-white'
        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white',
      className,
    )}
  >
    {children}
  </button>
)

export type Candidate = {
  label: string
  price: number
  width: number
  overLimit: boolean
  /** 「상한 N%」 줄 — 손절폭이 상한을 넘을 때 맨 위에 선다 (Q11 E) */
  limit?: boolean
}

/**
 * 손절가 후보 선 — **서비스가 하나를 정해 주지 않는다** (④-1-1-2).
 * `onPick` 이 없으면 읽기 전용이다 — 안 눌리는 것이 버튼처럼 생기면 눌러 보게 된다.
 *
 * 상한을 넘는 선은 지우지 않고 **색조 + ⚠** 로 말한다. 흐림은 이 앱에서 「못 누른다」라 안 쓴다.
 */
/**
 * 손절폭 글자. 스톱이 진입가 «위»면(본전 위로 올린 스톱) 폭이 음수로 온다 —
 * 💀 `−{width}%` 로 붙였더니 「--0.27%」 가 떴다. 위쪽이면 + 로 쓴다
 */
export const stopWidthText = (width: number) =>
  width < 0 ? `+${Math.abs(width)}%` : width === 0 ? '0%' : `−${width}%`

export function CandidateList({
  items,
  chosen,
  onPick,
}: {
  items: Candidate[]
  chosen: number
  onPick?: (price: number) => void
}) {
  return (
    <div className="mt-1.5 flex flex-col gap-0.5 border-t border-white/[0.06] pt-1.5">
      {items.map((c) => {
        const on = c.price === chosen
        const shape = cn(
          'grid grid-cols-[1fr_76px_50px] items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[12px]',
          on && 'bg-white/[0.09]',
          c.limit && 'ring-warning/40 ring-1',
        )
        const row = (
          <>
            <span
              className={cn(
                'truncate',
                c.limit ? 'text-warning' : on ? 'text-white' : 'text-white/50',
              )}
            >
              {c.label}
            </span>
            <span className="font-number text-right text-white/80 tabular-nums">
              {won(c.price)}
            </span>
            <span
              className={cn(
                'font-number text-right tabular-nums',
                c.overLimit ? 'text-warning' : 'text-white/40',
              )}
            >
              {c.overLimit && <span aria-hidden>⚠</span>}
              {stopWidthText(c.width)}
            </span>
          </>
        )
        return onPick ? (
          <button
            key={c.label}
            type="button"
            onClick={() => onPick(c.price)}
            aria-label={`${c.label} ${won(c.price)} 손절폭 ${c.width}%${c.overLimit ? ' · 상한 초과' : ''}`}
            className={cn(shape, 'hover:bg-white/[0.10]')}
          >
            {row}
          </button>
        ) : (
          <div key={c.label} className={shape}>
            {row}
          </div>
        )
      })}
    </div>
  )
}
