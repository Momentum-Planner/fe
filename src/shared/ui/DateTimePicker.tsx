import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import './date-time-picker.css'

/**
 * Reusable custom date+time popup (calendar + 시/분 selects).
 * Trigger shows "YYYY.MM.DD HH:MM"; clicking opens a month calendar + 시/분 selects.
 * Controlled via value/onChange (a Date). Closes on outside click.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')
const fmtDate = (d: Date) =>
  `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export function DateTimePicker({
  value,
  onChange,
}: {
  value: Date
  onChange: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1),
  )
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const pickDay = (day: number) => {
    const d = new Date(value)
    d.setFullYear(year, month, day)
    onChange(d)
  }
  const setHM = (h: number, m: number) => {
    const d = new Date(value)
    d.setHours(h, m, 0, 0)
    onChange(d)
  }
  const isSel = (day: number) =>
    value.getFullYear() === year &&
    value.getMonth() === month &&
    value.getDate() === day
  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day

  return (
    <span className="dtPicker" ref={ref}>
      <button
        type="button"
        className={open ? 'dtField open' : 'dtField'}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          className="dtFieldIcon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="dtDate">{fmtDate(value)}</span>
        <span className="dtTimeText">{fmtTime(value)}</span>
      </button>
      {open && (
        <div className="dtPop">
          <div className="dtPopHead">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              aria-label="이전 달"
            >
              ‹
            </button>
            <span>
              {year}년 {month + 1}월
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          <div className="dtGrid dtDow">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dtDowCell">
                {w}
              </span>
            ))}
          </div>

          <div className="dtGrid">
            {cells.map((day, i) =>
              day === null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  className={cn(
                    'dtDay',
                    isSel(day) && 'sel',
                    isToday(day) && 'today',
                  )}
                  onClick={() => pickDay(day)}
                >
                  {day}
                </button>
              ),
            )}
          </div>

          <div className="dtTime">
            <span className="dtTimeLabel">시간</span>
            <select
              value={value.getHours()}
              onChange={(e) =>
                setHM(Number(e.target.value), value.getMinutes())
              }
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span className="dtColon">:</span>
            <select
              value={value.getMinutes()}
              onChange={(e) => setHM(value.getHours(), Number(e.target.value))}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </span>
  )
}
