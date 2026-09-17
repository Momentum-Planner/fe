/**
 * 월별 손익 워터폴 — **모델은 24장 ①.** 그리고 이 블록이 **기간 선택기를
 * 겸한다.**
 *
 * ```text
 * Y축    손익«금액» 누적 (= 자본 곡선)
 * 막대    월별 수익 · 손실 — 나란히, 위쪽 모서리를 공유한다
 * 레이블   달마다 «순증»을 적는다 — 뜬 사각형은 축만으로 못 읽는다
 * 선      누적
 * 색      한국식 양봉/음봉 관행 — 수익 적색, 손실 청색
 * ```
 *
 * 💀 **각 막대는 이전 막대가 끝난 지점에서 시작한다** (24장 ①). 시작점이
 * 제각각인 것은 결함이 아니라 설계다 — **시작점 자체가 그때까지의 누적**이기
 * 때문이다. 1장 ⑥ 이 워터폴을 *「공통적인 기준선이 없는 막대 차트」* 로
 * 소개했고, 공통 기준선이 아홉 번 등장하는 동안 **여기서 처음으로 「없어도
 * 된다」는 쪽**이다.
 *
 * 💀 **값을 적고, 나머지는 다 걷어냈다** (2026-09-13). 워터폴을 실제로 어떻게
 * 그리는지 다시 찾아본 결과 남긴 것은 **하나**다 —
 *
 * ```text
 * 값 레이블   막대마다 값을 적는다.  «이것만 남겼다»
 *             「기준선을 공유하지 않는 뜬 사각형들은 높이를 견주기 어렵다」
 *             (Datawrapper) — 축만으로는 읽을 수 없는 것이 워터폴이다
 * ```
 *
 * 걷어낸 것들 — **선과 면이 같은 말을 두 번 하고 있었다.**
 *
 * ```text
 * 연결선     「이미 한 방향으로 가는 차트라면 선을 감추는 쪽이 깔끔하다」
 *            (Datawrapper). 여기는 «누적선»이 이미 그 흐름을 긋고 있다
 * 누적 아래 면  선이 이미 있는데 면까지 깔면 «오른쪽 끝에서 음영이 뚝 끊긴다»
 * 합계        마지막 누적점이 곧 총계다. 기둥도 레이블도 같은 수를 또 적는다
 *            — 총계는 «거래 기록»의 「실현 손익」이 든다
 * 연도 칸막이   세로 선 하나가 차트를 «두 장»으로 갈라 놓는다.
 *            해는 월 레이블(「26년 1월」)이 이미 말한다
 * ```
 *
 * 💀 **금액이라야 누적이 쌓인다.** 수익률은 3% + 5% ≠ 8% 라 막대 끝이 누적을
 * 뜻하지 못한다.
 *
 * 💀 **24장 ⑤ 의 갈림에서 구독형이다.** 누적이 커지길 바라므로 월별 막대를
 * 진하게 둔다. 공항형(누적이 0이길)은 ⑦ 에서 요약의 「벽 왼쪽」 하나뿐이다.
 *
 * ⚠️ 24장의 범례는 선을 「순증」이라 적지만 **그리는 값은 월말 누적**이다
 *    (305 · 488 · 721 …). 막대 끝이 곧 누적이므로 선도 그 점을 잇는다 —
 *    화면의 이름은 그리는 값을 따라 「누적」으로 적는다.
 *
 * **분할 매도는 같은 달에 수익 막대와 손실 막대를 둘 다 세운다.** 묶어서 순증
 * 하나로 만들지 않는다 — 24장이 확보와 손실을 따로 그린 것과 같은 이유.
 */

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MonthFlow, Period } from '../model/aggregate'
import { Panel, monthLabel, rangeLabel, won } from './parts'

const VW = 960
const VH = 330
const PAD = { l: 64, r: 18, t: 30, b: 34 }

export function Waterfall({
  flow,
  period,
  onPeriod,
  sells,
  children,
  bare,
}: {
  flow: MonthFlow[]
  period: Period | null
  onPeriod: (p: Period | null) => void
  /** 전체 매도 건수 — **세는 단위가 무엇인지**를 화면이 한 번은 말해야 한다 */
  sells: number
  /**
   * 차트 «아래»에 같은 카드 안으로 들어오는 층 — 최대 수익 · 최대 손실.
   * **한 박스여야 한다** — 차트가 「언제」를 말하고 바로 아래에서 「그중 가장
   * 큰 둘」을 말하는 것이라, 카드가 갈리면 둘이 다른 이야기처럼 읽힌다.
   */
  children?: ReactNode
  /**
   * 카드 없이 차트만 (Q15 ①③). 요약 판의 네 칸 중 세 칸을 차지하고, 제목과
   * 기간 고르기는 판의 머리줄이 든다.
   */
  bare?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  /**
   * 끌기 시작한 칸. **상태가 아니라 `ref` 다** — 놓는 순간에 읽는 값이라
   * 렌더를 기다리면 안 된다.
   */
  const startRef = useRef<number | null>(null)
  const [drag, setDrag] = useState<[number, number] | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  if (flow.length === 0) return null

  const band = (VW - PAD.l - PAD.r) / flow.length
  /**
   * **확보와 손실은 나란히 선다** — 한 막대를 색으로 나누는 것이 아니라
   * 계열 «둘»이 위쪽 모서리를 공유하며 붙는다 (그림 24.3·24.4).
   */
  const bw = Math.min(20, band * 0.34)

  const lo = Math.min(0, ...flow.map((f) => Math.min(f.base, f.cum)))
  const hi = Math.max(0, ...flow.map((f) => f.base + f.gain))
  const span = hi - lo || 1
  const y = (v: number) => PAD.t + ((hi - v) / span) * (VH - PAD.t - PAD.b)
  const cx = (i: number) => PAD.l + band * (i + 0.5)

  const sel = drag
    ? ([Math.min(...drag), Math.max(...drag)] as const)
    : period
      ? ([
          flow.findIndex((f) => f.month === period.from),
          flow.findIndex((f) => f.month === period.to),
        ] as const)
      : null
  const inSel = (i: number) => !sel || (i >= sel[0] && i <= sel[1])

  const indexAt = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const x = ((clientX - rect.left) * VW) / rect.width
    return Math.max(
      0,
      Math.min(flow.length - 1, Math.floor((x - PAD.l) / band)),
    )
  }

  const commit = (a: number, b: number) => {
    const [i, j] = a <= b ? [a, b] : [b, a]
    onPeriod({ from: flow[i]!.month, to: flow[j]!.month })
  }

  const ticks = axisTicks(lo, hi)

  const months = flow.map((f) => f.month)
  /** 고르는 칸이 «지금 보이는 것»을 그대로 든다 — 선택이 없으면 양 끝이다 */
  const from = period?.from ?? months[0]!
  const to = period?.to ?? months[months.length - 1]!

  const linePts = flow.map((f, i) => `${cx(i)},${y(f.cum)}`).join(' ')

  const chart = (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="월별 손익 워터폴"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const i = indexAt(e.clientX)
          startRef.current = i
          setDrag([i, i])
        }}
        onPointerMove={(e) => {
          const i = indexAt(e.clientX)
          setHover(i)
          if (startRef.current !== null) setDrag([startRef.current, i])
        }}
        onPointerUp={(e) => {
          if (startRef.current !== null)
            commit(startRef.current, indexAt(e.clientX))
          startRef.current = null
          setDrag(null)
        }}
        onPointerCancel={() => {
          startRef.current = null
          setDrag(null)
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* 고른 구간을 «띠»로 — 나머지를 흐리게 하는 것과 «같이» 쓴다 */}
        {sel && (
          <rect
            x={PAD.l + band * sel[0]}
            y={PAD.t - 10}
            width={band * (sel[1] - sel[0] + 1)}
            height={VH - PAD.t - PAD.b + 14}
            rx={6}
            className="fill-white/4"
          />
        )}
        {hover !== null && (
          <rect
            x={PAD.l + band * hover}
            y={PAD.t - 10}
            width={band}
            height={VH - PAD.t - PAD.b + 14}
            className="fill-white/4"
          />
        )}

        {/* 눈금 — 0 선만 진하다. 누적이 0 아래로 내려간 적이 있나를 먼저 본다 */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l - 6}
              x2={VW - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke="currentColor"
              strokeDasharray={t === 0 ? undefined : '2 5'}
              className={t === 0 ? 'text-white/25' : 'text-white/7'}
            />
            <text
              x={PAD.l - 12}
              y={y(t) + 3.5}
              textAnchor="end"
              className="font-number fill-white/35 text-[10px]"
            >
              {won(t, false)}
            </text>
          </g>
        ))}

        {flow.map((f, i) => {
          const gTop = y(f.base + f.gain)
          const gBot = y(f.base)
          const lBot = y(f.cum)
          return (
            <g key={f.month} opacity={inSel(i) ? 1 : 0.3}>
              {/* 확보 — 왼쪽. 이전 달이 끝난 자리(base)에서 «위»로 */}
              {f.gain > 0 && (
                <path
                  d={bar(cx(i) - bw, gTop, gBot, bw, 'top')}
                  className="fill-candle-up"
                />
              )}
              {/* 손실 — 오른쪽. 확보가 닿은 꼭대기에서 «아래»로, 끝이 곧 누적 */}
              {f.loss < 0 && (
                <path
                  d={bar(cx(i), gTop, lBot, bw, 'bottom')}
                  className="fill-candle-down"
                />
              )}
              {f.n === 0 && (
                // 거래가 없던 달. **지우지 않는다** — 빈 것이 정보다 (20장 ④)
                <line
                  x1={cx(i) - bw}
                  x2={cx(i) + bw}
                  y1={y(f.cum)}
                  y2={y(f.cum)}
                  stroke="currentColor"
                  className="text-white/20"
                />
              )}
              {/**
               * 그 달의 «순증». **이것이 워터폴에서 가장 중요한 한 줄이다** —
               * *「기준선을 공유하지 않는 뜬 사각형들은 높이를 견주기 어렵다」*
               * (Datawrapper). 막대가 어디서 시작하는지가 정보인 차트라,
               * 높이를 눈으로 재게 두면 안 된다.
               */}
              {f.n > 0 && (
                <text
                  x={cx(i)}
                  y={gTop - 7}
                  textAnchor="middle"
                  className={`font-number text-[10px] ${
                    f.net > 0
                      ? 'fill-candle-up'
                      : f.net < 0
                        ? 'fill-candle-down'
                        : 'fill-white/45'
                  }`}
                >
                  {won(f.net)}
                </text>
              )}
            </g>
          )
        })}

        {/* 누적 — 막대 끝을 잇는다 */}
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-white/85"
          points={linePts}
        />
        {flow.map((f, i) => (
          <circle
            key={f.month}
            cx={cx(i)}
            cy={y(f.cum)}
            r={inSel(i) ? 3 : 2}
            className="fill-white stroke-black/60"
            strokeWidth={1.5}
            opacity={inSel(i) ? 1 : 0.35}
          />
        ))}

        {flow.map((f, i) => {
          const newYear = i > 0 && f.month.endsWith('-01')
          return (
            <g key={f.month}>
              <text
                x={cx(i)}
                y={VH - 12}
                textAnchor="middle"
                className={`font-number text-[10px] ${
                  inSel(i) ? 'fill-white/55' : 'fill-white/20'
                }`}
              >
                {monthLabel(f.month, i === 0 || newYear)}
              </text>
            </g>
          )
        })}

        {hover !== null && <Tip f={flow[hover]!} x={cx(hover)} y={y} />}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-3">
        <Legend />
        <span className="ml-auto text-[11px] text-white/30">
          {period
            ? `${rangeLabel(period)}로 요약이 다시 계산됩니다`
            : '전체 기간을 보고 있습니다'}
        </span>
      </div>
    </>
  )

  if (bare) return <div className="flex flex-col gap-2">{chart}</div>

  return (
    <Panel
      title="월별 손익과 누적"
      desc={`매도 ${sells}건 — 분할 매도를 묶지 않습니다 · 막대를 누르면 그 달, 가로로 끌면 그 기간`}
      right={
        /**
         * **끄는 것 말고 «적는» 길도 연다.** 막대를 누르는 것은 「이 달」이
         * 손에 잡힐 때 빠르지만, 「작년 4분기」처럼 **먼저 아는 기간**은
         * 끌어서 맞추기 어렵다. 같은 값을 두 손잡이가 쥔다.
         */
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/35">기간</span>
          <MonthPick
            value={from}
            months={months}
            onPick={(m) => onPeriod({ from: m, to: m > to ? m : to })}
          />
          <span className="text-[11px] text-white/25">~</span>
          <MonthPick
            value={to}
            months={months}
            onPick={(m) => onPeriod({ from: m < from ? m : from, to: m })}
          />
          <button
            type="button"
            onClick={() => onPeriod(null)}
            disabled={!period}
            className="rounded-pill border border-white/12 px-3 py-1 text-[11px] text-white/60 transition enabled:hover:bg-white/8 disabled:opacity-25"
          >
            전체 기간
          </button>
        </div>
      }
    >
      {chart}
      {children && (
        <div className="border-t border-white/8 pt-4">{children}</div>
      )}
    </Panel>
  )
}

/**
 * 기간 고르기 — 판의 머리줄에 선다 (Q15). 차트를 누르거나 끄는 것과 **같은 값**을 쥔다.
 */
export function PeriodPick({
  flow,
  period,
  onPeriod,
}: {
  flow: MonthFlow[]
  period: Period | null
  onPeriod: (p: Period | null) => void
}) {
  if (flow.length === 0) return null
  const months = flow.map((f) => f.month)
  const from = period?.from ?? months[0]!
  const to = period?.to ?? months[months.length - 1]!
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-white/35">기간</span>
      <MonthPick
        value={from}
        months={months}
        onPick={(m) => onPeriod({ from: m, to: m > to ? m : to })}
      />
      <span className="text-[11px] text-white/25">~</span>
      <MonthPick
        value={to}
        months={months}
        onPick={(m) => onPeriod({ from: m < from ? m : from, to: m })}
      />
      <button
        type="button"
        onClick={() => onPeriod(null)}
        disabled={!period}
        className="rounded-pill border border-white/12 px-3 py-1 text-[11px] text-white/60 transition enabled:hover:bg-white/8 disabled:opacity-25"
      >
        전체 기간
      </button>
    </div>
  )
}

/**
 * 막대 하나. **바깥쪽 끝만 둥글다** — 확보는 위가, 손실은 아래가 바깥이다.
 * 둘이 맞닿는 면이 둥글면 「위쪽 모서리를 공유한다」가 안 읽힌다.
 */
function bar(
  x: number,
  top: number,
  bottom: number,
  w: number,
  round: 'top' | 'bottom',
) {
  const h = Math.max(1, bottom - top)
  const r = Math.min(3, w / 2, h / 2)
  return round === 'top'
    ? `M${x},${top + h} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${top + h} Z`
    : `M${x},${top} L${x + w},${top} L${x + w},${top + h - r} Q${x + w},${top + h} ${x + w - r},${top + h} L${x + r},${top + h} Q${x},${top + h} ${x},${top + h - r} Z`
}

/** 그 달의 셋을 «따로» 적는다. 순증 하나로 묶지 않는다 */
function Tip({
  f,
  x,
  y,
}: {
  f: MonthFlow
  x: number
  y: (v: number) => number
}) {
  const w = 136
  const h = 66
  const left = x > VW - w - 30 ? x - w - 12 : x + 12
  const top = Math.max(PAD.t, Math.min(y(f.cum) - h / 2, VH - PAD.b - h))
  return (
    <g transform={`translate(${left} ${top})`} pointerEvents="none">
      <rect
        width={w}
        height={h}
        rx={8}
        className="fill-black/90 stroke-white/15"
      />
      <text x={11} y={18} className="font-number fill-white/70 text-[10px]">
        {monthLabel(f.month, true)} · {f.n}건
      </text>
      <text x={11} y={34} className="font-number fill-candle-up text-[10px]">
        수익 {won(f.gain)}
      </text>
      <text x={11} y={47} className="font-number fill-candle-down text-[10px]">
        손실 {won(f.loss)}
      </text>
      <text x={11} y={60} className="font-number fill-white/85 text-[10px]">
        누적 {won(f.cum)}
      </text>
    </g>
  )
}

/**
 * 달 하나를 고른다. **있는 달만 늘어놓는다** — 자유 입력이면 거래가 하나도
 * 없는 기간이 들어와 「표본 0건」 화면이 서고, 그것은 고른 사람의 잘못처럼
 * 읽힌다.
 */
function MonthPick({
  value,
  months,
  onPick,
}: {
  value: string
  months: string[]
  onPick: (m: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onPick(e.target.value)}
      className="font-number rounded-sm border border-white/12 bg-white/6 px-2 py-1 text-[11px] text-white/75 outline-none focus:border-white/30"
    >
      {months.map((m) => (
        <option key={m} value={m} className="bg-bg-surface">
          {monthLabel(m, true)}
        </option>
      ))}
    </select>
  )
}

const Legend = () => (
  <div className="flex items-center gap-3 text-[11px] text-white/40">
    <span className="flex items-center gap-1.5">
      <i className="bg-candle-up inline-block h-2.5 w-2 rounded-[2px]" />
      수익
    </span>
    <span className="flex items-center gap-1.5">
      <i className="bg-candle-down inline-block h-2.5 w-2 rounded-[2px]" />
      손실
    </span>
    <span className="flex items-center gap-1.5">
      <i className="inline-block h-0.5 w-4 rounded-full bg-white/85" />
      누적
    </span>
  </div>
)

/** 0 을 «반드시» 지나는 눈금 다섯 */
function axisTicks(lo: number, hi: number): number[] {
  const span = hi - lo || 1
  const raw = span / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-6; v += step)
    out.push(Math.round(v))
  if (!out.includes(0) && lo <= 0 && hi >= 0) out.push(0)
  return out
}
