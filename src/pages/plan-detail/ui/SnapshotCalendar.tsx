import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * 스냅샷 날짜 달력 (Q11 D).
 *
 * **배치가 돈 날만 누를 수 있다.** 주말 · 휴장일 · 오늘 이후, 그리고 ①-1 게이트에
 * 걸려 행이 없는 날은 흐리게 두고 못 누른다 — 행이 없으면 스냅샷이 없다.
 *
 * ⚠️ 날짜 밑에 「진입 가능」 점을 안 찍는다 (Q12). 찍으려면 한 달치 판정을 다 읽어야 하고,
 *    달력은 «고를 수 있는 날»만 가르면 된다.
 */
export function SnapshotCalendar({
  value,
  enabled,
  onPick,
}: {
  value: string | null
  /** 고를 수 있는 날 (LocalDate) — 스크리닝 행이 있는 날이다 */
  enabled: string[]
  onPick: (date: string) => void
}) {
  const ok = useMemo(() => new Set(enabled), [enabled])
  const latest = enabled.at(-1) ?? new Date().toISOString().slice(0, 10)
  const [open, setOpen] = useState(false)
  const [ym, setYm] = useState(() => monthOf(value ?? latest))
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const first = enabled[0]
  const canPrev = first != null && `${ym}-01` > first
  const canNext = `${ym}-31` < latest

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label="판정 기준일"
        aria-expanded={open}
        onClick={() => {
          setYm(monthOf(value ?? latest))
          setOpen((v) => !v)
        }}
        className={cn(
          'bg-bg-input font-number flex w-full items-center justify-between rounded-md px-2 py-1 text-[14px] ring-1',
          open ? 'ring-brand-blue/60' : 'ring-transparent',
          value ? 'text-white' : 'text-white/30',
        )}
      >
        {value ?? '날짜 고르기'}
        <span className="text-white/35">▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="판정 기준일 달력"
          className="shadow-pop absolute top-full left-0 z-40 mt-1.5 w-[260px] rounded-lg border border-white/10 bg-[#141414] p-2.5"
        >
          <div className="mb-1.5 flex items-center justify-between text-[13px] text-white/80">
            <button
              type="button"
              aria-label="이전 달"
              disabled={!canPrev}
              onClick={() => setYm(shift(ym, -1))}
              className="rounded px-2 text-white/60 hover:text-white disabled:opacity-20"
            >
              ‹
            </button>
            <span className="font-number">
              {ym.slice(0, 4)}년 {Number(ym.slice(5))}월
            </span>
            <button
              type="button"
              aria-label="다음 달"
              disabled={!canNext}
              onClick={() => setYm(shift(ym, 1))}
              className="rounded px-2 text-white/60 hover:text-white disabled:opacity-20"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[12px]">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <span key={d} className="py-0.5 text-white/30">
                {d}
              </span>
            ))}
            {cells(ym).map((d, i) =>
              d == null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  aria-label={d}
                  disabled={!ok.has(d)}
                  onClick={() => {
                    onPick(d)
                    setOpen(false)
                  }}
                  className={cn(
                    'font-number rounded-md py-1 disabled:cursor-default disabled:text-white/15',
                    d === value
                      ? 'bg-brand-blue text-bg-input'
                      : 'text-white/80 enabled:hover:bg-white/[0.10]',
                  )}
                >
                  {Number(d.slice(8))}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const monthOf = (d: string) => d.slice(0, 7)

function shift(ym: string, by: number) {
  const [y = 0, m = 1] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 7)
}

/** 그 달의 칸 — 앞은 요일만큼 비운다 */
function cells(ym: string): (string | null)[] {
  const [y = 0, m = 1] = ym.split('-').map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: days },
      (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`,
    ),
  ]
}
