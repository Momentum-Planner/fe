import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  label = '지난 계획',
}: {
  hidden: PlanListItem[]
  onPull: (planId: number) => void
  /** 「대기 +N」 에도 같은 팝오버를 쓴다 — 사슬 끝의 대기가 넘칠 때 */
  label?: string
}) {
  /** 열린 자리 — 버튼 바로 아래 (화면 좌표) */
  const [at, setAt] = useState<{ left: number; top: number } | null>(null)
  const open = at != null
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (!boxRef.current?.contains(t) && !listRef.current?.contains(t))
        setAt(null)
    }
    // 자리를 화면 좌표로 잡았으니 페이지가 움직이면 닫는다
    const shut = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) setAt(null)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', shut, true)
    window.addEventListener('resize', shut)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', shut, true)
      window.removeEventListener('resize', shut)
    }
  }, [open])

  if (hidden.length === 0) return null
  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          if (open) return setAt(null)
          const r = e.currentTarget.getBoundingClientRect()
          setAt({ left: r.left, top: r.bottom + 6 })
        }}
        className={cn(
          'flex w-max items-center gap-1 rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[11px] transition-colors',
          open ? 'text-white' : 'text-white/50 hover:text-white/80',
        )}
      >
        {label}
        <span className="font-number text-white/40">
          {label === '지난 계획' ? hidden.length : `+${hidden.length}`}
        </span>
        {open ? '▴' : '▾'}
      </button>
      {/* 💀 사슬 줄이 가로 스크롤(overflow-x-auto)이라 그 안에 absolute 로 띄우면 잘렸다 —
          대기 칸 밑의 「대기 +N」 은 목록이 통째로 안 보였다. body 로 빼서 띄운다 */}
      {at &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            aria-label={label}
            style={at}
            className="shadow-pop fixed z-40 max-h-[240px] w-[300px] overflow-y-auto rounded-lg border border-white/10 bg-[#141414] p-1"
          >
            {hidden.map((p) => (
              <li key={p.planId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onPull(p.planId)
                    setAt(null)
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
          </ul>,
          document.body,
        )}
    </div>
  )
}
