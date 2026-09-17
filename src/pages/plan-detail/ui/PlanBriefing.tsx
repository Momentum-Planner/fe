import { cn } from '@/shared/lib/cn'
import type { DailyScreening } from '@/shared/lib/snapshots'
import { TREND_CONDITIONS } from '@/shared/lib/snapshots'
import { ENTRY_STATE_LABEL } from '@/entities/plan'
import type { PlanBriefing as Briefing } from '@/entities/plan'
import { won } from './planParts'

/**
 * **새 계획 전에 볼 것** (Q17 2) — 세우는 동안 사슬 자리.
 *
 * ```text
 * [최근 매매 성적]  [현재 종목 성적]  [눌림 진입 성적]        ← 결론 카드 셋 · 중심점
 *  7승 3패          3승 4패          ⚠ 6승 7패
 * 09-16 판정  정배열 ✓ · 200일선 13개월 상승 ✓ · 50일선 −10% · 52주 고점 −1.5% ✓ · …   ← 훑는 참고 한 줄
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
}: {
  briefing: Briefing
  /** 달력에서 고른 날의 판정 — 진입 상태 · 레짐으로 가른다. 아직 없으면 안내만 */
  snap: DailyScreening | undefined
  stopLimit?: number
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
      </div>
      {/* 좌우 두 기둥 — 「내 전적」 결론 카드 | 「스크리너 판정」 체크리스트 (2026-09-17 · 4장 (가)).
          💀 판정을 아래 한 줄로 눕혔더니 카드가 왼쪽에 몰리고 오른쪽이 비었다. 같은 모양이면 같은 정보로
             읽히므로(유사성) 오른쪽은 «카드가 아닌» 체크리스트로 두고, 가운데 세로선 하나로 가른다 */}
      <div className="grid grid-cols-[minmax(0,1.25fr)_1px_minmax(0,1fr)] gap-4">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] text-white/40">내 전적</div>
          <div className="grid grid-cols-3 gap-2">
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
              <Sub warn={riskWarn}>
                계좌 위험노출 {r.accountRisk.toFixed(2)}%
              </Sub>
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
                <Sub>판정 기준일을 고르면 진입 상태로 가른다</Sub>
              )}
              {stopLimit != null && <Sub>손절폭 상한 {stopLimit}%</Sub>}
            </Card>
          </div>
        </div>
        <div className="bg-white/[0.08]" aria-hidden />
        <ScreenerJudgment snap={snap} />
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

/**
 * **스크리너 판정** — 고른 날 스크리너가 저장해 둔 값 (2026-09-17 · 4장 (가)).
 *
 * ```text
 * 09-02 스크리너 판정 · 트렌드 템플릿 8/8
 * 150·200일선 위      ✓   │ 52주 저점 +25%      +95.2% ✓
 * 150일선 > 200일선    ✓   │ 52주 고점 −25% 이내   −1.5% ✓
 * 200일선 상승   13개월 ✓   │ RS 70 이상           97 ✓
 * 50일선 > 150·200일선 ✓   │ 진입 가능 · 50일선 위     ✓
 * 펀더멘털 5/7 · 훼손 0 · 진입 위치 +1.2%
 * ```
 * 통과 여부는 스크리너가 쌓은 `trendFailed` 그대로 — 화면이 다시 판정하지 않는다.
 */
function ScreenerJudgment({ snap }: { snap: DailyScreening | undefined }) {
  if (!snap)
    return (
      <div className="min-w-0">
        <div className="mb-1 text-[11px] text-white/40">스크리너 판정</div>
        <div className="text-[12px] text-white/40">
          판정 기준일을 고르면 그날 스크리너가 저장한 판정이 뜬다
        </div>
      </div>
    )
  const t = snap.trend
  const pct = (n: number) =>
    `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`
  const value: Partial<Record<(typeof TREND_CONDITIONS)[number], string>> = {
    '200일선 상승': `${t.ma200RisingMonths}개월`,
    '52주 저점 +25%': pct(t.fromLow52),
    '52주 고점 −25% 이내': pct(t.fromHigh52),
    'RS 70 이상': `${t.rs} · ${Math.abs(t.rsTrendWeeks)}주${t.rsTrendWeeks >= 0 ? '↑' : '↓'}`,
  }
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] text-white/40">
        <span className="font-number text-white/70">{snap.date.slice(5)}</span>{' '}
        스크리너 판정 · 트렌드 템플릿{' '}
        <span className="font-number text-white/70">{snap.trendPassed}/8</span>
      </div>
      <div className="grid grid-flow-col grid-cols-2 grid-rows-4 gap-x-4">
        {TREND_CONDITIONS.map((c) => {
          const ok = !snap.trendFailed.includes(c)
          return (
            <div
              key={c}
              className="flex items-baseline gap-2 border-b border-white/[0.05] py-0.5 text-[12px]"
            >
              <span className="truncate text-white/60">{c}</span>
              <span className="font-number ml-auto shrink-0 text-white/80 tabular-nums">
                {value[c] ?? ''}
              </span>
              <span className={ok ? 'text-success' : 'text-brand-red'}>
                {ok ? '✓' : '✕'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="font-number mt-1 flex gap-3 text-[12px] text-white/55">
        <span>펀더멘털 {snap.fundamentalScore}/7</span>
        <span>훼손 {snap.damageScore}</span>
        <span>진입 위치 {pct(snap.entryPosition)}</span>
      </div>
    </div>
  )
}
