import { cn } from '@/shared/lib/cn'

export type UnderlineTab = {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
  /** Solid accent color when active (underline + count badge). Defaults to the red gradient. */
  activeColor?: string
}

type UnderlineTabsProps = {
  tabs: UnderlineTab[]
  value: string
  onChange: (id: string) => void
  className?: string
}

/**
 * Equal-width tabs split to fill their container, each with an accent underline
 * + count badge when active. (돌파 성공 / 돌파 준비)
 */
export function UnderlineTabs({
  tabs,
  value,
  onChange,
  className,
}: UnderlineTabsProps) {
  return (
    <div className={cn('flex h-12 items-stretch', className)}>
      {tabs.map((tab) => {
        const active = tab.id === value
        const accent = tab.activeColor
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-2.5 px-0.5 pb-3 text-[18px] font-bold transition-colors',
              active ? 'text-white' : 'text-white/50',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count != null && (
              <span
                className={cn(
                  'font-number rounded-full px-[9px] py-0.5 text-[12px] font-bold',
                  !active && 'bg-white/[0.08] text-white/65',
                  active && !accent && 'bg-brand-red-hi/[0.18] text-[#FF6B9A]',
                )}
                style={
                  active && accent
                    ? { background: `${accent}2e`, color: accent }
                    : undefined
                }
              >
                {tab.count}
              </span>
            )}
            <span
              className={cn(
                'absolute inset-x-0 bottom-0 h-[3px] rounded-[3px]',
                !active && 'bg-white/10',
              )}
              style={
                active ? { background: accent ?? 'var(--grad-red)' } : undefined
              }
            />
          </button>
        )
      })}
    </div>
  )
}
