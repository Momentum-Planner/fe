import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'

// input의 기본 size(문자 수)와 이름이 겹치므로 걷어내고 우리 의미로 다시 쓴다.
type SearchBarProps = Omit<
  React.ComponentProps<'input'>,
  'className' | 'size' | 'value' | 'defaultValue' | 'onChange'
> & {
  className?: string
  /** md = 페이지 안(48px) · sm = 상단 바(36px) */
  size?: 'md' | 'sm'
}

/** 치는 동안 매 글자마다 주소를 바꾸지 않는다 — 멈춘 뒤 이만큼 지나서 간다 */
const TYPING_DEBOUNCE_MS = 250

/**
 * 종목 검색 칸. **치면 바로 결과 페이지(`/search?q=`)로 간다** — Enter 를 안 눌러도.
 *
 * - 다른 화면에서 처음 칠 때만 기록을 하나 쌓는다(push). 그 뒤로는 덮어쓴다(replace) —
 *   뒤로 가기 한 번이면 치기 전 화면으로 돌아간다.
 * - 결과 페이지에 있는 동안 칸의 값은 주소의 `q` 를 따른다(뒤로 가기·새로고침).
 *   결과 페이지를 떠나면 칸이 비워진다.
 * - 한글 조합 중의 Enter 는 건너뛴다 — 크롬은 조합 중 Enter 를 두 번 보낸다.
 */
export function SearchBar({
  placeholder = '종목을 검색해 보세요',
  className,
  size = 'md',
  onKeyDown,
  ...props
}: SearchBarProps) {
  const navigate = useNavigate()
  const urlQ = useRouterState({
    select: (s) =>
      s.location.pathname === '/search'
        ? String((s.location.search as { q?: unknown }).q ?? '')
        : null,
  })
  const onSearchPage = urlQ !== null

  const [value, setValue] = useState(urlQ ?? '')
  // 주소가 바깥에서 바뀌면(뒤로 가기 · 결과 페이지를 떠남) 칸을 따라 맞춘다.
  // 내가 방금 보낸 값이 돌아온 것이면 건드리지 않는다 — 그 사이 더 친 글자를 지우지 않게.
  const [seenQ, setSeenQ] = useState(urlQ)
  if (urlQ !== seenQ) {
    setSeenQ(urlQ)
    if ((urlQ ?? '') !== value.trim()) setValue(urlQ ?? '')
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const go = (raw: string) => {
    clearTimeout(timer.current)
    const q = raw.trim()
    // 다른 화면에서 빈 칸이면 갈 곳이 없다
    if (!q && !onSearchPage) return
    if (onSearchPage && q === urlQ) return
    navigate({ to: '/search', search: { q }, replace: onSearchPage })
  }

  return (
    <div
      className={cn(
        'bg-bg-input flex items-center rounded-full border border-white/5 focus-within:border-white/15',
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
        type="search"
        className={cn(
          'min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/50 [&::-webkit-search-cancel-button]:hidden',
          size === 'sm' ? 'text-[13px]' : 'text-[14px]',
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = e.currentTarget.value
          setValue(next)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => go(next), TYPING_DEBOUNCE_MS)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            go(e.currentTarget.value)
          }
          onKeyDown?.(e)
        }}
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="지우기"
          onClick={() => {
            setValue('')
            go('')
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
