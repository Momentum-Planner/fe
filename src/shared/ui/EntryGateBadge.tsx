import { cn } from '@/shared/lib/cn'
import {
  GATE_BG,
  GATE_COLOR,
  REGIME_BG,
  REGIME_COLOR,
  entryGate,
} from '@/shared/lib/snapshots'
import type { EntryState, GateGlyph, Regime } from '@/shared/lib/snapshots'

/**
 * **진입 관문 뱃지** — 레짐과 진입 상태를 한 뱃지로 (2026-09-16 결정 · 2026-09-17 뱃지로 통일).
 *
 * ```text
 * 진입 가능:조기        진입 불가:돌파실패
 * 진입 가능:돌파        진입 불가:하방이탈
 * 진입 가능:눌림        진입 불가:방향미정
 * ```
 *
 * 💀 종목 머리줄에는 레짐 뱃지(「돌파성공」)가, 스냅샷 표에는 관문 글자(「진입 가능 · 돌파」)가 따로 섰다.
 *    레짐은 없어지고 진입 상태로 통일한다 — 두 자리가 같은 뱃지를 쓴다.
 *
 * 색 — **돌파 빨강 · 조기 · 눌림 주황, 불가는 레짐 색 그대로** (2026-09-17 사용자 「따로 색깔이 있지 않았나」).
 *   돌파실패 파랑 · 하방이탈 보라 · 방향미정 흰색 — 원래 레짐 뱃지가 쓰던 약속이다.
 * 💀 처음엔 불가 셋을 흐린 흰색 하나로 묶었다(「색은 가능 / 불가 하나만」). 꺼진 버튼처럼 읽혔고,
 *    레짐마다 정해져 있던 색이 사라졌다.
 */
export function EntryGateBadge({
  entryState,
  regime,
  size = 'md',
  className,
}: {
  entryState: EntryState
  regime: Regime
  size?: 'sm' | 'md'
  className?: string
}) {
  const gate = entryGate(entryState, regime)
  const blocked =
    gate.glyph === 'fail' || gate.glyph === 'drop' || gate.glyph === 'none'
  // 돌파는 빨강, 조기 · 눌림은 주황 — 원래 레짐 뱃지의 돌파성공 · 돌파준비 짝이다 (2026-09-17)
  const orange = gate.glyph === 'EARLY' || gate.glyph === 'PULLBACK'
  const color = orange
    ? REGIME_COLOR.prep
    : gate.ok
      ? GATE_COLOR.ok
      : blocked
        ? REGIME_COLOR[gate.glyph as Regime]
        : GATE_COLOR.no
  const bg = orange
    ? REGIME_BG.prep
    : gate.ok
      ? GATE_BG.ok
      : blocked
        ? REGIME_BG[gate.glyph as Regime]
        : GATE_BG.no
  return (
    <span
      className={cn(
        // 앱 본문 글꼴(Pretendard) — 뱃지가 놓이는 자리(숫자 칸 등)의 글꼴을 물려받지 않게 박는다
        'font-text inline-flex shrink-0 items-center rounded-full font-bold whitespace-nowrap',
        size === 'md'
          ? 'gap-1.5 border-[1.5px] px-3 py-[5px] text-[13px]'
          : 'gap-1 border px-2 py-0.5 text-[12px]',
        className,
      )}
      style={{ color, borderColor: color, background: bg }}
    >
      <EntryGateIcon
        glyph={gate.glyph}
        width={size === 'md' ? 18 : 15}
        height={size === 'md' ? 14 : 12}
      />
      {/* 「진입 가능 · 불가」 도 뒤 글자와 같은 굵기 (2026-09-17 사용자) */}
      <span>
        {gate.head}:{gate.detail}
      </span>
    </span>
  )
}

const YELLOW = '#EEB82D'
const line = (y: number) => (
  <line
    x1="2"
    y1={y}
    x2="34"
    y2={y}
    stroke={YELLOW}
    strokeWidth="2"
    strokeLinecap="round"
  />
)
const trend = (d: string) => (
  <path
    d={d}
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
)
const arrow = (x: number, y: number, deg: number) => (
  <path
    d="M-6 -4 L0 0 L-6 4"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    transform={`translate(${x} ${y}) rotate(${deg})`}
  />
)

/**
 * 관문 여섯의 그림 — 노란 선은 지지 · 저항, 흰 · 빨간 선은 가격.
 *
 * ```text
 * 조기      박스 안에서 저항 쪽으로 오른다 (아직 안 뚫었다)
 * 돌파      저항을 뚫고 올라간다
 * 눌림      올라갔다 선까지 내려와 다시 오른다
 * 돌파실패   뚫었다가 선 아래로 되돌아온다
 * 하방이탈   지지를 깨고 내려간다
 * 방향미정   두 선 사이를 옆으로 흔든다
 * ```
 */
export function EntryGateIcon({
  glyph,
  width = 18,
  height = 14,
}: {
  glyph: GateGlyph
  width?: number
  height?: number
}) {
  return (
    <svg
      viewBox="0 0 36 30"
      width={width}
      height={height}
      overflow="visible"
      aria-hidden
    >
      {glyph === 'EARLY' && (
        <>
          {line(6)}
          {line(26)}
          {trend('M3 22 L10 19 L15 21 L22 14 L28 11')}
          {arrow(28, 11, -26)}
        </>
      )}
      {glyph === 'BREAKOUT' && (
        <>
          {line(16)}
          {trend('M3 24 L10 21 L15 18 L21 10 L28 3')}
          {arrow(28, 3, -45)}
        </>
      )}
      {glyph === 'PULLBACK' && (
        <>
          {line(18)}
          {trend('M3 12 L10 4 L17 16 L23 9 L29 3')}
          {arrow(29, 3, -45)}
        </>
      )}
      {glyph === 'fail' && (
        <>
          {line(12)}
          {trend('M3 22 L10 16 L16 6 L21 8 L25 18 L30 24')}
          {arrow(30, 24, 50)}
        </>
      )}
      {glyph === 'drop' && (
        <>
          {line(10)}
          {trend('M3 5 L10 8 L16 12 L22 20 L29 27')}
          {arrow(29, 27, 45)}
        </>
      )}
      {glyph === 'none' && (
        <>
          {line(6)}
          {line(26)}
          {trend('M3 16 L8 12 L13 19 L18 13 L23 19 L28 14 L33 16')}
        </>
      )}
    </svg>
  )
}
