import type { PlanListItem } from '@/entities/plan'

/**
 * **좁힌 사슬** — 기본으로 보일 마디와 「지난 계획」으로 접힐 마디를 가른다 (Q12).
 *
 * ```text
 * 실행 중이 있으면   직전 → 실행 중 → 대기
 * 실행 중이 없으면   가장 최근에 끝난 계획 → 대기
 * 늘 보이는 것       지금 보는 계획 · 팝오버에서 꺼낸 계획
 * ```
 *
 * 💀 사슬이 모든 계획을 «같은 무게로» 늘어놓아 14개 안팎이 떠 있었다. 계획을 세울 때
 * 실제로 참조하는 것은 실행 중 · 그 직전 · 대기뿐이다 — 나머지는 이력으로 남으면 된다(F6).
 */
export function narrowChain(
  plans: PlanListItem[],
  currentId: number | null,
  pulled: number[] = [],
): { shown: PlanListItem[]; hidden: PlanListItem[] } {
  const keep = new Set<number>()
  const running = plans.find((p) => p.status === 'RUNNING')

  if (running) {
    keep.add(running.planId)
    if (running.previousPlanId != null) keep.add(running.previousPlanId)
  } else {
    const lastEnded = plans
      .filter((p) => p.status === 'DONE' || p.status === 'CLOSED')
      .sort(
        (a, b) => b.writtenAt.localeCompare(a.writtenAt) || b.planId - a.planId,
      )[0]
    if (lastEnded) keep.add(lastEnded.planId)
  }
  for (const p of plans) if (p.status === 'PLANNED') keep.add(p.planId)
  if (currentId != null) keep.add(currentId)
  for (const id of pulled) keep.add(id)

  const byDate = (a: PlanListItem, b: PlanListItem) =>
    a.writtenAt.localeCompare(b.writtenAt) || a.planId - b.planId
  return {
    shown: plans.filter((p) => keep.has(p.planId)).sort(byDate),
    // 팝오버는 최근 것부터 — 찾는 계획은 대개 가까운 과거다
    hidden: plans
      .filter((p) => !keep.has(p.planId))
      .sort((a, b) => byDate(b, a)),
  }
}
