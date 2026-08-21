import { Search } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'

type SearchBarProps = Omit<React.ComponentProps<'input'>, 'className'> & {
  className?: string
}

/**
 * Shared search input. Pressing Enter with a non-empty query navigates to the
 * search results page (`/search?q=...`). Used across the app.
 */
export function SearchBar({
  placeholder = '종목을 검색해 보세요',
  className,
  onKeyDown,
  ...props
}: SearchBarProps) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'bg-bg-input flex h-12 items-center gap-3 rounded-full border border-white/5 px-[22px]',
        className,
      )}
    >
      <Search size={20} strokeWidth={2} className="shrink-0 text-white/50" />
      <input
        className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/50"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const q = e.currentTarget.value.trim()
            if (q) navigate({ to: '/search', search: { q } })
          }
          onKeyDown?.(e)
        }}
        {...props}
      />
    </div>
  )
}
