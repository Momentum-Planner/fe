import { useEffect } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * 오른쪽 칸 · 서랍의 껍데기 (Q23 · 4장 ⑥ ⑦).
 *
 * - `dock` — 넓으면(xl) 페이지 그리드의 오른쪽 칸, 좁으면 서랍. 거래 계획 페이지가 쓴다
 * - 아니면 — 어느 폭이든 서랍
 *
 * 바깥(어두운 뒤)을 누르거나 Esc 로 닫는다.
 * - `open={false}` + `dock` — 좁으면 안 보이고, 넓으면(xl) 칸이 늘 서 있다 (Q23 · 줄 배치 C)
 */
export function FillSheet({
  dock,
  open = true,
  onClose,
  children,
}: {
  dock?: boolean
  /** 좁은 화면에서 서랍이 열려 있나. 넓은 화면의 dock 칸은 이 값과 상관없이 선다 */
  open?: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, open])

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className={cn('fixed inset-0 z-40 bg-black/55', dock && 'xl:hidden')}
        />
      )}
      <aside
        className={cn(
          'bg-bg-page-top fixed inset-y-0 right-0 z-50 w-[min(440px,92vw)] overflow-y-auto p-3',
          !open && 'hidden xl:block',
          dock &&
            'xl:sticky xl:top-[72px] xl:right-auto xl:bottom-auto xl:z-auto xl:w-auto xl:overflow-visible xl:bg-transparent xl:p-0',
        )}
      >
        {children}
      </aside>
    </>
  )
}
