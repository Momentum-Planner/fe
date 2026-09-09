/**
 * 오늘의 후보 — 차트 밑 카드 셋. **랭킹 화면에서 카드는 순위다** (Q6).
 *
 * 카드 셋이 순위를 정하는 세 축(EPS·매출·마진)을 그대로 펼친 것이다.
 * 트렌드 템플릿과 RS 는 ①-1 **게이트**라 목록 안에서 아무것도 가르지 않으므로
 * 여기 없다 — 목록에 있다는 사실 자체가 통과의 증거이고, 조건별 풀이는 종목 상세 몫이다.
 *
 * ⚠️ **점수(0~7)를 화면에 안 쓴다.** 최종미지 ①-2 가 랭킹 목록에 요구한 것은
 *    「한 줄에 세 축의 **원값**」이다. 점수는 정렬에만 쓰고 사람에게는 원값을 보인다.
 *
 * ⚠️ **값이 전부 목이다.** 백엔드에 분기별 매출·마진 계열이 있는지 확인되지 않았다.
 *
 * ⚠️ 카드 껍데기가 종목 상세의 `sdCard--metric`(`stock-detail.css`)과 **같은 규격인데
 *    구현이 둘이다.** 두 페이지가 같은 것을 다르게 그리게 되는 자리라 언젠가 합쳐야 한다.
 */

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * 그림이 그려질 실제 폭(px)을 잰다.
 *
 * viewBox 를 고정하면 카드가 좁아질 때 **글자까지 같이 줄어든다** —
 * 랩에서는 svg 330px(배율 1.09)이었는데 `/trends` 1280 에서는 193px(0.64)이라
 * 분기 라벨이 6.4px 로 찍혔다. viewBox 폭을 잰 값으로 두면 배율이 항상 1이고,
 * 좁아질 때 줄어드는 것은 **글자가 아니라 점 사이 간격**이다.
 */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // 첫 값은 동기로 읽는다 — ResizeObserver 콜백만 기다리면 첫 프레임에 그림이 없다
    setW(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

const RED = '#FF3636'
const BLUE = '#34ADE4'
const DIM = 'rgba(255,255,255,.45)'
const GRID = 'rgba(255,255,255,.06)'
const Q = ['25 Q1', '25 Q2', '25 Q3', '25 Q4', '26 Q1']

/* ───────────── 카드 틀 — 종목 상세 sdCard--metric 과 같은 규격 ───────────── */

function MetricCard({
  title,
  sub,
  unit,
  desc,
  rankLabel,
  rank,
  chart,
}: {
  title: string
  /** 제목 밑 — 이것이 «무엇인가» */
  sub: string
  /** 차트 상단 가운데 — 이 숫자들이 «무엇에 견준 값인가» */
  unit: string
  desc: string
  rankLabel: string
  rank: string
  chart: (w: number) => React.ReactNode
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  // 좁으면 그림이 세 분기로 줄고, 푸터 설명도 뺀다 — 남는 자리를 숫자에 준다
  const narrow = w > 0 && !fitsAll(w, Q.length)
  return (
    <article className="flex h-[260px] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[16px] bg-black/80 px-5 py-[18px] transition-transform hover:scale-[1.02]">
      <div>
        <div className="text-[length:var(--ic-title)] font-bold text-white">
          {title}
        </div>
        <div className="mt-1 text-[length:var(--ic-sub)] leading-[1.4] text-white/60 before:content-['·_']">
          {sub}
        </div>
      </div>

      {/* 큰 숫자를 뺐다 — 그래프가 본문을 통째로 쓴다. 값은 각 분기 위에 붙는다 */}
      {/* 단위 + 값 + 분기 이름이 **한 덩어리**다. 덩어리 «안»은 붙이고
          위아래로만 여백을 준다 — 사이를 벌리면 단위가 차트에서 떨어져 나간다.
          단위는 「무엇에 견준 값인가」(기준선), 제목 밑 부제는 「무엇인가」(정의)를 진다

          덩어리를 «둘러싼다» — 여백만으로는 제목·푸터와 같은 평면에 있어서
          어디까지가 그림인지 안 보였다. 둘러싸기는 책 12속성 중 하나이고,
          여기서는 값을 인코딩하지 않고 «묶기»만 한다 (그래서 색과 안 부딪힌다) */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {/* 배경은 «내용 높이»에만 깐다 — flex-1 에 직접 깔면 위아래 여백까지
            칠해져서 제목·푸터와 딱 붙어 보인다 */}
        <div className="min-w-0 rounded-[10px] bg-white/[0.04] py-2">
          <div className="text-center text-[length:var(--ic-foot)] text-white/40">
            {unit}
          </div>
          <div ref={ref} className="min-w-0">
            {w > 0 && chart(w)}
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-1.5 text-[length:var(--ic-foot)]">
        <span className="min-w-0 flex-1 truncate text-white/60">
          {narrow ? '' : desc}
        </span>
        <span className="whitespace-nowrap text-white/50">
          {rankLabel}
          <b className="font-number ml-[5px] text-[length:var(--ic-foot-strong)] font-bold text-white">
            {rank}
          </b>
        </span>
      </div>
    </article>
  )
}

const WIN = 3

/**
 * 관측 창(3분기) 동안 **얼마나 올랐나.** 창의 시작과 끝 차이다.
 *
 * 카드가 층 둘을 함께 그린다 —
 *   도형 위 숫자   −8% · +28% · +42%     전년 동기 대비 «증가율»      1차
 *   이 값          3분기 +50%p           그 증가율이 오른 «폭»        2차
 * 금액부터 세면 2차 미분이고, 책이 「1차 미분을 본다」고 한 것은 증가율을
 * 기준선으로 놓고 센 것이다. 크록스도 `333% → 244% → 205% → 144%` 라는
 * **증가율의 방향**이었지 증가율의 크기가 아니었다.
 *
 * 그래서 **부제는 도형(1차)을, 푸터 라벨은 이 값(2차)을** 가리킨다 —
 * 제목·부제·푸터가 각자 자기가 무엇인지 말한다.
 *
 * 「연속 상승」만으로는 부족하다 — 3분기 연속 올랐어도 1%p 오른 것과 50%p 오른 것이
 * 같은 말이 되어버린다. 값이 이미 %(증가율 또는 비율)이므로 그 차이는 **%p** 다.
 */
function windowDelta(all: number[]) {
  const t = all.slice(-WIN)
  return t[t.length - 1] - t[0]
}

const fmtDelta = (d: number) =>
  `${d > 0 ? '+' : ''}${Math.round(d * 10) / 10}%p`

/* ───────────── 그림은 값의 종류를 따른다 ─────────────
 *
 *   EPS    점 그래프   수준(높이)과 방향(기울기)을 본다 — 가속인지가 점의 꺾임으로 읽힌다
 *   매출    막대       「얼마나 많이 팔았나」.  양이라 막대가 맞다
 *   마진    면적       「판 돈에서 몇 %가 남나」.  수준이라 채워진 넓이가 맞다
 *
 * 셋을 같은 그림으로 그리면 카드가 구분이 안 된다 — 핸드북 5부 증상 B 와 같은 결이다.
 */

/**
 * 축을 0에서 시작할지가 **규약화 방식**으로 갈린다 (2장 ③).
 *
 *   길이 · 영역으로 규약화     축이 **항상 0에서**.  0을 자르면 길이 자체가 거짓이 된다
 *   위치로 규약화              축이 0에서 멀어져도 된다.  값에 맞춰 좁혀야 작은 차이가 벌어진다
 *
 * 이 구분이 없으면 전부 양수일 때 **가장 작은 값의 막대 높이가 0** 이 된다 —
 * 매출 [4,7,9,13,18] 에서 4% 막대가 사라지고 18% 와의 비가 4.5배가 아니게 된다.
 *
 * 값이 얼마든 [min,max] 를 [BOT,TOP] 안으로 밀어 넣으므로 **표식이 카드를 넘치지 않는다.**
 * 대신 극단값이 섞이면 나머지가 뭉갠다 — 그때는 표로 가는 것이 26장 ③의 답이다.
 */
/**
 * 좌우 여백. **대칭이어야 한다** — 한쪽만 넓히면 도형 무리가 그쪽으로 밀려
 * 카드 안에서 가운데 정렬이 깨진다.
 *
 * 값은 마지막 라벨(`+18% YoY`, 12px 로 약 60px)의 **절반**이다.
 * 가운데 정렬한 라벨이 양 끝에서 안 잘리는 최소치다.
 */
const PAD = 32

/**
 * 분기 하나가 필요로 하는 가로 폭(px). 「25 Q1」이 11px 로 약 33px 이고,
 * 값 라벨(12px)이 그보다 넓을 수 있어 여유를 둔다.
 */
const MIN_STEP = 48

/**
 * **좁으면 다섯 분기를 셋으로 줄인다.**
 *
 * 글자를 줄이는 대신 **보여줄 개수를 줄인다** — 핸드북 5부가 화면마다
 * 「위에서 몇 개까지 자를지만 정한다」고 한 것과 같은 수다.
 * 남기는 셋이 **관측 창 3분기 그 자체**라, 아래 칸의 「3분기 +50%p」와 정확히 맞는다.
 */
const fitsAll = (w: number, n: number) => (w - PAD * 2) / (n - 1) >= MIN_STEP

/** 좁을 때 남길 개수 — 관측 창과 같은 3분기 */
const NARROW = 3

function crop<T>(arr: T[], w: number) {
  return fitsAll(w, arr.length) ? arr : arr.slice(-NARROW)
}

const scale = (points: number[], zeroBased: boolean, w: number) => {
  const vals = zeroBased ? [...points, 0] : points
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const span = max - min || 1
  const TOP = 30
  const BOT = 76
  const y = (v: number) => BOT - ((v - min) / span) * (BOT - TOP)
  const inner = Math.max(w - PAD * 2, 40)
  return {
    x: (i: number) => PAD + (i * inner) / (points.length - 1),
    y,
    zero: y(0),
    hasNeg: points.some((v) => v < 0),
  }
}

/** 값의 «부호»가 색을 정한다. 방향은 모양이 이미 보여주므로 색이 또 맡지 않는다. */
const signColor = (v: number) => (v < 0 ? BLUE : RED)

/**
 * 「이번 분기인가」는 **채도** 하나로 통일한다.
 *
 * 색상(hue)은 부호가 이미 지고 있고, 채도는 12속성 목록에서 색상과 **별개**다(1장 ②).
 * 통일 전에는 점=폰트 굵기, 막대=투명도, 면적=점 크기로 셋이 제각각이었다.
 */
const FADE = 0.32

const gridLines = [16, 44, 72]

function Grid({ w }: { w: number }) {
  return (
    <>
      {gridLines.map((gy) => (
        <line
          key={gy}
          x1="4"
          y1={gy}
          x2={w - 4}
          y2={gy}
          stroke={GRID}
          strokeDasharray="2 4"
        />
      ))}
    </>
  )
}

/**
 * 관측 창(3분기)을 **둘러싸기**로 표시한다.
 *
 * 아래 칸의 「3분기 동안 +26%p」가 어느 3개를 말하는지 화면에 없었다.
 * 12가지 전주의적 속성(1장 ②) 중 둘러싸기가 비어 있어 그것을 쓴다 —
 * 색상은 부호가, 위치·길이·영역은 값이, 형태는 지표 종류가 이미 지고 있다.
 * 글자는 안 붙인다. 아래 칸이 이미 「3분기 동안」이라고 말한다.
 */
function Window({
  x,
  from,
  to,
}: {
  x: (i: number) => number
  from: number
  to: number
}) {
  const pad = 18
  return (
    <rect
      x={x(from) - pad}
      y="1"
      width={x(to) - x(from) + pad * 2}
      height="87"
      rx="8"
      fill="rgba(255,255,255,.035)"
      stroke="rgba(255,255,255,.12)"
      strokeWidth="1"
    />
  )
}

function ZeroLine({ y, show, w }: { y: number; show: boolean; w: number }) {
  if (!show) return null
  return (
    <line
      x1="4"
      y1={y}
      x2={w - 4}
      y2={y}
      stroke="rgba(255,255,255,.28)"
      strokeWidth="1"
    />
  )
}

function QuarterLabels({
  x,
  labels,
}: {
  x: (i: number) => number
  labels: string[]
}) {
  return (
    <g
      fontFamily="DM Sans, sans-serif"
      fontSize="11"
      fill={DIM}
      textAnchor="middle"
    >
      {labels.map((l, i) => (
        <text key={l} x={x(i)} y="99">
          {l}
        </text>
      ))}
    </g>
  )
}

function ValueLabel({
  x,
  y,
  v,
  last,
  c,
  plus,
  suffix,
}: {
  x: number
  y: number
  v: number
  last: boolean
  c: string
  plus: boolean

  /** 마지막 값에만 붙는 단위. 「+42%」가 42%인지 42% 올랐다는 건지를 여기서 가른다 */
  suffix?: string
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="DM Sans, sans-serif"
      fontSize="12"
      fontWeight={last ? 700 : 400}
      fill={last ? c : 'rgba(255,255,255,.6)'}
    >
      {plus && v > 0 ? '+' : ''}
      {v}%{last && suffix ? ` ${suffix}` : ''}
    </text>
  )
}

/** EPS — 점. 값의 높이와 점끼리의 기울기가 수준·방향 그 자체다. */
function DotChart({ points: all, w }: { points: number[]; w: number }) {
  const points = crop(all, w)
  const labels = crop(Q, w)
  const cropped = points.length < all.length
  // 점 = 위치 규약화 → 축을 값에 맞춰 좁힌다 (2장 ③)
  const { x, y, zero, hasNeg } = scale(points, false, w)
  return (
    <svg
      viewBox={`0 0 ${w} 104`}
      preserveAspectRatio="xMidYMid meet"
      height="104"
      className="w-full"
    >
      <Grid w={w} />
      {!cropped && (
        <Window x={x} from={points.length - 3} to={points.length - 1} />
      )}
      <ZeroLine y={zero} show={hasNeg} w={w} />
      {points.map((v, i) => {
        const c = signColor(v)
        const last = i === points.length - 1
        return (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(v)}
              r="10"
              fill={c}
              opacity={last ? 0.22 : 0.22 * FADE}
            />
            <circle
              cx={x(i)}
              cy={y(v)}
              r="5.5"
              fill={c}
              opacity={last ? 1 : FADE}
            />
            <ValueLabel x={x(i)} y={y(v) - 15} v={v} last={last} c={c} plus />
          </g>
        )
      })}
      <QuarterLabels x={x} labels={labels} />
    </svg>
  )
}

/** 매출 — 막대. 「얼마나 많이」라 바닥에서 자란 기둥이 맞다. */
function BarChart({ points: all, w }: { points: number[]; w: number }) {
  const points = crop(all, w)
  const labels = crop(Q, w)
  const cropped = points.length < all.length
  // 막대 = 길이 규약화 → 축은 항상 0에서 (2장 ③)
  const { x, y, zero } = scale(points, true, w)
  return (
    <svg
      viewBox={`0 0 ${w} 104`}
      preserveAspectRatio="xMidYMid meet"
      height="104"
      className="w-full"
    >
      <Grid w={w} />
      {!cropped && (
        <Window x={x} from={points.length - 3} to={points.length - 1} />
      )}
      <ZeroLine y={zero} show w={w} />
      {points.map((v, i) => {
        const c = signColor(v)
        const last = i === points.length - 1
        const top = Math.min(y(v), zero)
        return (
          <g key={i}>
            <rect
              x={x(i) - 15}
              y={top}
              width="30"
              height={Math.abs(zero - y(v))}
              rx="5"
              fill={c}
              opacity={last ? 1 : FADE}
            />
            <ValueLabel x={x(i)} y={top - 7} v={v} last={last} c={c} plus />
          </g>
        )
      })}
      <QuarterLabels x={x} labels={labels} />
    </svg>
  )
}

/**
 * 마진 — 면적. 「판 돈에서 남는 몫」이라 채워진 넓이로 읽는다.
 *
 * **순이익률(순이익 ÷ 매출)이다.** 책이 마진으로 두 지표를 드는데 —
 *   매출총이익률   비용 통제와 가격 책정을 얼마나 잘하는지.
 *                「고객이 제품에 얼마나 더 많은 돈을 지불하는지」
 *                ⚠️ 원자재 하락·경쟁사 문제 같은 단기 변수에 흔들린다
 *   순이익률       수익성에 영향을 미치는 모든 변수를 반영.  ⚠️ 세금까지 들어간다
 * — **저자가 주로 쓰는 것이 순이익률**이다. 업계 비교로 경쟁우위를 재기 때문이다
 * (애플 2003년 1.2% → 2011년 23.9%, 그 사이 주가 +6,000%).
 *
 * ⚠️ 값이 「전년 동기 대비」가 아니라 **그 분기의 비율 자체**라, EPS·매출과 달리
 * 마지막 값에 `YoY` 를 안 붙인다.
 */
function AreaChart({ points: all, w }: { points: number[]; w: number }) {
  const points = crop(all, w)
  const labels = crop(Q, w)
  const cropped = points.length < all.length
  // 면적 = 영역 규약화 → 축은 항상 0에서 (2장 ③)
  const { x, y, zero } = scale(points, true, w)
  const line = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`)
    .join(' ')
  const area = `${line} L ${x(points.length - 1)} ${zero} L ${x(0)} ${zero} Z`
  return (
    <svg
      viewBox={`0 0 ${w} 104`}
      preserveAspectRatio="xMidYMid meet"
      height="104"
      className="w-full"
    >
      <Grid w={w} />
      {!cropped && (
        <Window x={x} from={points.length - 3} to={points.length - 1} />
      )}
      <path d={area} fill={RED} opacity=".12" />
      {/* 선은 «연결»만 진다. 「이번 분기」는 점의 채도가 이미 지고 있으므로
          선까지 구간을 가르면 같은 항목을 두 번 지게 된다 (12장 ③) */}
      <path
        d={line}
        fill="none"
        stroke={RED}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
      <ZeroLine y={zero} show w={w} />
      {points.map((v, i) => {
        const last = i === points.length - 1
        const c = signColor(v)
        return (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(v)}
              r="5"
              fill={last ? c : '#0a0a0a'}
              stroke={c}
              strokeWidth="2"
              opacity={last ? 1 : FADE}
            />
            <ValueLabel
              x={x(i)}
              y={y(v) - 12}
              v={v}
              last={last}
              c={c}
              plus={false}
            />
          </g>
        )
      })}
      <QuarterLabels x={x} labels={labels} />
    </svg>
  )
}

/* ───────────────────────── 카드 셋 ───────────────────────── */

/**
 * 수준과 방향이 둘 다 「EPS 증가율」 하나의 속성이라 한 장에 담긴다.
 *
 * 카드 셋의 순서가 곧 계산 순서다 — **매출 × 마진 = 순이익, ÷ 주식 수 = EPS.**
 * 매출이 얼마나 커졌고, 그중 얼마가 남았고, 주주 몫으로 얼마가 왔는지가 왼쪽에서
 * 오른쪽으로 읽힌다. 세 계열이 «함께» 오르는지를 보는 코드 33 이 이 항등식 위에 있다.
 */
export function EpsCard() {
  const pts = [12, 19, -8, 28, 42]
  return (
    <MetricCard
      title="EPS 증가율"
      sub="(순이익 ÷ 주식 수) 증가율"
      unit="전년 동기 대비"
      desc="전년 동기 대비 변화율"
      rankLabel="3분기 증가율 상승폭"
      rank={fmtDelta(windowDelta(pts))}
      chart={(w) => <DotChart points={pts} w={w} />}
    />
  )
}

/**
 * 매출 — 손익계산서 맨 윗줄 그대로다. 원서가 정의를 안 주는 이유이기도 하다
 * (회계 상식으로 전제한다). 우리가 따로 지어낼 것이 없다.
 */
export function RevenueCard() {
  const pts = [4, -6, 9, 13, 18]
  return (
    <MetricCard
      title="매출 증가율"
      sub="손익계산서 매출액 증가율"
      unit="전년 동기 대비"
      desc="전년 동기 대비 변화율"
      rankLabel="3분기 증가율 상승폭"
      rank={fmtDelta(windowDelta(pts))}
      chart={(w) => <BarChart points={pts} w={w} />}
    />
  )
}

export function MarginCard() {
  const pts = [8.2, -2.1, 12.4, 18.6, 24.1]
  return (
    <MetricCard
      title="마진율"
      sub="순이익 ÷ 매출"
      unit="해당 분기"
      desc="분기별 순이익률"
      rankLabel="3분기 상승폭"
      rank={fmtDelta(windowDelta(pts))}
      chart={(w) => <AreaChart points={pts} w={w} />}
    />
  )
}
