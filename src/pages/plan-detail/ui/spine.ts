import type { PlanListItem } from '@/entities/plan'

/**
 * 사슬의 **줄기**와 새 마디가 붙는 자리.
 *
 * 💀 이 파일이 있는 이유 — 사슬이 그리는 «유령 선의 끝»과 `useNewPlan` 이 실제로
 * 넣는 `previousPlanId` 가 **서로 다른 곳을 가리키고 있었다.** 선은 줄기 끝을
 * 가리키는데 계획은 「지금 보고 있는 계획」에 붙었다.
 *
 * 그러면 대기 계획을 보면서 만들 때 사고가 난다 — 갈래는 줄기 «끝»에서만 꺼내므로
 * 대기에 붙은 계획은 **사슬 어디에도 안 그려진다.** 만들었는데 화면에서 사라진다.
 *
 * 같은 답을 두 군데서 따로 내면 언젠가 어긋난다. 한 군데서 낸다.
 */

/** 「실제로 간 길」 — 실행 중 · 실행 완료만. 날짜 오름차순 */
export function walkedSpine(plans: PlanListItem[]): PlanListItem[] {
  return plans
    .filter((p) => p.status === 'RUNNING' || p.status === 'DONE')
    .sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))
}

/**
 * 새 마디가 붙는 곳 — **줄기의 끝**이다.
 *
 * 「지금 보고 있는 계획」이 아니다. ④-2 의 승계는 *「추가매수하면 새 계획을 세우고
 * 이전 계획은 실행 완료로 닫힌다」* 라 **실제로 간 길의 끝에서** 갈라진다.
 * 대기 계획에서 또 갈라지는 것은 「안 간 길에서 안 간 길」이라 사슬이 아니다.
 *
 * ⚠️ 줄기가 통째로 없으면(아직 아무것도 실행 안 함) 붙일 곳이 없다 — `null` 이다.
 */
export function attachPointId(plans: PlanListItem[]): number | null {
  return walkedSpine(plans).at(-1)?.planId ?? null
}
