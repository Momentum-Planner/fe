import { useCallback, useMemo, useState } from 'react'
import {
  needCash as calcNeedCash,
  oneR,
  riskAfter as calcRiskAfter,
  stopWidthPct,
} from '@/entities/plan'
import type { PlanDetail, PlanPatch } from '@/entities/plan'

/**
 * 편집 중인 계획.
 *
 * **산출값을 draft 로 다시 계산한다.** 저장을 눌러야 결과가 나오면
 * *「그 수량이 ③의 위험노출을 어디로 옮기는지 «보고» 정한다」*(④-1)가 성립하지 않는다.
 * 디자인 9장 ④ 의 조건과 같다 — *「조정하는 동안 대시보드가 즉시 따라오므로,
 * 손을 떼기 전에 결과를 본다」*.
 *
 * ⚠️ 계산은 `entities/plan/model/calc` 에서 온다. 화면이 따로 계산하면 저장 전
 *    미리보기와 저장 후 값이 어긋나고, 그 어긋남은 「내가 잘못 넣었나」로 읽힌다.
 */
export type Draft = {
  /** 사슬에서 이 마디를 가리키는 이름. 세우고 나서야 분명해지는 일이 잦다 */
  title: string
  entryPrice: number
  stopPrice: number
  quantity: number
  memo: string
  raiseAtR: number | null
  trail50: boolean
  backstop: boolean
}

const fromPlan = (p: PlanDetail): Draft => ({
  title: p.title,
  entryPrice: p.entryPrice,
  stopPrice: p.stopPrice,
  quantity: p.quantity,
  memo: p.memo,
  raiseAtR: p.plannedStop.raiseAtR,
  trail50: p.plannedStop.trail50,
  backstop: p.plannedStop.backstop,
})

/** 안 바뀐 값은 안 보낸다 — PATCH 는 「고친 것」만 담는다 */
function diff(p: PlanDetail, d: Draft): PlanPatch {
  const out: PlanPatch = {}
  if (d.title !== p.title) out.title = d.title
  if (d.entryPrice !== p.entryPrice) out.entryPrice = d.entryPrice
  if (d.stopPrice !== p.stopPrice) out.stopPrice = d.stopPrice
  if (d.quantity !== p.quantity) out.quantity = d.quantity
  if (d.memo !== p.memo) out.memo = d.memo
  if (d.raiseAtR !== p.plannedStop.raiseAtR) out.raiseAtR = d.raiseAtR
  if (d.trail50 !== p.plannedStop.trail50) out.trail50 = d.trail50
  if (d.backstop !== p.plannedStop.backstop) out.backstop = d.backstop
  return out
}

export function usePlanDraft(plan: PlanDetail) {
  const [draft, setDraft] = useState<Draft | null>(null)

  const begin = useCallback(() => setDraft(fromPlan(plan)), [plan])
  const cancel = useCallback(() => setDraft(null), [])
  const set = useCallback(
    <TKey extends keyof Draft>(key: TKey, value: Draft[TKey]) =>
      setDraft((d) => (d ? { ...d, [key]: value } : d)),
    [],
  )

  /** 지금 화면이 «보여줄» 값 — 편집 중이면 draft, 아니면 저장된 계획 */
  const shown = draft ?? fromPlan(plan)

  const derived = useMemo(() => {
    const { entryPrice, stopPrice, quantity } = shown
    return {
      stopWidth: stopWidthPct(entryPrice, stopPrice),
      oneR: oneR(entryPrice, stopPrice),
      needCash: calcNeedCash(entryPrice, quantity),
      riskAfter: calcRiskAfter(
        plan.riskBefore,
        entryPrice,
        stopPrice,
        quantity,
        plan.accountTotal,
      ),
    }
  }, [shown, plan.riskBefore, plan.accountTotal])

  const patch = draft ? diff(plan, draft) : {}
  const dirty = Object.keys(patch).length > 0

  return {
    editing: draft != null,
    shown,
    derived,
    patch,
    dirty,
    begin,
    cancel,
    set,
  }
}
