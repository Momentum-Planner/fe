import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  INDICATORS,
  PICK_COLORS,
  makeLayer,
  readParam,
  specOf,
  writeParam,
} from './indicators'
import type { IndicatorSpec, Layer } from './indicators'

/**
 * 보조지표 패널.
 *
 * 왼쪽이 «무엇을», 오른쪽이 «어떻게» 다 — 목록에서 지표를 고르면 그 지표의 설정만
 * 오른쪽에 나온다. 열한 종의 파라미터를 한 화면에 늘어놓으면 고르는 화면이 아니라
 * 읽는 화면이 된다 (디자인 9장 ② — 개요 → 줌·필터 → 온디맨드 세부).
 *
 * 켠 지표는 목록에 «체크»로 남는다. 껐다 켜도 설정이 유지되도록 레이어를 지우지 않고
 * 목록에서만 뺀다 — 기간 20 을 넣어 두고 잠깐 껐다 켰는데 14 로 돌아가면 안 된다.
 *
 * 이동평균선처럼 `multi` 인 지표는 «여러 벌»을 겹칠 수 있다. 20·50·150·200 을 동시에
 * 보는 것이 트렌드 템플릿을 눈으로 확인하는 방법이라서다 (①-1).
 */

/** 색은 «한 곳»에서 온다 — 지표 기본색 + 차트 공용 팔레트 (`indicators.ts`) */
const PALETTE = PICK_COLORS

export function IndicatorPanel({
  layers,
  onChange,
}: {
  layers: Layer[]
  onChange: (next: Layer[]) => void
}) {
  const [open, setOpen] = useState(false)
  // 첫 지표를 «이름으로» 고른다 — 순서가 바뀌어도 안 깨지고 undefined 도 안 낀다
  const [picked, setPicked] = useState<string>('sma')
  const boxRef = useRef<HTMLDivElement>(null)

  // 바깥을 누르면 닫는다 — 차트를 만지려는 것이지 패널을 만지려는 게 아니다
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [open])

  const spec = specOf(picked)
  const mine = layers.filter((l) => l.id === picked)

  // 켜는 «순번»을 넘긴다 — 색은 makeLayer 가 팔레트에서 집는다
  const add = (s: IndicatorSpec) =>
    onChange([...layers, makeLayer(s, undefined, layers.length)])
  const drop = (key: string) => onChange(layers.filter((l) => l.key !== key))
  const patch = (key: string, next: Partial<Layer>) =>
    onChange(layers.map((l) => (l.key === key ? { ...l, ...next } : l)))

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] transition-colors',
          open || layers.length > 0
            ? 'bg-white/[0.12] text-white/85'
            : 'bg-white/[0.04] text-white/45 hover:text-white/70',
        )}
      >
        보조지표
        {layers.length > 0 && (
          <span className="font-number text-white/45">{layers.length}</span>
        )}
        <span className="text-white/45">+</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 flex w-[560px] overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          {/* 왼쪽 — 무엇을 */}
          <div className="max-h-[420px] w-[196px] shrink-0 overflow-y-auto border-r border-white/[0.07] p-2">
            <Head>상단 지표</Head>
            {INDICATORS.filter((d) => d.pane === 'price').map((d) => (
              <Row
                key={d.id}
                spec={d}
                on={layers.some((l) => l.id === d.id)}
                active={picked === d.id}
                onPick={() => setPicked(d.id)}
                onToggle={() => {
                  const has = layers.some((l) => l.id === d.id)
                  setPicked(d.id)
                  if (has) onChange(layers.filter((l) => l.id !== d.id))
                  else add(d)
                }}
              />
            ))}
            <Head className="mt-3">하단 지표</Head>
            {INDICATORS.filter((d) => d.pane === 'own').map((d) => (
              <Row
                key={d.id}
                spec={d}
                on={layers.some((l) => l.id === d.id)}
                active={picked === d.id}
                onPick={() => setPicked(d.id)}
                onToggle={() => {
                  const has = layers.some((l) => l.id === d.id)
                  setPicked(d.id)
                  if (has) onChange(layers.filter((l) => l.id !== d.id))
                  else add(d)
                }}
              />
            ))}
          </div>

          {/* 오른쪽 — 어떻게 */}
          <div className="max-h-[420px] min-w-0 flex-1 overflow-y-auto p-4">
            {spec && (
              <>
                <div className="text-[13px] font-bold text-white">
                  {spec.label}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-white/40">
                  {spec.hint}
                </div>

                {mine.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => add(spec)}
                    className="mt-4 rounded-full bg-white/[0.08] px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.14]"
                  >
                    + 추가
                  </button>
                ) : (
                  <div className="mt-3.5 flex flex-col gap-2">
                    {mine.map((l, i) => (
                      <div
                        key={l.key}
                        className="flex flex-wrap items-center gap-2"
                      >
                        {spec.multi && (
                          <span className="w-9 shrink-0 text-[11px] text-white/35">
                            {i + 1}
                          </span>
                        )}
                        <ColorDot
                          value={l.color}
                          onChange={(color) => patch(l.key, { color })}
                        />
                        {spec.params.map((p) => (
                          <label
                            key={`${p.key}-${p.at ?? 0}`}
                            className="flex items-center gap-1.5"
                          >
                            <span className="text-[11px] text-white/35">
                              {p.label}
                            </span>
                            <input
                              type="number"
                              min={p.min}
                              max={p.max}
                              step={p.step ?? 1}
                              value={readParam(l, p)}
                              onChange={(e) => {
                                const n = Number(e.target.value)
                                if (Number.isNaN(n)) return
                                patch(l.key, { params: writeParam(l, p, n) })
                              }}
                              className="font-number bg-bg-input w-[58px] rounded-md px-2 py-1 text-[12px] text-white outline-none focus:ring-1 focus:ring-white/25"
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={() => drop(l.key)}
                          aria-label="이 선 지우기"
                          className="ml-auto rounded px-1.5 text-[13px] text-white/30 hover:text-white/70"
                        >
                          ✕
                        </button>

                        {/* 선이 여럿 — 색을 하나만 주면 어느 선이 무엇인지 모른다 (밴드형 · MACD · 스토캐스틱) */}
                        {spec.lines && (
                          <div className="mt-1 flex w-full flex-col gap-1.5 border-t border-white/[0.06] pt-2">
                            {spec.lines.map((ln) => {
                              const hidden = (l.off ?? []).includes(ln.key)
                              return (
                                <div
                                  key={ln.key}
                                  className="flex items-center gap-2"
                                >
                                  <span className="w-14 shrink-0 text-[11px] text-white/40">
                                    {ln.label}
                                  </span>
                                  <ColorDot
                                    value={l.colors?.[ln.key] ?? l.color}
                                    onChange={(c) =>
                                      patch(l.key, {
                                        colors: { ...l.colors, [ln.key]: c },
                                      })
                                    }
                                  />
                                  <Switch
                                    on={!hidden}
                                    label={`${ln.label} 표시`}
                                    onClick={() =>
                                      patch(l.key, {
                                        off: hidden
                                          ? (l.off ?? []).filter(
                                              (k) => k !== ln.key,
                                            )
                                          : [...(l.off ?? []), ln.key],
                                      })
                                    }
                                  />
                                </div>
                              )
                            })}
                            {spec.fill && (
                              <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-[11px] text-white/40">
                                  배경색
                                </span>
                                <span className="h-4 w-4" />
                                <Switch
                                  on={l.fillOn ?? false}
                                  label="배경색 표시"
                                  onClick={() =>
                                    patch(l.key, { fillOn: !l.fillOn })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {spec.multi && (
                      <button
                        type="button"
                        onClick={() => add(spec)}
                        className="mt-1 self-start rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-white/60 hover:bg-white/[0.12] hover:text-white/85"
                      >
                        + 기간 추가
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const Head = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'px-2 py-1.5 text-[11px] font-bold tracking-wide text-white/35',
      className,
    )}
  >
    {children}
  </div>
)

/**
 * 목록 한 줄. **누르는 자리가 둘이다** — 이름을 누르면 «설정을 본다», 오른쪽 동그라미를
 * 누르면 «켜고 끈다». 하나로 묶으면 기간만 고치려 해도 지표가 꺼진다.
 */
function Row({
  spec,
  on,
  active,
  onPick,
  onToggle,
}: {
  spec: IndicatorSpec
  on: boolean
  active: boolean
  onPick: () => void
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-lg pr-1.5 transition-colors',
        active ? 'bg-white/[0.09]' : 'hover:bg-white/[0.05]',
      )}
    >
      <button
        type="button"
        onClick={onPick}
        className={cn(
          'min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[12px]',
          on ? 'text-white' : 'text-white/55',
        )}
      >
        {spec.label}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${spec.label} 켜기`}
        onClick={onToggle}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] transition-colors',
          on
            ? 'border-brand-blue bg-brand-blue text-white'
            : 'border-white/20 text-transparent',
        )}
      >
        ✓
      </button>
    </div>
  )
}

/** 켬/끔 스위치 — 선을 «지우지 않고» 숨긴다. 다시 켜면 색이 그대로다 */
function Switch({
  on,
  label,
  onClick,
}: {
  on: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'relative h-4 w-7 shrink-0 rounded-full transition-colors',
        on ? 'bg-brand-blue' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
          on ? 'left-3.5' : 'left-0.5',
        )}
      />
    </button>
  )
}

/** 색 하나. 팔레트에서 고른다 — 아무 색이나 만들면 화면의 색 규약이 무너진다 */
function ColorDot({
  value,
  onChange,
}: {
  value: string
  onChange: (c: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button
        type="button"
        aria-label="색 고르기"
        onClick={() => setOpen((v) => !v)}
        className="block h-4 w-4 rounded-full border border-white/20"
        style={{ background: value }}
      />
      {open && (
        <span className="bg-bg-elevated absolute top-full left-0 z-10 mt-1 flex w-[92px] flex-wrap gap-1 rounded-lg border border-white/10 p-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              className="h-4 w-4 rounded-full border border-white/15"
              style={{ background: c }}
            />
          ))}
        </span>
      )}
    </span>
  )
}
