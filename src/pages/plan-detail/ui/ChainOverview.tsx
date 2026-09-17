import { useEffect, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { PlanListItem } from '@/entities/plan'
import { PlanChain } from './PlanChain'
import { LIT_PANEL } from './panel'
import { cn } from '@/shared/lib/cn'

/**
 * **사슬 전체** — 좁힌 사슬 카드 오른쪽 위 「⤢」 로 연다 (2026-09-17 (C)).
 *
 * 평소 사슬은 직전 → 실행 중 → 대기 둘까지만 선다. 지난 계획 · 넘친 대기를 보려면
 * 여기서 «전부» 본다. 마디를 누르면 그 계획으로 가고 판이 닫힌다.
 *
 * 💀 「지난 계획 N ▾」 · 「대기 +N ▾」 팝오버에서 하나씩 꺼내 사슬에 붙였었다. 꺼낸 것이 사슬을
 *    늘렸고 접기가 따로 필요했다. 확대 하나가 둘 다 대신한다 — 좁힌 사슬은 늘 같은 높이다.
 */
export function ChainOverview({
  plans,
  currentId,
  onClose,
  onRemove,
}: {
  plans: PlanListItem[]
  currentId: number
  onClose?: (planId: number) => void
  onRemove?: (planId: number) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open])
  // 다른 계획으로 옮겨 가면 닫는다
  useEffect(() => setOpen(false), [currentId])

  return (
    <>
      <button
        type="button"
        aria-label="사슬 전체 보기"
        title="사슬 전체 보기"
        onClick={() => setOpen(true)}
        // 「오늘의 후보」 차트 카드의 확대 표시와 같은 아이콘
        className="p-1 text-white/50 transition-colors hover:text-white"
      >
        <Maximize2 size={14} strokeWidth={2} />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              role="dialog"
              aria-label="사슬 전체"
              // 💀 `card` 는 반투명 그라데이션이라 뒤 화면이 비쳤다 — 불투명한 밝은 카드로
              className={cn(
                LIT_PANEL,
                // 계획의 «전체 흐름»이 한눈에 — 화면 대부분을 쓴다
                'shadow-pop flex h-[86vh] w-[94vw] max-w-[1600px] flex-col px-5 py-4',
              )}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-bold text-white/85">
                  사슬 전체
                </span>
                <span className="font-number text-[11px] text-white/35">
                  {plans.length}
                </span>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setOpen(false)}
                  className="ml-auto rounded px-1.5 text-[13px] text-white/40 hover:text-white/80"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 min-h-0 flex-1 overflow-auto [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                <PlanChain
                  plans={plans}
                  currentId={currentId}
                  onClose={onClose}
                  onRemove={onRemove}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
