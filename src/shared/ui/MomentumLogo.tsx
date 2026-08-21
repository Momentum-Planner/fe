import { useId } from 'react'
import type { SVGProps } from 'react'

/** Momentum brand mark — three rising candle bars in the red→pink gradient. */
export function MomentumLogo({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  const gradId = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stopColor="#FF3636" />
          <stop offset="100%" stopColor="#FF367C" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="18"
        width="5"
        height="10"
        rx="1"
        fill={`url(#${gradId})`}
      />
      <rect
        x="13"
        y="11"
        width="5"
        height="17"
        rx="1"
        fill={`url(#${gradId})`}
      />
      <rect
        x="22"
        y="3"
        width="5"
        height="25"
        rx="1"
        fill={`url(#${gradId})`}
      />
    </svg>
  )
}
