import type { PlanSnapshot } from '@/entities/plan'
import { cn } from '@/shared/lib/cn'
import { GATE_BG, GATE_COLOR, entryGate } from '@/shared/lib/snapshots'

/**
 * ④-0 스냅샷 — **원값 글자 표, 차트 카드 아래** (Q12).
 *
 * ```text
 * 머리   스냅샷 날짜 · 진입 상태 · 접기
 * 몸     트렌드(주가 · 50/150/200일선) | 52주 · RS | 펀더멘털 세 분기
 * ```
 *
 * 💀 요약값(펀더멘털 5/7 · 트렌드 8/8)은 볼 이유가 없었다. 볼 이유는 그 요약을 만든
 * **원값**에 있다. 점수 · 통과 개수 · 진입 위치 · 훼손은 기록만 하고 여기 안 띄운다.
 *
 * 💀 옛 `SnapshotBar` 는 차트 «위»였다(보조지표 팝오버가 아래로 열려서). 이제는
 * 원값이 세 칸이라 640 폭이 필요하고, 차트보다 계획 칸이 길어 차트 아래가 원래 비어
 * 있었다. 그 빈자리를 쓴다.
 *
 * 볼 때는 접힌 채, 세울 때는 펼친 채 시작한다 (Q12 동적 디스플레이) — 여닫는 것은
 * 부모가 든다. 세우기를 켜고 끌 때 초기값으로 돌아가야 해서다.
 */
const won = (n: number) => n.toLocaleString('ko-KR')
const pct = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`

const HINT = {
  snapshot:
    '계획을 세운 날의 배치 판정. 그날 값 그대로 남아 나중에 안 변한다 — 사후에는 못 만든다.',
  aligned:
    '주가 · 50일선 · 150일선 · 200일선이 위에서부터 이 순서로 서 있으면 정배열이다 (트렌드 템플릿 1 · 2 · 4).',
  rs: '다른 종목 대비 상대 강도 백분위. 뒤의 주 수는 RS 추세가 오른 기간이다.',
  fundamentals:
    '전년 같은 분기 대비 증가율. 공시일 기준이고 잠정 실적은 안 쓴다.',
} as const

export function SnapshotTable({
  snap,
  open,
  onToggle,
}: {
  snap: PlanSnapshot
  open: boolean
  onToggle: () => void
}) {
  const gate = entryGate(snap.entryState, snap.regime)
  const t = snap.trend
  const f = snap.fundamentals
  const aligned = t.close > t.ma50 && t.ma50 > t.ma150 && t.ma150 > t.ma200
  const rows: [string, number, string | null][] = [
    ['주가', t.close, null],
    ['50일선', t.ma50, null],
    ['150일선', t.ma150, null],
    [`200일선`, t.ma200, `↑${t.ma200RisingMonths}개월`],
  ]

  return (
    <section
      aria-label="스냅샷"
      className="mt-2.5 border-t border-white/[0.06] px-1 pt-2.5"
    >
      <div className="flex items-center gap-x-3">
        <Hint text={HINT.snapshot}>
          <span className="text-[11px] font-bold tracking-wide text-white/45">
            스냅샷
          </span>
        </Hint>
        <span className="font-number text-[11px] text-white/60">
          {snap.date}
        </span>
        <span
          className="rounded-pill px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: gate.ok ? GATE_BG.ok : GATE_BG.no,
            color: gate.ok ? GATE_COLOR.ok : GATE_COLOR.no,
          }}
        >
          <span className="font-normal opacity-60">{gate.head}</span>
          <span className="opacity-40"> · </span>
          {gate.detail}
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="ml-auto rounded-md px-2 py-0.5 text-[11px] text-white/45 hover:bg-white/[0.06] hover:text-white/80"
        >
          {open ? '접기 ▾' : '펼치기 ▸'}
        </button>
      </div>

      {open && (
        <div className="mt-2 grid grid-cols-[1.1fr_1fr_1.1fr] gap-5 text-[12px]">
          {/* 트렌드 — 가격 순서가 곧 조건 1 · 2 · 4 다 */}
          <div>
            <Title>트렌드</Title>
            {rows.map(([label, v, tail]) => (
              <Row key={label} label={label} tail={tail}>
                <span>{won(v)}</span>
                <span className="w-12 text-right text-white/35">
                  {label === '주가' ? '' : pct(((v - t.close) / t.close) * 100)}
                </span>
              </Row>
            ))}
            <Hint text={HINT.aligned}>
              <span
                className={cn(
                  'mt-0.5 text-[11px]',
                  aligned ? 'text-success' : 'text-brand-red',
                )}
              >
                {aligned ? '정배열 ✓' : '정배열 아님 ✕'}
              </span>
            </Hint>
          </div>

          {/* 숫자 셋 — 조건 5 · 6 · 7 */}
          <div>
            <Title>52주 · RS</Title>
            <Row label="52주 저점 대비" ok={t.fromLow52 >= 25}>
              {pct(t.fromLow52)}
            </Row>
            <Row label="52주 고점 대비" ok={t.fromHigh52 >= -25}>
              {pct(t.fromHigh52)}
            </Row>
            <Row
              label={
                <Hint text={HINT.rs}>
                  <span>RS</span>
                </Hint>
              }
              ok={t.rs >= 70}
            >
              {t.rs} · {Math.abs(t.rsTrendWeeks)}주
              {t.rsTrendWeeks >= 0 ? '↑' : '↓'}
            </Row>
          </div>

          {/* 펀더멘털 — 점수 대신 세 분기 원값. 오른쪽이 최근 */}
          <div>
            <Title>
              <Hint text={HINT.fundamentals}>
                <span>펀더멘털</span>
              </Hint>
            </Title>
            <table className="font-number w-full tabular-nums">
              <thead>
                <tr className="text-[10px] text-white/35">
                  <th className="text-left font-normal" />
                  {f.quarters.map((q) => (
                    <th key={q.label} className="text-right font-normal">
                      {q.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-white/80">
                {(
                  [
                    ['EPS', (q) => pct(q.epsGrowth)],
                    ['매출', (q) => pct(q.revenueGrowth)],
                    ['마진', (q) => `${q.margin.toFixed(1)}%`],
                  ] as const satisfies readonly (readonly [
                    string,
                    (q: (typeof f.quarters)[number]) => string,
                  ])[]
                ).map(([label, fmt]) => (
                  <tr key={label} className="border-t border-white/[0.05]">
                    <td className="font-text py-0.5 text-white/50">{label}</td>
                    {f.quarters.map((q) => (
                      <td key={q.label} className="text-right">
                        {fmt(q)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-0.5 text-[10px] text-white/30">
              공시 {f.disclosedAt} 기준
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const Title = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1 text-[10px] text-white/35">{children}</div>
)

function Row({
  label,
  tail,
  ok,
  children,
}: {
  label: React.ReactNode
  tail?: string | null
  ok?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-white/50">
        {label}
        {tail && <span className="ml-1 text-[10px] text-white/30">{tail}</span>}
      </span>
      <span className="font-number ml-auto flex gap-2 text-white/80 tabular-nums">
        {children}
      </span>
      {ok !== undefined && (
        <span className={ok ? 'text-success' : 'text-brand-red'}>
          {ok ? '✓' : '✕'}
        </span>
      )}
    </div>
  )
}

/**
 * 용어 힌트 — **레이블에만 붙는다.** 값에 붙이면 매번 읽히지만 레이블은 한 번
 * 배우면 안 읽는다 (교재 1장). 점선 밑줄이 「여기 뭔가 더 있다」를 말한다.
 * ⚠️ 모바일에 호버가 없다. 탭으로 바꾸는 것은 «아직 안 정했다».
 */
function Hint({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <span className="cursor-help border-b border-dotted border-white/25">
        {children}
      </span>
      <span
        role="tooltip"
        className="shadow-pop pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-[230px] rounded-lg border border-white/10 bg-[#141414] px-2.5 py-2 text-[11px] leading-[1.5] font-normal text-white/70 group-hover:block"
      >
        {text}
      </span>
    </span>
  )
}
