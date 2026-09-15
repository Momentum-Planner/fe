/**
 * ⑦ 화면의 뼈대 조각 — 블록 · 패널 · 숫자.
 *
 * **블록 여섯이 위에서 아래로 서고, 표본 경계가 그대로 그 순서다** (⑦).
 * 기간을 좁힐수록 아래부터 꺼진다.
 */

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * 💀 **바탕에 뜬 소제목을 전부 걷어냈다** (2026-09-13). 블록마다 번호와 제목을
 * 카드 «밖»에 한 줄씩 세우고 있었는데, 카드 안에 같은 이름이 이미 있어서
 * 한 화면에 제목이 두 번씩 섰다. 바탕 글씨는 카드보다 뒤에 있는데 글자 크기는
 * 더 커서, **읽는 순서가 뒤에서 앞으로** 가고 있었다.
 *
 * 기간과 표본은 그 줄이 지고 있던 짐이라 **카드 머리줄로 내려보냈다** —
 * 「무엇의 최대인가」는 여전히 적혀 있어야 한다.
 */

export function Panel({
  title,
  desc,
  right,
  className,
  children,
}: {
  title?: string
  desc?: ReactNode
  right?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('card flex flex-col gap-3 px-5 py-4', className)}>
      {(title || right) && (
        <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          {title && <h3 className="t-h3 m-0 text-white/90">{title}</h3>}
          {desc && <span className="text-[11px] text-white/35">{desc}</span>}
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      {children}
    </div>
  )
}

/**
 * 표본이 모자라 «통째로» 안 나오는 자리. **왜 닫혔는지 적는다.**
 *
 * *「이걸 뭉치면 「왜 회색인가」를 다시 물어야 한다」* (8장 ①) 가 블록에도
 * 걸린다 — 빈 카드를 회색으로 띄우는 것과 「나눠서 비교하면 표본을 또 가른다」
 * 라고 적는 것은 다른 화면이다.
 */
export function Closed({ why, short }: { why: string; short: number }) {
  return (
    <p className="card m-0 px-5 py-6 text-[13px] leading-relaxed text-white/45">
      {why}
      {short > 0 && (
        <span className="font-number text-brand-yellow/85 ml-1.5">
          앞으로 {short}건.
        </span>
      )}
    </p>
  )
}

/** 표본 꼬리표. **기간을 걸었을 때 표본이 적으면 적다고 함께 적는다** (⑦) */
export const SampleNote = ({ n, short = 0 }: { n: number; short?: number }) => (
  <span className="font-number text-[11px] text-white/40">
    표본 {n}건
    {short > 0 && (
      <span className="text-brand-yellow/85"> · {short}건 더 필요</span>
    )}
  </span>
)

/** 없는 값. **0 으로 채우지 않는다** — 없는 것과 0 은 다르다 (8장 ①) */
export const Dash = () => <span className="font-number text-white/25">—</span>

/**
 * 부호를 «직접» 붙인다 — 음수에 `-`(하이픈)가 아니라 `−`(U+2212)를 쓴다.
 * 벽을 「−1R」로 적어 놓고 수익률은 「-14.5%」로 적으면 같은 화면에서
 * 빼기 기호가 두 모양이 된다.
 */
export const pct = (v: number, digits = 1) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}%`

/** 부호 없이 — 승률처럼 방향이 없는 값 */
export const pct0 = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`

export const won = (v: number, sign = true) => {
  const a = Math.abs(v)
  const s = sign ? (v < 0 ? '−' : '+') : v < 0 ? '−' : ''
  if (a >= 100_000_000) return `${s}${(a / 100_000_000).toFixed(2)}억`
  if (a >= 10_000) return `${s}${Math.round(a / 10_000).toLocaleString()}만`
  return `${s}${Math.round(a).toLocaleString()}`
}

/** `2025-06` → `25년 6월` · `2026-01` 처럼 해가 바뀌는 자리만 해를 단다 */
export const monthLabel = (m: string, withYear = false) => {
  const [y, mm] = m.split('-')
  return withYear ? `${y!.slice(2)}년 ${Number(mm)}월` : `${Number(mm)}월`
}

/**
 * 선택한 기간의 이름. 한 달이면 **한 번만** 적는다 —
 * 「26년 1월 ~ 26년 1월」은 두 번 읽히고 조사도 안 붙는다.
 */
export const rangeLabel = (p: { from: string; to: string } | null) =>
  !p
    ? '전체 기간'
    : p.from === p.to
      ? monthLabel(p.from, true)
      : `${monthLabel(p.from, true)} ~ ${monthLabel(p.to, true)}`

/** 수익은 적색 · 손실은 청색 — **한국식 양봉/음봉 관행이 화면 전체의 규약이다** */
export const toneOf = (v: number) =>
  v > 0 ? 'text-candle-up' : v < 0 ? 'text-candle-down' : 'text-white/45'
