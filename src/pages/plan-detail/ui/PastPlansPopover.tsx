import { useEffect, useRef, useState } from 'react'
import { PLAN_STATUS_LABEL } from '@/entities/plan'
import type { PlanListItem } from '@/entities/plan'
import { cn } from '@/shared/lib/cn'

/**
 * 「지난 계획 N」 — 좁힌 사슬에서 접힌 계획을 **하나씩 꺼낸다** (Q12 동적 디스플레이).
 *
 * 고른 계획 **하나만** 사슬에 들어온다. 전부 펼치면 좁힌 이유가 없어진다 —
 * 찾는 것은 대개 «그 계획 하나»다 (예: 「지난번 눌림 때 어떻게 세웠더라」).
 */
export function PastPlansPopover({
  hidden,
  onPull,
}: {
  hidden: PlanListItem[]
  onPull: (planId: number) => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (hidden.length === 0) return null
  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[11px] transition-colors',
          open ? 'text-white' : 'text-white/50 hover:text-white/80',
        )}
      >
        지난 계획
        <span className="font-number text-white/40">{hidden.length}</span>
        {open ? '▴' : '▾'}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="지난 계획"
          className="shadow-pop absolute top-full left-0 z-40 mt-1.5 max-h-[240px] w-[300px] overflow-y-auto rounded-lg border border-white/10 bg-[#141414] p-1"
        >
          {hidden.map((p) => (
            <li key={p.planId}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onPull(p.planId)
                  setOpen(false)
                }}
                className="flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-white/[0.08]"
              >
                <span className="font-number shrink-0 text-[10px] text-white/35">
                  {p.writtenAt.slice(5)}
                </span>
                <span className="truncate text-white/80">{p.title}</span>
                <span className="ml-auto shrink-0 text-[10px] text-white/35">
                  {PLAN_STATUS_LABEL[p.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
