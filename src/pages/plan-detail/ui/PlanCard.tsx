import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  AVG_STOP_MIN_SAMPLES,
  PLAN_STATUS_LABEL,
  stopRaiseLabel,
  useUpdatePlan,
} from '@/entities/plan'
import type { PlanDefaults, PlanDetail } from '@/entities/plan'
import { StopRaisePicker } from './StopRaisePicker'
import { LIT_PANEL } from './panel'
import {
  Btn,
  CandidateList,
  MoneyField,
  Section,
  StopField,
  Sw,
  won,
} from './planParts'
import type { usePlanClose, usePlanRemove } from './usePlanRetire'
import type { usePlanDraft } from './usePlanDraft'

/**
 * 계획 하나를 **보고 고치는** 카드 — 새 계획 폼과 **같은 섹션**이다 (Q12).
 *
 * ```text
 * 머리   상태 · 이름 · 수정
 * ② 1R   진입 예상가 | 스톱가격 · 1R · 고른 후보 선
 * ③ 규모  수량 | 위험노출(큰 숫자) · 필요 현금 · ÷ 계좌 총액(등록 시점)
 * ④ 스톱 갱신 규칙
 * ⑤ 메모
 * 체결 · 폐기 · 삭제
 * ```
 *
 * 💀 옛 카드는 위험노출 막대와 회색 상자 칸이었다. 폼만 섹션으로 바뀌어 **쓰는 모양과
 * 읽는 모양이 갈렸다.** 읽을 때는 값, 고칠 때는 같은 자리가 입력칸이 된다.
 *
 * ⚠️ ① 근거가 없다 — 스냅샷은 사후에 못 바꾼다(F4). 차트 아래 표가 그 값을 보여준다.
 * ⚠️ 이름을 안 고친다 — 이름은 자동이다 (Q11 A).
 */
const HARD_LIMIT = 10
const RISK_WARN = 2.5

export function PlanCard({
  plan,
  defaults,
  draft,
  close,
  remove,
  named,
}: {
  plan: PlanDetail
  defaults?: PlanDefaults
  draft: ReturnType<typeof usePlanDraft>
  close: ReturnType<typeof usePlanClose>
  remove: ReturnType<typeof usePlanRemove>
  /** 치우려는 마디의 이름 — 사슬이 문이라 지금 보는 계획이 아닐 수 있다 */
  named: (id: number | null) => string
}) {
  const update = useUpdatePlan(plan.planId)
  const { editing, shown, derived, patch, dirty, begin, cancel, set } = draft
  const [seenQty, setSeenQty] = useState(shown.quantity)

  const walked = plan.status === 'RUNNING' || plan.status === 'DONE'
  const width = derived.stopWidth
  const oneR = plan.initialStopWidth ?? derived.oneR
  const cashBlock =
    editing && seenQty * shown.entryPrice > plan.accountCash
      ? `✕ 현금 ${won(plan.accountCash)} 보다 ${won(seenQty * shown.entryPrice - plan.accountCash)} 크다`
      : undefined
  const stopWarn =
    width > HARD_LIMIT
      ? `⚠ 손절폭 ${HARD_LIMIT}% 초과 — 포기하는 자리다`
      : width > plan.stopLimit
        ? `⚠ 상한 ${plan.stopLimit}% 초과`
        : undefined

  return (
    <section className={cn(LIT_PANEL, 'min-w-0 px-4 py-4')}>
      {/* 머리 — 흐름을 바꾸는 셋(이어서 세우기 · 폐기 · 삭제)은 사슬이 문이다. 여기는 수정뿐 */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold',
            plan.status === 'RUNNING'
              ? 'bg-brand-red/15 text-brand-red'
              : plan.status === 'PLANNED'
                ? 'bg-brand-blue/15 text-brand-blue'
                : 'bg-white/[0.08] text-white/70',
          )}
        >
          {PLAN_STATUS_LABEL[plan.status]}
        </span>
        <span className="truncate text-[14px] font-bold text-white">
          {plan.title}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {editing ? (
            <>
              <Btn
                go
                onClick={() => update.mutate(patch, { onSuccess: cancel })}
                disabled={!dirty || update.isPending}
              >
                {update.isPending ? '저장 중…' : '저장'}
              </Btn>
              <Btn onClick={cancel}>취소</Btn>
            </>
          ) : (
            <Btn onClick={begin}>수정</Btn>
          )}
        </div>
      </div>
      <div className="font-number mt-1 text-[10px] text-white/30">
        {plan.writtenAt} 작성
      </div>

      {/* ② 1R */}
      <Section title="② 1R">
        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            <MoneyField
              label="진입 예상가"
              value={shown.entryPrice}
              onChange={(n) => set('entryPrice', n)}
              onBlur={() => undefined}
            />
            <StopField
              entry={shown.entryPrice}
              value={shown.stopPrice}
              onChange={(n) => set('stopPrice', n)}
              onBlur={() => undefined}
              warn={stopWarn}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Value label="진입 예상가">{won(shown.entryPrice)}</Value>
            <Value label="스톱가격">{won(shown.stopPrice)}</Value>
          </div>
        )}
        <div className="mt-1 flex items-baseline justify-between text-[10px]">
          <span className="font-number text-white/45">
            1R {won(oneR)} · {width.toFixed(2)}%
          </span>
          {/* 상한은 «고를 때» 쓰는 선이다 — 읽을 때는 안 띄운다 (④-1-1-2) */}
          {editing && (
            <span className="text-right text-white/35">
              상한 {plan.stopLimit}%
              <span className="ml-1 text-white/20">
                {plan.stopLimitBasis
                  ? `평균수익 ${plan.stopLimitBasis.avgWin}% ÷ 손익비 ${plan.stopLimitBasis.targetRR}`
                  : `통계 없음 — ${HARD_LIMIT}%`}
              </span>
            </span>
          )}
        </div>
        {!editing && stopWarn && (
          <div className="text-warning mt-0.5 text-[10px]">{stopWarn}</div>
        )}
        {/* 읽을 때는 «고른 하나»만, 고칠 때는 전부 펴지고 버튼이 된다 */}
        <CandidateList
          items={plan.stopCandidates.filter(
            (c) => editing || c.price === shown.stopPrice,
          )}
          chosen={shown.stopPrice}
          onPick={editing ? (price) => set('stopPrice', price) : undefined}
        />
      </Section>

      {/* ③ 규모 — 수량은 진입가 아래, 위험노출은 스톱가격 아래 */}
      <Section title="③ 규모">
        <div className="grid grid-cols-2 items-end gap-2">
          {editing ? (
            <MoneyField
              label="수량"
              unit="주"
              value={shown.quantity}
              onChange={(n) => set('quantity', n)}
              onBlur={() => setSeenQty(shown.quantity)}
              block={cashBlock}
            />
          ) : (
            <Value label="수량">{shown.quantity}주</Value>
          )}
          <div>
            <div className="font-number text-[10px] text-white/40">
              위험노출 {plan.riskBefore.toFixed(2)}% →
            </div>
            <div
              className={cn(
                't-stat font-number leading-tight',
                derived.riskAfter > RISK_WARN ? 'text-warning' : 'text-white',
              )}
            >
              {derived.riskAfter.toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-[10px]">
          <span className="font-number text-white/45">
            필요 현금 {won(derived.needCash)}
          </span>
          {/* 분모가 분자 곁에 선다 (Q12). 이 계획이 등록할 때 «얼린» 값이다 (F7) */}
          <span className="font-number text-white/35">
            ÷ 계좌 총액 {won(plan.accountTotal)}
            <span className="font-text ml-1 text-white/25">등록 시점</span>
          </span>
        </div>
      </Section>

      {/* ④ 스톱 갱신 규칙 */}
      <Section title="④ 스톱 갱신 규칙">
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <StopRaisePicker
              value={shown.raise}
              onChange={(v) => set('raise', v)}
              avgLocked={
                (defaults?.sampleCount ?? 0) < AVG_STOP_MIN_SAMPLES
                  ? `통계 ${AVG_STOP_MIN_SAMPLES}건부터`
                  : null
              }
            />
            <Sw
              on={shown.trail50}
              onClick={() => set('trail50', !shown.trail50)}
            >
              50일선 트레일링
            </Sw>
          </div>
        ) : (
          <div className="text-[11px] text-white/60">
            <span>스톱 상향 {stopRaiseLabel(shown.raise)}</span>
            <span className="text-white/25"> · </span>
            {/* 꺼둔 규칙도 자리를 지킨다 (③-3-1) */}
            <span className={shown.trail50 ? '' : 'text-white/30'}>
              50일선 트레일링
            </span>{' '}
            <span className="text-white/35">{shown.trail50 ? '켬' : '끔'}</span>
          </div>
        )}
      </Section>

      {/* ⑤ 메모 — 고정 칸이다. 접지 않는다 */}
      <Section title="⑤ 메모">
        {editing ? (
          <textarea
            value={shown.memo}
            onChange={(e) => set('memo', e.target.value)}
            rows={3}
            placeholder="왜 여기서 사려는가"
            className="bg-bg-input w-full resize-y rounded-md px-2.5 py-2 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
          />
        ) : plan.memo ? (
          <div className="text-[12px] leading-relaxed text-white/65">
            {plan.memo}
          </div>
        ) : (
          <div className="text-[11px] text-white/25">메모 없음</div>
        )}
      </Section>

      {/* 체결 — 실행된 계획이면 «실제»가 답이다 */}
      {walked && plan.records.length > 0 && (
        <Section
          title="체결"
          tail={
            <span className="font-number text-[10px] font-normal text-white/50">
              {plan.recordCount}건 · 체결률 {Math.round(plan.fillRate * 100)}%
            </span>
          }
        >
          <ActualVsPlan plan={plan} />
          <div className="mt-1 flex flex-col gap-0.5">
            {plan.records.map((r) => (
              <div
                key={r.recordId}
                className="font-number grid grid-cols-[84px_28px_1fr_40px] items-center gap-1.5 text-[11px]"
              >
                <span className="text-white/40">{r.filledAt.slice(5)}</span>
                <span className="text-white/55">
                  {r.side === 'BUY' ? '매수' : '매도'}
                </span>
                <span className="text-right text-white/85">{won(r.price)}</span>
                <span className="text-right text-white/55">{r.quantity}주</span>
              </div>
            ))}
          </div>
          {/* 체결이 붙으면 폐기도 삭제도 «없다» — 없는 이유를 여기서 말한다 (4장 ⑤) */}
          {plan.status === 'RUNNING' && (
            <div className="mt-1.5 text-[10px] text-white/35">
              체결이 붙어 치울 수 없다 — 끝내는 길은 매도 계획이다
            </div>
          )}
        </Section>
      )}

      {plan.status === 'CLOSED' && (
        <Section title="폐기 사유">
          <div className="text-[12px] text-white/60">{plan.closeReason}</div>
        </Section>
      )}

      {/* 폐기 — 사유가 필수다. 판단에는 이유가 있다 (Q8) */}
      {close.target != null && (
        <div className="border-warning/30 mt-2.5 rounded-md border px-3 py-2.5">
          <div className="text-[11px] text-white/55">
            폐기 — <span className="text-white/80">안 가기로 한 것</span>이다.
            계획은 사라지지 않고 ⑦의 폐기 비율에 센다.
          </div>
          <textarea
            value={close.reason}
            onChange={(e) => close.setReason(e.target.value)}
            rows={2}
            autoFocus
            placeholder="왜 안 가기로 했는가"
            className="bg-bg-input mt-2 w-full resize-y rounded-md px-2.5 py-2 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Btn
              go
              onClick={close.doClose}
              disabled={!close.reason.trim() || close.pending}
            >
              {close.pending ? '폐기 중…' : '폐기'}
            </Btn>
            <Btn onClick={close.cancel}>취소</Btn>
            {!close.reason.trim() && (
              <span className="text-[11px] text-white/35">
                사유 없이 닫을 수 없다
              </span>
            )}
          </div>
        </div>
      )}

      {/* 삭제 — 잘못 적은 것. 사유를 안 받는다 (Q8) */}
      {remove.target != null && (
        <div className="border-brand-red/30 mt-2.5 rounded-md border px-3 py-2.5">
          <div className="text-[11px] leading-relaxed text-white/55">
            <span className="text-white/80">「{named(remove.target)}」</span> —
            잘못 적은 것이다. 행이 사라지고 ⑦가 «세지 않는다». 폐기와 달리
            판단이 아니라 기록을 고치는 것이라 사유를 안 받는다.
          </div>
          <div className="text-warning mt-1 text-[11px]">⚠ 되돌릴 수 없다</div>
          <div className="mt-2 flex items-center gap-1.5">
            <Btn go onClick={remove.confirm} disabled={remove.pending}>
              {remove.pending ? '삭제 중…' : '삭제한다'}
            </Btn>
            <Btn onClick={remove.cancel}>취소</Btn>
          </div>
        </div>
      )}
    </section>
  )
}

/** 읽는 값 한 칸 — 라벨은 작고 흐리게, 값은 입력칸과 같은 자리 · 크기 */
const Value = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-[10px] text-white/40">{label}</span>
    <span className="font-number py-1 text-[15px] text-white tabular-nums">
      {children}
    </span>
  </div>
)

/** 계획가와 실제 평단의 차이 */
function ActualVsPlan({ plan }: { plan: PlanDetail }) {
  const buys = plan.records.filter((r) => r.side === 'BUY')
  const qty = buys.reduce((n, r) => n + r.quantity, 0)
  if (!qty) return null
  const avg = buys.reduce((n, r) => n + r.price * r.quantity, 0) / qty
  const diff = ((avg - plan.entryPrice) / plan.entryPrice) * 100
  return (
    <div className="font-number text-[10px] text-white/50">
      평단 {won(Math.round(avg))} · 계획가 대비{' '}
      <span className={diff > 0 ? 'text-brand-red' : 'text-white/70'}>
        {diff > 0 ? '+' : ''}
        {diff.toFixed(2)}%
      </span>
    </div>
  )
}
