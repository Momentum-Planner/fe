import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useClosePlan, useDeletePlan } from '@/entities/plan'

/**
 * 계획을 «치우는» 두 행위 (Q8).
 *
 * **훅이 둘인 것이 이 파일의 요점이다.** 하나로 묶으면 화면이 둘을 같은 버튼으로
 * 쓰게 되는데, ③-2-3 이 현금에서 이미 같은 것을 갈라 놨다 —
 * *「돈이 들어온 것과 «잘못 적은 것»을 나중에 구분할 수 없으면, 기록이 자꾸
 * 틀리는지 실제로 입출금이 잦은지를 못 읽는다」*.
 *
 * ```text
 * 폐기   안 가기로 했다 (판단)       사유 필수 · 행이 남는다 · ⑦가 «센다»
 * 삭제   애초에 없어야 했다 (정정)    사유 없음 · 행이 사라진다 · ⑦가 «안 센다»
 * ```
 *
 * **대상을 상태로 든다.** 문이 사슬에 있으므로(Q8) 지금 보는 계획이 아니라
 * «누른 마디»를 치운다 — 훅이 계획 하나에 묶여 있으면 옆 마디를 못 닫는다.
 */

/**
 * 폐기 — 사유를 받는다.
 *
 * 사유를 «받고 나서» 닫는 두 단계인 이유는, 폐기 비율이 ⑦의 지표이기 때문이다.
 * 버튼 하나로 즉시 닫으면 이유 없는 행이 쌓이고 그 비율이 아무것도 못 말한다.
 */
export function usePlanClose() {
  const close = useClosePlan()
  const [target, setTarget] = useState<number | null>(null)
  const [reason, setReason] = useState('')

  const openFor = useCallback((planId: number) => {
    setReason('')
    setTarget(planId)
  }, [])
  const cancel = useCallback(() => setTarget(null), [])

  const doClose = useCallback(() => {
    const r = reason.trim()
    if (!r || target == null) return
    close.mutate(
      { planId: target, closeReason: r },
      { onSuccess: () => setTarget(null) },
    )
  }, [close, reason, target])

  return {
    target,
    openFor,
    cancel,
    reason,
    setReason,
    doClose,
    pending: close.isPending,
    error: close.error,
  }
}

/**
 * 삭제 — 사유를 «안 받는다». 사유가 없는 게 사유다.
 *
 * **되돌릴 수 없는 유일한 행위라 확인을 한 번 거친다.** 지금 보고 있는 계획을
 * 지웠으면 그 화면에 머무를 수 없으므로 컬렉션으로 나간다 — 옆 마디를 지운
 * 것이면 제자리에 남는다.
 */
export function usePlanRemove(currentId: number) {
  const navigate = useNavigate()
  const remove = useDeletePlan()
  const [target, setTarget] = useState<number | null>(null)

  const confirm = useCallback(() => {
    if (target == null) return
    remove.mutate(target, {
      onSuccess: () => {
        const leaving = target === currentId
        setTarget(null)
        // 지운 계획의 화면에는 머무를 수 없다 — 계획 컬렉션으로 나간다
        if (leaving) void navigate({ to: '/plans' })
      },
    })
  }, [remove, target, currentId, navigate])

  return {
    target,
    askFor: useCallback((planId: number) => setTarget(planId), []),
    cancel: useCallback(() => setTarget(null), []),
    confirm,
    pending: remove.isPending,
    error: remove.error,
  }
}
