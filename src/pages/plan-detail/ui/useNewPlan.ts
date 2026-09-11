import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreatePlan } from '@/entities/plan'
import type { PlanCreate, PlanDetail, PlanListItem } from '@/entities/plan'
import { attachPointId } from './spine'

/**
 * 「이어서 세우기」 — 이 계획에서 **갈라져 나오는** 새 계획 (ⓐ-1).
 *
 * 왜 계획 싱글에서 세우나 — ④는 *「경로는 여럿이어도 도착지는 하나다 — 종목
 * 상세에서 현금과 위험노출을 보고 등록한다」* 인데, Q3 이후 **계획 싱글이 종목
 * 상세를 흡수했다.** 그리고 계획은 매매 단위이고 새 계획은 대개 **기존 판단의
 * 승계**라, 빈 화면에서 종목부터 고르는 것보다 여기가 자연스럽다.
 *
 * ```text
 * 종목        여기서 정해져 있다.  안 묻는다
 * previousPlanId   지금 계획.  승계가 곧 사슬의 화살표다 (④-2)
 * 스톱 규칙 셋      «직전 값이 채워져 있다» — 안 고치면 그대로 간다 (④-1-4)
 * 진입가·스톱가·수량  **비워 둔다.**  서비스가 값을 대신 정하지 않는다 (④-1-1-1)
 * ```
 */

/** ㉡ 사용자가 채우는 것만. 나머지는 세울 때 붙는다 */
export type NewPlanDraft = {
  title: string
  entryPrice: number
  stopPrice: number
  quantity: number
  memo: string
  /** 스톱 갱신 규칙 셋 (③-3 · ④-1-4). 직전 값이 채워져 오고, 고칠 수 있다 */
  raiseAtR: number | null
  trail50: boolean
  backstop: boolean
}

/**
 * 기존 계획에서 **이어받는 것과 비우는 것**을 여기서 가른다.
 *
 * ⚠️ 근거 날짜가 여기 «없다». 계획은 자율적으로 세우고, 스냅샷은 서버가
 *    그 시점 판정을 붙인다 — `PlanCreate` 주석에 이유를 적었다.
 *
 * 값(진입가·스톱가·수량)을 복사하면 그게 곧 「서비스가 제시한 값」이 된다 —
 * 사용자가 지우지 않고 그냥 저장하기 때문이다. 판단은 매번 새로 한다.
 */
/**
 * ⚠️ **스톱 규칙 셋은 «값을» 물려받는다.** ④-1-4 가 *「직전 값이 채워져 있다.
 *    안 고치면 그대로 유지된다」* 라, 비워 두면 매번 다시 정해야 한다.
 *    진입가·스톱가격·수량과 반대다 — 그쪽은 «판단»이라 매번 새로 하고,
 *    이쪽은 «규칙»이라 안 건드리면 이어진다.
 */
const from = (p?: PlanDetail): NewPlanDraft => ({
  title: '',
  entryPrice: 0,
  stopPrice: 0,
  quantity: 0,
  memo: '',
  // 이어받을 계획이 «없으면» 규칙도 물려받을 것이 없다 — 셋 다 꺼진 채로 시작한다
  raiseAtR: p?.plannedStop.raiseAtR ?? null,
  trail50: p?.plannedStop.trail50 ?? false,
  backstop: p?.plannedStop.backstop ?? false,
})

/**
 * @param stockCode  이 종목에 세운다. **계획이 하나도 없어도 된다**
 * @param siblings   같은 종목의 계획들 — 붙을 자리를 여기서 찾는다
 * @param parent     이어받을 계획. 없으면(첫 계획) 규칙도 물려받을 것이 없다
 */
export function useNewPlan(
  stockCode: string,
  siblings: PlanListItem[],
  parent?: PlanDetail,
) {
  const navigate = useNavigate()
  const create = useCreatePlan()
  const [draft, setDraft] = useState<NewPlanDraft | null>(null)

  const open = useCallback(() => setDraft(from(parent)), [parent])
  const cancel = useCallback(() => setDraft(null), [])
  const set = useCallback(
    <TKey extends keyof NewPlanDraft>(key: TKey, value: NewPlanDraft[TKey]) =>
      setDraft((d) => (d ? { ...d, [key]: value } : d)),
    [],
  )

  /**
   * 세울 수 있는 조건.
   *
   * **이름이 필수다** — 같은 종목에 시나리오가 여럿이면 값만 봐서는 사슬에서
   * 어느 마디인지 못 가른다. 진입가·스톱가·수량은 0 이면 계획이 아니다.
   */
  const ready =
    draft != null &&
    draft.title.trim().length > 0 &&
    draft.entryPrice > 0 &&
    draft.stopPrice > 0 &&
    draft.quantity > 0

  const submit = useCallback(() => {
    if (!draft || !ready) return
    const body: PlanCreate = {
      stockCode,
      title: draft.title.trim(),
      entryPrice: draft.entryPrice,
      stopPrice: draft.stopPrice,
      quantity: draft.quantity,
      memo: draft.memo,
      // 채워져 온 값을 «고칠 수 있다» (④-1-4)
      raiseAtR: draft.raiseAtR,
      trail50: draft.trail50,
      backstop: draft.backstop,
      /**
       * 승계 — **줄기의 끝**에서 갈라진다 (④-2).
       *
       * 💀 「지금 보고 있는 계획」에 붙였다가 사고가 났다. 대기 계획을 보면서
       * 만들면 그 계획에 붙는데, 사슬은 갈래를 줄기 «끝»에서만 꺼내므로
       * **만든 계획이 화면 어디에도 안 그려졌다.**
       *
       * 붙일 곳을 사슬과 «같은 함수»로 낸다 — 유령 선이 가리키는 그 자리다.
       * 줄기가 없으면(아직 아무것도 실행 안 함) 지금 계획에 붙인다.
       */
      previousPlanId: attachPointId(siblings) ?? parent?.planId ?? null,
    }
    create.mutate(body, {
      onSuccess: (next) => {
        setDraft(null)
        // 세운 계획으로 간다 — 사슬이 그 마디를 이미 들고 있다
        void navigate({
          to: '/stocks/$ticker/plan/$planId',
          params: {
            ticker: next.stockCode,
            planId: String(next.planId),
          },
        })
      },
    })
  }, [create, draft, navigate, stockCode, siblings, parent, ready])

  return {
    draft,
    open,
    cancel,
    set,
    submit,
    ready,
    pending: create.isPending,
    error: create.error,
  }
}
