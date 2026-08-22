import { Search } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'

// input의 기본 size(문자 수)와 이름이 겹치므로 걷어내고 우리 의미로 다시 쓴다.
type SearchBarProps = Omit<
  React.ComponentProps<'input'>,
  'className' | 'size'
> & {
  className?: string
  /** md = 페이지 안(48px) · sm = 상단 바(36px) */
  size?: 'md' | 'sm'
}

/**
 * Shared search input. Pressing Enter with a non-empty query navigates to the
 * search results page (`/search?q=...`). Used across the app.
 */
export function SearchBar({
  placeholder = '종목을 검색해 보세요',
  className,
  size = 'md',
  onKeyDown,
  ...props
}: SearchBarProps) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'bg-bg-input flex items-center rounded-full border border-white/5',
        size === 'sm' ? 'h-9 gap-2 px-4' : 'h-12 gap-3 px-[22px]',
        className,
      )}
    >
      <Search
        size={size === 'sm' ? 16 : 20}
        strokeWidth={2}
        className="shrink-0 text-white/50"
      />
      <input
        className={cn(
          'min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/50',
          size === 'sm' ? 'text-[13px]' : 'text-[14px]',
        )}
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
