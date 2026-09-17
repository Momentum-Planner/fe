import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  PLAN_STATUS_LABEL,
  goalPrice,
  goalsProblem,
  priceConflict,
  useUpdatePlan,
} from '@/entities/plan'
import type { PlanDetail } from '@/entities/plan'
import { RLadder, RTerm } from './RHelp'
import { StopLadderEditor, StopLadderView } from './StopLadder'
import { StopPickPanel } from './StopPickPanel'
import type { PickChoice, pickOptionsOf } from './StopPickPanel'
import { LIT_PANEL } from './panel'
import {
  Btn,
  CandidateList,
  Foot,
  MoneyField,
  Pair,
  Section,
  StopField,
  stopWidthText,
  won,
} from './planParts'
import type { usePlanClose, usePlanRemove } from './usePlanRetire'
import { lockedGoals } from './usePlanDraft'
import type { usePlanDraft } from './usePlanDraft'

/**
 * 계획 하나를 **보고 고치는** 카드 — 새 계획 폼과 **같은 섹션**이다 (Q12).
 *
 * ```text
 * 머리   상태 · 이름 · 수정
 * 고르기  사다리 목표에 닿았으면 — 스톱을 옮길 자리 (Q16)
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
  pick,
  choice,
  onChoice,
  draft,
  close,
  remove,
  named,
}: {
  plan: PlanDetail
  /** 고를 차례 단의 후보 — 있으면 카드 맨 위에 고르기가 선다 (Q16 7) */
  pick: ReturnType<typeof pickOptionsOf>
  /** 고른 자리 — 페이지가 든다. 차트가 같은 값에 「새 스톱」 선을 긋는다 */
  choice: PickChoice | null
  onChoice: (next: PickChoice | null) => void
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
  /**
   * 1R 의 % — **처음 1R 로** 잰다. 실행된 계획은 스톱을 본전 · +1R 로 올려도 1R 이 안 변한다 (③-2-1).
   * 💀 지금 스톱으로 쟀더니 올린 계획에 「1R 40,000 · −3.57%」 처럼 음수가 떴다.
   */
  const oneRPct =
    plan.initialStopWidth != null && shown.entryPrice > 0
      ? (plan.initialStopWidth / shown.entryPrice) * 100
      : width
  // 스톱이 진입가 이상이면 1R 이 성립하지 않는다 — 음수를 보이지 않고 비운다 (저장은 막힌다)
  const oneRText =
    oneR > 0 ? (
      <>
        <RTerm>1R</RTerm> {won(oneR)} · {oneRPct.toFixed(2)}%
      </>
    ) : (
      <>
        <RTerm>1R</RTerm> —
      </>
    )
  const cashBlock =
    editing && seenQty * shown.entryPrice > plan.accountCash
      ? `✕ 현금 ${won(plan.accountCash)} 보다 ${won(seenQty * shown.entryPrice - plan.accountCash)} 크다`
      : undefined
  /** 목표 — 사다리의 «다음» 단 가격 (처음 1R 기준). 차트도 이 하나만 그린다 (Q16 8) */
  const nextR = shown.goals[0] ?? null
  const goal =
    nextR != null
      ? goalPrice(
          shown.entryPrice,
          shown.stopPrice,
          nextR,
          plan.initialStopWidth,
        )
      : null
  const locked = lockedGoals(plan)
  // 목표 > 진입 > 스톱 · 사다리는 오름차순 — 고칠 때 막는다 (저장이 꺼진다)
  const conflict = editing
    ? (priceConflict(
        shown.entryPrice,
        shown.stopPrice,
        goal,
        plan.initialStopWidth,
      ) ?? goalsProblem([...locked.map((g) => g.r), ...shown.goals]))
    : null
  const stopWarn =
    width > HARD_LIMIT
      ? `⚠ 손절폭 ${HARD_LIMIT}% 초과 — 포기하는 자리다`
      : width > plan.stopLimit
        ? `⚠ 상한 ${plan.stopLimit}% 초과`
        : undefined

  const chosenStop = plan.stopCandidates.find(
    (c) => c.price === shown.stopPrice,
  )
  return (
    <section className={cn(LIT_PANEL, 'min-w-0 px-4 py-4')}>
      {/* 머리 — 흐름을 바꾸는 셋(이어서 세우기 · 폐기 · 삭제)은 사슬이 문이다. 여기는 수정뿐 */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-[12px] font-bold',
            plan.status === 'RUNNING'
              ? 'bg-brand-red/15 text-brand-red'
              : plan.status === 'PLANNED'
                ? 'bg-brand-blue/15 text-brand-blue'
                : 'bg-white/[0.08] text-white/70',
          )}
        >
          {PLAN_STATUS_LABEL[plan.status]}
        </span>
        <span className="truncate text-[15px] font-bold text-white">
          {plan.title}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {editing ? (
            <>
              <Btn
                go
                onClick={() => update.mutate(patch, { onSuccess: cancel })}
                disabled={!dirty || conflict != null || update.isPending}
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
      <div className="font-number mt-1 text-[11px] text-white/30">
        {plan.writtenAt} 작성
      </div>

      {/* 목표 닿음 — 카드 «맨 위». 고치는 중에는 접는다 (값이 흔들리는 중이다) */}
      {pick && !editing && (
        <StopPickPanel
          plan={plan}
          pick={pick}
          value={choice}
          onChange={onChoice}
        />
      )}

      {/* ② 1R */}
      <Section title="② 1R">
        {editing ? (
          <Pair
            left={
              <MoneyField
                label="진입 예상가"
                value={shown.entryPrice}
                onChange={(n) => set('entryPrice', n)}
                onBlur={() => undefined}
              />
            }
            right={
              <StopField
                entry={shown.entryPrice}
                value={shown.stopPrice}
                onChange={(n) => set('stopPrice', n)}
                onBlur={() => undefined}
                block={conflict ?? undefined}
                warn={stopWarn}
              />
            }
          />
        ) : (
          <Pair
            left={
              <>
                <Value label="진입 예상가">{won(shown.entryPrice)}</Value>
                {/* 1R 은 진입가에서 재는 값이라 진입가 밑에 */}
                <Foot>{oneRText}</Foot>
              </>
            }
            right={
              <>
                <Value label="스톱가격">{won(shown.stopPrice)}</Value>
                {/* 어느 후보에서 왔나 — 숫자 «바로 밑»에 (2026-09-17).
                    💀 섹션 아래 따로 떨어진 한 줄이었더니 무엇의 값인지 안 읽혔다 */}
                <Foot>
                  {chosenStop
                    ? `${chosenStop.label} ${stopWidthText(chosenStop.width)}`
                    : ''}
                </Foot>
              </>
            }
          />
        )}
        <div className="mt-1 flex items-baseline justify-between text-[11px]">
          {editing && (
            <span className="font-number text-white/45">{oneRText}</span>
          )}
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
          <div className="text-warning mt-0.5 text-[11px]">{stopWarn}</div>
        )}
        {/* 후보 목록은 «고칠 때»만 편다. 읽을 때는 고른 후보가 스톱가격 밑에 선다 */}
        {editing && (
          <CandidateList
            limit={plan.stopLimit}
            items={plan.stopCandidates}
            chosen={shown.stopPrice}
            onPick={(price) => set('stopPrice', price)}
          />
        )}
      </Section>

      {/* ③ 규모 — 수량은 진입가 아래, 위험노출은 스톱가격 아래 */}
      <Section title="③ 규모">
        <Pair
          left={
            <>
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
              <Foot>필요 현금 {won(derived.needCash)}</Foot>
            </>
          }
          right={
            <>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-number text-[11px] text-white/40">
                  위험노출 {plan.riskBefore.toFixed(2)}% →
                </span>
                <span
                  className={cn(
                    't-stat font-number leading-tight',
                    derived.riskAfter > RISK_WARN
                      ? 'text-warning'
                      : 'text-white',
                  )}
                >
                  {derived.riskAfter.toFixed(2)}%
                </span>
              </div>
              {/* 분모가 분자 곁에 선다 (Q12). 이 계획이 등록할 때 «얼린» 값이다 (F7) */}
              <Foot>
                ÷ 계좌 총액 {won(plan.accountTotal)}
                <span className="font-text ml-1 text-white/25">등록 시점</span>
              </Foot>
            </>
          }
        />
      </Section>

      {/* ④ 스톱 갱신 규칙 — 스톱 사다리 (Q16). 닿은 단은 잠기고, 안 닿은 단만 고친다 */}
      <Section
        title="④ 스톱 갱신 규칙"
        tail={
          <RLadder
            entryPrice={shown.entryPrice}
            oneR={oneR}
            goalR={shown.goals[0] ?? null}
          />
        }
      >
        {editing ? (
          <StopLadderEditor
            value={shown.goals}
            locked={locked}
            onChange={(next) => set('goals', next)}
            entryPrice={shown.entryPrice}
            stopPrice={shown.stopPrice}
            initialStopWidth={plan.initialStopWidth}
          />
        ) : (
          <StopLadderView
            goals={plan.plannedStop.goals}
            entryPrice={plan.entryPrice}
            stopPrice={plan.stopPrice}
            initialStopWidth={plan.initialStopWidth}
          />
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
            className="bg-bg-input w-full resize-y rounded-md px-2.5 py-2 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
          />
        ) : plan.memo ? (
          <div className="text-[13px] leading-relaxed text-white/65">
            {plan.memo}
          </div>
        ) : (
          <div className="text-[12px] text-white/25">메모 없음</div>
        )}
      </Section>

      {/* 체결 — 실행된 계획이면 «실제»가 답이다 */}
      {walked && plan.records.length > 0 && (
        <Section
          title="체결"
          tail={
            <span className="font-number text-[11px] font-normal text-white/50">
              {plan.recordCount}건 · 체결률 {Math.round(plan.fillRate * 100)}%
            </span>
          }
        >
          <ActualVsPlan plan={plan} />
          <div className="mt-1 flex flex-col">
            {plan.records.map((r) => (
              <Pair
                key={r.recordId}
                className="font-number py-0.5 text-[12px]"
                left={
                  <div className="flex justify-between">
                    <span className="text-white/40">{r.filledAt.slice(5)}</span>
                    <span className="text-white/55">
                      {r.side === 'BUY' ? '매수' : '매도'}
                    </span>
                  </div>
                }
                right={
                  <div className="flex justify-between">
                    <span className="text-white/85">{won(r.price)}</span>
                    <span className="text-white/55">{r.quantity}주</span>
                  </div>
                }
              />
            ))}
          </div>
          {/* 체결이 붙으면 폐기도 삭제도 «없다» — 없는 이유를 여기서 말한다 (4장 ⑤) */}
          {plan.status === 'RUNNING' && (
            <div className="mt-1.5 text-[11px] text-white/35">
              체결이 붙어 치울 수 없다 — 끝내는 길은 매도 계획이다
            </div>
          )}
        </Section>
      )}

      {plan.status === 'CLOSED' && (
        <Section title="폐기 사유">
          <div className="text-[13px] text-white/60">{plan.closeReason}</div>
        </Section>
      )}

      {/* 폐기 — 사유가 필수다. 판단에는 이유가 있다 (Q8) */}
      {close.target != null && (
        <div className="border-warning/30 mt-2.5 rounded-md border px-3 py-2.5">
          <div className="text-[12px] text-white/55">
            폐기 — <span className="text-white/80">안 가기로 한 것</span>이다.
            계획은 사라지지 않고 ⑦의 폐기 비율에 센다.
          </div>
          <textarea
            value={close.reason}
            onChange={(e) => close.setReason(e.target.value)}
            rows={2}
            autoFocus
            placeholder="왜 안 가기로 했는가"
            className="bg-bg-input mt-2 w-full resize-y rounded-md px-2.5 py-2 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
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
              <span className="text-[12px] text-white/35">
                사유 없이 닫을 수 없다
              </span>
            )}
          </div>
        </div>
      )}

      {/* 삭제 — 잘못 적은 것. 사유를 안 받는다 (Q8) */}
      {remove.target != null && (
        <div className="border-brand-red/30 mt-2.5 rounded-md border px-3 py-2.5">
          <div className="text-[12px] leading-relaxed text-white/55">
            <span className="text-white/80">「{named(remove.target)}」</span> —
            잘못 적은 것이다. 행이 사라지고 ⑦가 «세지 않는다». 폐기와 달리
            판단이 아니라 기록을 고치는 것이라 사유를 안 받는다.
          </div>
          <div className="text-warning mt-1 text-[12px]">⚠ 되돌릴 수 없다</div>
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
    <span className="text-[11px] text-white/40">{label}</span>
    <span className="font-number py-1 text-[16px] text-white tabular-nums">
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
    <div className="font-number text-[11px] text-white/50">
      평단 {won(Math.round(avg))} · 계획가 대비{' '}
      <span className={diff > 0 ? 'text-brand-red' : 'text-white/70'}>
        {diff > 0 ? '+' : ''}
        {diff.toFixed(2)}%
      </span>
    </div>
  )
}
