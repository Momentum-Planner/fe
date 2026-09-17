import { cn } from '@/shared/lib/cn'
import type { DailyScreening } from '@/shared/lib/snapshots'
import { ENTRY_STATE_LABEL } from '@/entities/plan'
import type { PlanBriefing as Briefing } from '@/entities/plan'
import { won } from './planParts'

/**
 * **새 계획 전에 볼 것** (Q17 2 · (나)) — 세우는 동안 사슬 자리에 세 칸.
 *
 * ```text
 * 내 최근 매매              │ 이 종목                  │ 이 조건에서 나
 * ⚠ 연속 손실 3회           │ 4건 · 1승 3패            │ ⚠ 돌파 승률 25% (8건)
 * 최근 10건 승률 30% (전체 50) │ 마지막 −1.0R · 08-11     │ 승률 46% · 내 평균보다 낮다
 * ⚠ 계좌 위험노출 3.1%       │ 들고 있음 15주 · 스톱 …    │ 손절폭 상한 2.36%
 * ```
 *
 * 💀 사슬은 계획의 «모양»이다. 새 계획에 필요한 것은 «결론» — 「이 종목에서 내가 어땠나」.
 *
 * ⚠️ 경고 기준은 문서에 이미 있는 선만 쓴다 — 계좌 위험노출 2.5% (④-1-3) · 표본 5건 (⑦) ·
 *    조건별 승률은 «내 전체 승률보다 낮다» 는 비교만. 연속 손실 3회는 **근거 없음 · 검증 대상**.
 */
export const LOSS_STREAK_WARN = 3
export const ACCOUNT_RISK_WARN = 2.5
const SAMPLE_WARN = 5

/** 이 진입 상태의 내 승률 — 표본 5건 이상이고 전체보다 낮으면 경고 */
export function entryStateNote(b: Briefing, snap: DailyScreening | undefined) {
  if (!snap) return null
  const g = b.byEntryState[snap.entryState]
  const label = ENTRY_STATE_LABEL[snap.entryState]
  if (!g) return { text: `${label} 거래 기록 없음`, warn: false }
  const warn =
    g.n >= SAMPLE_WARN &&
    b.recent.overallWinRate != null &&
    g.winRate < b.recent.overallWinRate
  return { text: `${label} 승률 ${g.winRate}% (${g.n}건)`, warn }
}

export function PlanBriefing({
  briefing: b,
  snap,
  stopLimit,
  onShowChain,
}: {
  briefing: Briefing
  /** 달력에서 고른 날의 판정 — 진입 상태 · 레짐으로 가른다. 아직 없으면 안내만 */
  snap: DailyScreening | undefined
  stopLimit?: number
  /** 사슬로 돌아가기 — 참조할 계획을 차트에 고를 때 */
  onShowChain?: () => void
}) {
  const r = b.recent
  const s = b.stock
  const entry = entryStateNote(b, snap)
  const g = snap ? b.byEntryState[snap.entryState] : undefined

  const streakWarn = r.lossStreak >= LOSS_STREAK_WARN
  const riskWarn = r.accountRisk > ACCOUNT_RISK_WARN
  // 카드마다 «결론 하나» — 걸리는 것이 있으면 그것이 결론이다
  // 큰 줄은 «전적» — 세 카드가 같은 꼴(○승 ○패)이라 나란히 견준다 (2026-09-17 (나))
  const recentWins =
    r.recentWinRate != null
      ? Math.round((r.recentWinRate / 100) * r.recentN)
      : 0
  const recentBig = streakWarn
    ? `⚠ 연속 손실 ${r.lossStreak}회`
    : riskWarn
      ? `⚠ 위험노출 ${r.accountRisk.toFixed(2)}%`
      : r.recentN
        ? `${recentWins}승 ${r.recentN - recentWins}패`
        : '기록 없음'
  const entryWins = g ? Math.round((g.winRate / 100) * g.n) : 0
  const lastR = s.last
    ? s.last.rMultiple != null
      ? `${s.last.rMultiple > 0 ? '+' : ''}${s.last.rMultiple.toFixed(1)}R`
      : `${s.last.returnPct > 0 ? '+' : ''}${s.last.returnPct.toFixed(1)}%`
    : null

  return (
    <div className="py-2">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[13px] font-bold text-white/85">
          새 계획 전에 볼 것
        </span>
        <span className="text-[11px] text-white/35">노랑 = 걸리는 것</span>
        {onShowChain && (
          <button
            type="button"
            onClick={onShowChain}
            className="ml-auto rounded px-1.5 text-[11px] text-white/40 hover:text-white/75"
          >
            사슬 보기 ▸
          </button>
        )}
      </div>
      {/* 💀 세 칸을 전폭으로 벌렸더니 넓은 화면에서 서로 멀어지고 숫자에 무게가 없었다.
          카드 셋을 묶어 왼쪽에 세우고, 카드마다 결론 하나를 크게 (4장 크기로 중요도) */}
      <div className="grid max-w-[760px] grid-cols-3 gap-2">
        <Card
          title="최근 매매 성적"
          big={recentBig}
          warn={streakWarn || riskWarn}
        >
          <Sub>
            최근 {r.recentN}건 · 전체 승률 {r.overallWinRate ?? '—'}%
          </Sub>
          <Sub warn={streakWarn}>
            {r.lossStreak > 0
              ? `연속 손실 ${r.lossStreak}회`
              : '연속 손실 없음'}
          </Sub>
          <Sub warn={riskWarn}>계좌 위험노출 {r.accountRisk.toFixed(2)}%</Sub>
        </Card>

        <Card
          title="현재 종목 성적"
          big={s.trades ? `${s.wins}승 ${s.losses}패` : '거래 없음'}
        >
          {s.last && (
            <Sub>
              마지막 {lastR} ({s.last.filledAt.slice(5)})
            </Sub>
          )}
          {s.holding && (
            <Sub>
              보유 {s.holding.quantity}주 · 스톱 {won(s.holding.stopPrice)}
            </Sub>
          )}
          {s.lastNote && <Sub>「{s.lastNote}」</Sub>}
        </Card>

        <Card
          title={
            snap
              ? `${ENTRY_STATE_LABEL[snap.entryState]} 진입 성적`
              : '진입 성적'
          }
          big={
            snap
              ? g
                ? `${entry?.warn ? '⚠ ' : ''}${entryWins}승 ${g.n - entryWins}패`
                : '기록 없음'
              : '—'
          }
          warn={entry?.warn}
        >
          {snap ? (
            <>
              {g && (
                <Sub warn={entry?.warn}>
                  승률 {g.winRate}% · 내 평균 {r.overallWinRate ?? '—'}%
                  {entry?.warn ? '보다 낮다' : ''}
                </Sub>
              )}
            </>
          ) : (
            <Sub>스냅샷 날짜를 고르면 진입 상태로 가른다</Sub>
          )}
          {stopLimit != null && <Sub>손절폭 상한 {stopLimit}%</Sub>}
        </Card>
      </div>
    </div>
  )
}

const Card = ({
  title,
  big,
  warn,
  children,
}: {
  title: string
  big: string
  warn?: boolean
  children: React.ReactNode
}) => (
  <div
    className={cn(
      'bg-bg-elevated flex min-w-0 flex-col rounded-lg px-3 py-2',
      warn && 'ring-warning/50 ring-1',
    )}
  >
    <div className="text-[11px] text-white/45">{title}</div>
    <div
      className={cn(
        'font-number mt-0.5 mb-1 truncate text-[18px] leading-tight font-bold tabular-nums',
        warn ? 'text-warning' : 'text-white',
      )}
    >
      {big}
    </div>
    {children}
  </div>
)

const Sub = ({
  warn,
  children,
}: {
  warn?: boolean
  children: React.ReactNode
}) => (
  <div
    className={cn(
      'font-number truncate text-[12px] leading-relaxed',
      warn ? 'text-warning' : 'text-white/55',
    )}
  >
    {children}
  </div>
)
