import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { won } from './planParts'

/**
 * **R 을 설명하는 두 자리** (2026-09-17 · 사용자 「R 을 사용자들이 모른다」).
 *
 * ```text
 * (가) RTerm     「1R」 이 처음 나오는 ② 에 점선 밑줄 — 올리면 한두 줄 풀이
 * (다) RLadder   ④ 와 고르기 패널 머리의 ? — 누르면 사다리 그림
 *                  3R  ▇▇▇▇▇▇  1,240,000
 *                  2R  ▇▇▇▇    1,200,000
 *                  1R  ▇▇      1,160,000
 *                  진입 ─────   1,120,000
 *                  스톱 ▇▇      1,080,000   한 칸 = 1R = 40,000원
 * ```
 *
 * 💀 R 은 폼 · 카드 · 차트 · 고르기 패널에 계속 나오는데 설명할 자리가 없었다 (Q12 남은 것).
 *    처음 나오는 자리에서는 짧게 알리고, 목표를 고르는 자리에서는 «같은 폭을 위로 몇 칸» 을
 *    그림으로 보인다. 가격은 이미 R 옆에 붙어 있어 따로 안 쓴다.
 */

/** (가) 「1R」 점선 밑줄 — 스냅샷 표의 용어 힌트와 같은 모양 */
export function RTerm({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <span className="cursor-help border-b border-dotted border-white/30">
        {children}
      </span>
      <span
        role="tooltip"
        className="shadow-pop pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-[240px] rounded-lg border border-white/10 bg-[#141414] px-2.5 py-2 font-sans text-[12px] leading-[1.5] font-normal text-white/70 group-hover:block"
      >
        <b className="text-white">1R</b> = 진입가 − 스톱가격. 스톱에 걸리면 한
        주에 잃는 폭이다. 2R 은 그 폭의 두 배만큼 오른 자리다.
      </span>
    </span>
  )
}

/** (다) ? — 누르면 진입 · 스톱 · 1R~NR 이 같은 간격으로 쌓인 사다리 */
export function RLadder({
  entryPrice,
  oneR,
  goalR,
  label = 'R 이 무엇인가',
}: {
  entryPrice: number
  /** 1R — 진입가 − 스톱가격 (실행된 계획은 처음 1R). 0 이하면 그림을 못 그린다 */
  oneR: number
  /** 지금 고른 · 도착한 목표 R — 그 칸을 진하게. 없으면 3R 까지 */
  goalR?: number | null
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const top = Math.max(3, Math.ceil(goalR ?? 0))
  const steps = Array.from({ length: top }, (_, i) => top - i)
  const ok = oneR > 0 && entryPrice > 0

  return (
    <span ref={boxRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-normal transition-colors',
          open
            ? 'border-white/60 text-white'
            : 'border-white/25 text-white/45 hover:border-white/50 hover:text-white/80',
        )}
      >
        ?
      </button>
      {open && (
        <span
          role="dialog"
          aria-label={label}
          className="shadow-pop absolute top-full right-0 z-50 mt-1.5 block w-[250px] rounded-lg border border-white/10 bg-[#141414] px-3 py-2.5 text-left font-normal"
        >
          {ok ? (
            <>
              <span className="flex flex-col gap-1">
                {steps.map((r) => (
                  <Bar
                    key={r}
                    label={`${r}R`}
                    price={entryPrice + r * oneR}
                    width={(r / top) * 100}
                    className={cn(
                      'bg-brand-red',
                      r === goalR ? 'opacity-70' : 'opacity-25',
                    )}
                    strong={r === goalR}
                  />
                ))}
                <Bar
                  label="진입"
                  price={entryPrice}
                  width={100}
                  className="h-[2px] bg-white"
                />
                <Bar
                  label="스톱"
                  price={entryPrice - oneR}
                  width={(1 / top) * 100}
                  className="bg-brand-blue opacity-60"
                />
              </span>
              <span className="mt-2 block text-[12px] leading-[1.5] text-white/65">
                한 칸 ={' '}
                <b className="font-number text-white">1R = {won(oneR)}원</b>
                <br />
                진입에서 스톱까지의 폭을 위로 몇 칸 쌓았나가 목표 R 이다.
              </span>
            </>
          ) : (
            <span className="block text-[12px] leading-[1.5] text-white/65">
              1R = 진입가 − 스톱가격. 둘을 넣으면 사다리가 그려진다.
            </span>
          )}
        </span>
      )}
    </span>
  )
}

const Bar = ({
  label,
  price,
  width,
  className,
  strong,
}: {
  label: string
  price: number
  width: number
  className: string
  strong?: boolean
}) => (
  <span
    className={cn(
      'font-number grid grid-cols-[34px_1fr_74px] items-center gap-2 text-[11px] tabular-nums',
      strong ? 'text-white' : 'text-white/50',
    )}
  >
    <span>{label}</span>
    <span className="block h-1.5">
      <span
        className={cn('block h-1.5 rounded-sm', className)}
        style={{ width: `${width}%` }}
      />
    </span>
    <span className="text-right">{won(price)}</span>
  </span>
)
