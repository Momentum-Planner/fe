import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { DailyScreening } from '@/shared/lib/snapshots'
import {
  autoPlanTitle,
  clampExposure,
  goalPrice,
  goalsProblem,
  needCash,
  ownRisk,
  priceConflict,
  stopWidthPct,
} from '@/entities/plan'
import type { PlanDefaults } from '@/entities/plan'
import { SnapshotCalendar } from './SnapshotCalendar'
import { StopLadderEditor } from './StopLadder'
import { LIT_PANEL } from './panel'
import {
  Btn,
  CandidateList,
  MoneyField,
  Foot,
  Pair,
  Section,
  StopField,
  won,
} from './planParts'
import type { useNewPlan } from './useNewPlan'

/**
 * 새 계획 폼 — **10장 A~F 를 순서대로 닫아 세웠다** (Q11 · Q12).
 *
 * ```text
 * ① 근거     스냅샷 날짜 (달력)
 * ② 1R       진입 예상가 | 스톱가격 [원|%]  + 후보 선 · 상한 줄
 * ③ 규모     수량 | 위험노출 (t-stat)      + 필요 현금 · ÷ 계좌 총액
 * ④ 스톱 갱신 규칙   스톱 사다리 — 목표 R 만 건다(필수).  빈 ① 단으로 시작 (Q16)
 * ⑤ 메모 (선택)  + 등록 → 계좌 총액 확인
 * ```
 *
 * **순차 공개** (Q11 B) — 앞 섹션이 차야 다음 섹션이 나타난다. 여는 때는
 * «값이 맞아지는 순간»이 아니라 **칸을 벗어날 때**다 (Q11 F). 손절가에 `7` 만 쳐도
 * 「진입가보다 낮은 값」이라 규칙상 맞는데, 치는 도중이다.
 *
 * **✕ · ⚠ 메시지도 칸을 벗어날 때** 뜬다 (Q11 F). 1R · 위험노출 · 필요 현금 같은
 * «결과값»만 치는 동안 따라 움직인다 — 그래야 보고 정한다 (디자인 9장 ④).
 *
 * ⚠️ 이름을 안 묻는다 — 진입 상태 + 진입가로 자동이다 (Q11 A · `autoPlanTitle`).
 */
const RISK_WARN = 2.5

type Stage = 1 | 2 | 3 | 4 | 5

export function NewPlanForm({
  born,
  defaults,
  rows,
  picking,
  onPicking,
}: {
  born: ReturnType<typeof useNewPlan>
  /** 계좌 · 통계 · 종목에서 오는 값들 — 계획이 아니라 «그 밖»에서 온다 */
  defaults: PlanDefaults
  /** 이 종목의 스크리닝 행 — 달력이 고를 수 있는 날이고, 고른 날의 스냅샷이다 */
  rows: DailyScreening[]
  picking: 'entry' | 'stop' | null
  onPicking: (v: 'entry' | 'stop' | null) => void
}) {
  const d = born.draft
  /** 어디까지 열렸나 — 한 번 열린 섹션은 값이 틀려져도 안 닫는다 */
  const [stage, setStage] = useState<Stage>(1)
  /** 칸을 벗어날 때 «확정된» 값 — ✕ · ⚠ 는 이 값으로만 판정한다 (Q11 F) */
  const [seen, setSeen] = useState({ entry: 0, stop: 0, qty: 0 })
  const [confirming, setConfirming] = useState(false)

  // ⚠️ 폼을 «닫으면» 부모가 이 컴포넌트를 내린다 — 다시 열면 상태가 처음부터다

  if (!d) return null

  const snap = rows.find((r) => r.date === d.snapshotDate)
  const width = stopWidthPct(d.entryPrice, d.stopPrice)
  const cash = needCash(d.entryPrice, d.quantity)
  const own = ownRisk(
    d.entryPrice,
    d.stopPrice,
    d.quantity,
    defaults.accountTotal,
  )
  const after = clampExposure(defaults.riskBefore + own)
  const ok1R = d.entryPrice > 0 && d.stopPrice > 0 && d.stopPrice < d.entryPrice
  const title =
    snap && d.entryPrice > 0
      ? autoPlanTitle(snap.entryState, d.entryPrice)
      : null

  // ── 칸을 벗어날 때 확정하고, 맞으면 다음 섹션을 연다 ──
  const commit1R = () => {
    setSeen((v) => ({ ...v, entry: d.entryPrice, stop: d.stopPrice }))
    if (ok1R && stage === 2) setStage(3)
  }
  const commitQty = () => {
    setSeen((v) => ({ ...v, qty: d.quantity }))
    if (d.quantity > 0 && stage === 3) setStage(4)
  }

  // ── 확정된 값으로만 판정하는 메시지 ──
  const seenWidth = stopWidthPct(seen.entry, seen.stop)
  const stopBlock =
    priceConflict(seen.entry, seen.stop, null) ??
    (seen.entry > 0 && seen.stop > 0 && seen.stop > seen.entry
      ? '✕ 진입가보다 낮아야 한다'
      : undefined)
  /** 목표 — 사다리 ① 단의 가격. 진입 · 스톱과 같으면 막는다 (차트도 이 단 하나만 그린다) */
  const first = d.goals[0] ?? null
  const goal =
    first != null ? goalPrice(d.entryPrice, d.stopPrice, first) : null
  const ladderBlock = d.goals.some((r) => r != null)
    ? goalsProblem(d.goals)
    : null
  const goalBlock =
    goal != null &&
    priceConflict(d.entryPrice, d.stopPrice, goal)?.includes('목표')
      ? priceConflict(d.entryPrice, d.stopPrice, goal)
      : null
  const stopWarn =
    !stopBlock && seen.stop > 0 && seenWidth > defaults.stopLimit
      ? `⚠ 상한 ${defaults.stopLimit}% 초과`
      : undefined
  const seenCash = needCash(d.entryPrice, seen.qty)
  const cashBlock =
    seen.qty > 0 && seenCash > defaults.accountCash
      ? `✕ 현금 ${won(defaults.accountCash)} 보다 ${won(seenCash - defaults.accountCash)} 크다`
      : undefined
  const overCash = cash > defaults.accountCash
  const riskWarn = seen.qty > 0 && after > RISK_WARN

  /** 상한 줄 — 손절폭이 상한을 넘으면 후보 목록 맨 위에 선다 (Q11 E) */
  const limitPrice =
    d.entryPrice > 0
      ? Math.round(d.entryPrice * (1 - defaults.stopLimit / 100))
      : 0
  const candidates = [
    ...(stopWarn && limitPrice > 0
      ? [
          {
            label: `상한 ${defaults.stopLimit}%`,
            price: limitPrice,
            width: defaults.stopLimit,
            overLimit: false,
            limit: true,
          },
        ]
      : []),
    ...defaults.stopCandidates
      .filter(
        (c) => c.label !== '직접 넣은 값' && !c.label.startsWith('스톱 하한'),
      )
      .map((c) => ({ ...c, limit: false })),
  ]

  return (
    <section className={cn(LIT_PANEL, 'min-w-0 px-4 py-4')}>
      {/* 머리줄 — 이름이 «자동»이다. 버튼은 취소 하나 (등록은 맨 아래) */}
      <div className="flex items-center gap-2">
        <span className="bg-brand-blue/15 text-brand-blue shrink-0 rounded-md px-2 py-0.5 text-[12px] font-bold">
          새 계획
        </span>
        <span
          className={cn(
            'truncate text-[15px] font-bold',
            title ? 'text-white' : 'text-white/25',
          )}
        >
          {title ?? '이름은 자동으로 붙는다'}
        </span>
        <Btn onClick={born.cancel} className="ml-auto shrink-0">
          취소
        </Btn>
      </div>

      {/* ① 근거 */}
      <Section title="① 근거" first>
        <div className="mb-1 text-[11px] text-white/40">스냅샷 날짜</div>
        <SnapshotCalendar
          value={d.snapshotDate}
          enabled={rows.map((r) => r.date)}
          onPick={(date) => {
            born.set('snapshotDate', date)
            if (stage === 1) setStage(2)
          }}
        />
      </Section>

      {/* ② 1R */}
      {stage >= 2 && (
        <Section title="② 1R">
          {/* 카드와 «같은 두 칸 격자» — 쓰는 모양이 곧 될 모양이다 (Q12 · PlanCard) */}
          <Pair
            left={
              <>
                <MoneyField
                  label="진입 예상가"
                  value={d.entryPrice}
                  onChange={(n) => born.set('entryPrice', n)}
                  onBlur={commit1R}
                  picking={picking === 'entry'}
                  onPick={() => onPicking(picking === 'entry' ? null : 'entry')}
                />
                <Foot>
                  {ok1R
                    ? `1R ${won(d.entryPrice - d.stopPrice)} · ${width.toFixed(2)}%`
                    : '1R —'}
                </Foot>
              </>
            }
            right={
              <>
                <StopField
                  entry={d.entryPrice}
                  value={d.stopPrice}
                  onChange={(n) => born.set('stopPrice', n)}
                  onBlur={commit1R}
                  picking={picking === 'stop'}
                  onPick={() => onPicking(picking === 'stop' ? null : 'stop')}
                  block={stopBlock}
                  warn={stopWarn}
                />
                {/* 손절폭 상한 — 고를 때 쓰는 선이다 (④-1-1-2). 스톱가격 밑에 */}
                <Foot>
                  상한 {defaults.stopLimit}%
                  <span className="font-text ml-1 text-white/25">
                    {defaults.stopLimitBasis
                      ? `평균수익 ${defaults.stopLimitBasis.avgWin}% ÷ 손익비 ${defaults.stopLimitBasis.targetRR}`
                      : '통계 없음 — 10%'}
                  </span>
                </Foot>
              </>
            }
          />

          {/* 후보 선 — 서비스가 하나를 정해 주지 않는다. 늘어놓고 고르게 한다 */}
          <CandidateList
            items={candidates}
            chosen={d.stopPrice}
            onPick={(price) => {
              born.set('stopPrice', price)
              setSeen((v) => ({ ...v, entry: d.entryPrice, stop: price }))
              if (d.entryPrice > price && stage === 2) setStage(3)
            }}
          />
        </Section>
      )}

      {/* ③ 규모 — 수량은 진입가 아래, 위험노출은 스톱가격 아래 (Q12 같은 두 칸) */}
      {stage >= 3 && (
        <Section title="③ 규모">
          <Pair
            left={
              <>
                <MoneyField
                  label="수량"
                  unit="주"
                  value={d.quantity}
                  onChange={(n) => born.set('quantity', n)}
                  onBlur={commitQty}
                  block={cashBlock}
                />
                <Foot className={overCash ? 'text-brand-red' : undefined}>
                  필요 현금 {won(cash)}
                </Foot>
              </>
            }
            right={
              <>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-number text-[11px] text-white/40">
                    위험노출 {defaults.riskBefore.toFixed(2)}% →
                  </span>
                  {/* 결론이 입력칸들 사이에서 먼저 읽힌다 — 숫자만 키운다 (Q12) */}
                  <span
                    className={cn(
                      't-stat font-number leading-tight',
                      riskWarn ? 'text-warning' : 'text-white',
                    )}
                  >
                    {after.toFixed(2)}%
                  </span>
                </div>
                <Foot>
                  ÷ 계좌 총액 {won(defaults.accountTotal)}
                  <span className="font-text ml-1 text-white/25">지금</span>
                </Foot>
              </>
            }
          />
          {riskWarn && (
            <div className="text-warning mt-0.5 text-[11px]">
              ⚠ {RISK_WARN}% 초과 — 경고만 한다
            </div>
          )}
        </Section>
      )}

      {/* ④ 스톱 갱신 규칙 — 스톱 사다리. 목표만 건다 · 옮길 자리는 닿은 날 고른다 (Q16) */}
      {stage >= 4 && (
        <Section title="④ 스톱 갱신 규칙">
          <div className="mb-1 text-[11px] text-white/35">
            목표에 닿으면 그날 스톱을 옮길 자리를 고른다
          </div>
          <StopLadderEditor
            value={d.goals}
            locked={[]}
            onChange={(next) => {
              born.set('goals', next)
              if (stage === 4 && goalsProblem(next) == null) setStage(5)
            }}
            entryPrice={d.entryPrice}
            stopPrice={d.stopPrice}
            initialStopWidth={null}
          />
          {(goalBlock ?? ladderBlock) && (
            <div className="text-brand-red mt-1 text-[11px]">
              {goalBlock ?? ladderBlock}
            </div>
          )}
        </Section>
      )}

      {/* ⑤ 메모 (선택) + 등록 — 콜투액션은 먼저 읽는 것 «뒤»에 (Q12 시선의 흐름) */}
      {stage >= 5 && (
        <Section
          title="⑤ 메모"
          tail={
            <span className="text-[11px] font-normal text-white/30">선택</span>
          }
        >
          <textarea
            value={d.memo}
            onChange={(e) => born.set('memo', e.target.value)}
            rows={3}
            placeholder="왜 여기서 사려는가"
            className="bg-bg-input w-full resize-y rounded-md px-2.5 py-2 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
          />
          <div className="mt-2.5 flex justify-end">
            <Btn
              go
              onClick={() => setConfirming(true)}
              disabled={
                !born.ready || overCash || goalBlock != null || born.pending
              }
            >
              {born.pending ? '등록 중…' : '등록'}
            </Btn>
          </div>
        </Section>
      )}

      {confirming && title && (
        <AccountConfirm
          total={defaults.accountTotal}
          cash={defaults.accountCash}
          title={title}
          pending={born.pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => born.submit(title)}
        />
      )}
    </section>
  )
}

/**
 * 등록 전 **계좌 총액 확인** — 따로 띄운다 (Q11 A · ③-2-3 · ④-1-3).
 *
 * 계좌 총액은 위험노출의 분모다. 계획마다 적으면 종목끼리 분모가 달라지므로 계좌가 든
 * 값을 쓰고, «지금 이 상태가 맞는가»만 한 번 확인받는다.
 */
function AccountConfirm({
  total,
  cash,
  title,
  pending,
  onCancel,
  onConfirm,
}: {
  total: number
  cash: number
  title: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="계좌 총액 확인"
        className={cn(LIT_PANEL, 'w-[340px] px-5 py-4')}
      >
        <div className="text-[15px] font-bold text-white">등록 전 확인</div>
        <div className="mt-1 text-[13px] text-white/50">
          「{title}」 — 기록상 계좌가 지금과 같은가
        </div>
        <dl className="font-number mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
          <dt className="font-text text-white/45">계좌 총액</dt>
          <dd className="text-right text-white">{won(total)}</dd>
          <dt className="font-text text-white/45">현금</dt>
          <dd className="text-right text-white/80">{won(cash)}</dd>
        </dl>
        <div className="mt-1.5 text-[11px] text-white/30">
          다르면 계좌 기록부터 고친다 — 위험노출의 분모가 틀어진다
        </div>
        <div className="mt-4 flex justify-end gap-1.5">
          <Btn onClick={onCancel}>돌아가기</Btn>
          <Btn go onClick={onConfirm} disabled={pending}>
            {pending ? '등록 중…' : '맞다 · 등록'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
