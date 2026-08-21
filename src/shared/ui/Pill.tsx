import { cn } from '@/shared/lib/cn'

type PillVariant = 'outline' | 'red' | 'blue' | 'yellow'

const variantStyles: Record<PillVariant, string> = {
  outline: 'border border-white/50 bg-white/[0.04] text-white/85',
  red: 'border-[1.5px] border-brand-red text-white',
  blue: 'border-[1.5px] border-brand-blue text-white',
  yellow: 'border-[1.5px] border-brand-yellow text-white',
}

type PillProps = {
  variant?: PillVariant
  className?: string
  children: React.ReactNode
}

/** Pill-shaped tag (100px radius). Lifts through border, never a fill. */
export function Pill({ variant = 'outline', className, children }: PillProps) {
  return (
    <span
      className={cn(
        'font-number inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
