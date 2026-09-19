import { useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * 상단 바의 목록 드롭다운. 관심 · 보유 중처럼 **세로로 긴 목록**은 가로 줄에
 * 못 들어가므로 접어 둔다. 가로를 전혀 안 먹는 것이 이 방식의 값이다 (Q0).
 */
export function TopBarDropdown({
  label,
  icon: Icon,
  count,
  width = 280,
  children,
}: {
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  count?: number
  /** 펼친 칸 폭(px) — 관심은 표 모양이라 넓다 */
  width?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        // 좁으면 글자를 감추므로 이름을 따로 단다
        aria-label={label}
        className={cn(
          'flex items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] whitespace-nowrap transition-colors',
          open
            ? 'bg-white/[0.08] font-bold text-white'
            : 'text-white/60 hover:text-white/90',
        )}
      >
        <Icon size={17} strokeWidth={2} />
        <span className="hidden sm:inline">{label}</span>
        {count != null && count > 0 && (
          <span className="font-number rounded-full bg-white/10 px-1.5 text-[11px] font-bold text-white/70">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          // 좁으면(sm 미만) 화면 양옆 12px 에 붙인다 — 버튼 오른쪽 끝에 매달면 왼쪽이 화면 밖으로 잘렸다
          className="fixed inset-x-3 top-[60px] z-40 max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-[#141414] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.55)] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[var(--dd-w)]"
          style={{ '--dd-w': `${width}px` } as React.CSSProperties}
        >
          {children}
        </div>
      )}
    </div>
  )
}
