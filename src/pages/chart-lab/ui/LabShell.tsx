import { Link } from '@tanstack/react-router'
import type { Perf } from '../model/perf'

export type LabIndicator = { name: string; label: string }

export const SIZES = [200, 800, 2340]

export const FRAMES = [
  { key: '5m', label: '5분' },
  { key: '1d', label: '일' },
  { key: '1w', label: '주' },
  { key: '1M', label: '월' },
]

export function LabHeader({
  title,
  other,
  perf,
  frame,
  onFrame,
  size,
  onSize,
  overlay,
  pane,
  on,
  onToggle,
  extras,
}: {
  title: string
  other: { label: string; href: string }
  perf: Perf | null
  frame: string
  onFrame: (f: string) => void
  size: number
  onSize: (n: number) => void
  overlay: LabIndicator[]
  pane: LabIndicator[]
  on: Record<string, boolean>
  onToggle: (name: string) => void
  extras: Array<{ label: string; active: boolean; onClick: () => void }>
}) {
  return (
    <>
      <header className="flex flex-wrap items-baseline gap-4">
        <h1 className="t-h2">{title}</h1>
        <Link
          to={other.href}
          className="t-body text-[var(--color-brand-blue)] underline"
        >
          {other.label} →
        </Link>
        {perf && (
          <span className="t-num text-[var(--color-fg-secondary)]">
            {perf.bars.toLocaleString()}봉 · 렌더{' '}
            <b className="text-[var(--color-fg-primary)]">
              {perf.renderMs.toFixed(1)}ms
            </b>{' '}
            · DOM 노드{' '}
            <b className="text-[var(--color-fg-primary)]">
              {perf.domNodes.toLocaleString()}
            </b>
            {perf.svgNodes > 0 && ` (SVG ${perf.svgNodes.toLocaleString()})`}
          </span>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Group label="봉 단위">
          {FRAMES.map((f) => (
            <Chip
              key={f.key}
              active={frame === f.key}
              onClick={() => onFrame(f.key)}
            >
              {f.label}
            </Chip>
          ))}
        </Group>
        <Group label="봉 개수">
          {SIZES.map((n) => (
            <Chip key={n} active={size === n} onClick={() => onSize(n)}>
              {n.toLocaleString()}
            </Chip>
          ))}
        </Group>
        <Group label="캔들 위">
          {overlay.map((i) => (
            <Chip
              key={i.name}
              active={!!on[i.name]}
              onClick={() => onToggle(i.name)}
            >
              {i.label}
            </Chip>
          ))}
        </Group>
        <Group label="별도 패널">
          {pane.map((i) => (
            <Chip
              key={i.name}
              active={!!on[i.name]}
              onClick={() => onToggle(i.name)}
            >
              {i.label}
            </Chip>
          ))}
        </Group>
        <Group label="그 밖">
          {extras.map((e) => (
            <Chip key={e.label} active={e.active} onClick={e.onClick}>
              {e.label}
            </Chip>
          ))}
        </Group>
      </div>
    </>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="t-body whitespace-nowrap text-[var(--color-fg-secondary)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius-pill)] border px-3 py-1 text-sm whitespace-nowrap transition-colors ${
        active
          ? 'border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/15 text-[var(--color-fg-primary)]'
          : 'border-[var(--color-border-subtle)] text-[var(--color-fg-secondary)] hover:border-white/25'
      }`}
    >
      {children}
    </button>
  )
}
