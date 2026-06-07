import type { CSSProperties } from 'react'
import type { Regime } from '@/shared/lib/snapshots'

/**
 * Single source for the regime glyph (돌파성공/준비/실패/하방이탈/방향미정).
 * Yellow S/R lines are fixed; the trend line + arrowhead use `currentColor`, so
 * callers (pills, item cards, filters) just set `color`. Arrowheads sit at the
 * end of the trend line, rotated to its direction. Used everywhere a regime icon
 * appears, so pill icons and item-card icons stay identical (only size differs).
 */
type RegimeIconProps = {
  regime: Regime
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
}

const YELLOW = '#EEB82D'
const arrow = (transform: string) => (
  <path
    d="M-6 -4 L0 0 L-6 4"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    transform={transform}
  />
)

export function RegimeIcon({
  regime,
  width = 24,
  height = 18,
  className,
  style,
}: RegimeIconProps) {
  const common = {
    width,
    height,
    className,
    style,
    overflow: 'visible' as const,
  }

  if (regime === 'none') {
    return (
      <svg viewBox="0 0 32 32" {...common}>
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M11.5 12 C 11.5 8.5 14 7 16 7 C 18 7 20.5 8.5 20.5 11 C 20.5 14 16 14 16 18"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="23" r="1.4" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="-2 -2 40 36" {...common}>
      {regime === 'start' && (
        <>
          <line
            x1="2"
            y1="18"
            x2="32"
            y2="18"
            stroke={YELLOW}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 24 L8 22 L13 19 L18 13 L24 6 L30 2"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {arrow('translate(30 2) rotate(-33.69)')}
        </>
      )}
      {regime === 'prep' && (
        <>
          <line
            x1="2"
            y1="6"
            x2="32"
            y2="6"
            stroke={YELLOW}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="2"
            y1="22"
            x2="32"
            y2="22"
            stroke={YELLOW}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 16 L6 18 L10 14 L14 16 L18 13 L22 14 L26 9 L30 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {arrow('translate(30 4) rotate(-51.34)')}
        </>
      )}
      {regime === 'fail' && (
        <>
          <line
            x1="2"
            y1="6"
            x2="32"
            y2="6"
            stroke={YELLOW}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 22 L8 18 L13 13 L17 9 L20 8 L23 11 L26 16 L30 20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {arrow('translate(30 20) rotate(45)')}
        </>
      )}
      {regime === 'drop' && (
        <>
          <line
            x1="2"
            y1="10"
            x2="32"
            y2="10"
            stroke={YELLOW}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 6 L8 9 L13 12 L18 18 L24 24 L30 28"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {arrow('translate(30 28) rotate(33.69)')}
        </>
      )}
    </svg>
  )
}
