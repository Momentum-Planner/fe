import type { PlanListItem } from '@/entities/plan'

/**
 * **좁힌 사슬** — 기본으로 보일 마디와 「지난 계획」으로 접힐 마디를 가른다 (Q12).
 *
 * ```text
 * 실행 중이 있으면   직전 → 실행 중 → 대기
 * 실행 중이 없으면   가장 최근에 끝난 계획 → 대기
 * 대기              최근 것부터 둘 — 나머지는 「대기 +N」 팝오버 안
 * 늘 보이는 것       지금 보는 계획 · 팝오버에서 꺼낸 계획
 * ```
 *
 * 💀 대기는 세로로 쌓인다. 셋 넘게 쌓이면 사슬 카드가 한 칸에 34px 씩 길어져 차트를
 *    밀어냈다 (2026-09-17). 「지난 계획」과 같은 방식으로 접는다 — 높이가 두 칸에서 멈춘다.
 *
 * 💀 사슬이 모든 계획을 «같은 무게로» 늘어놓아 14개 안팎이 떠 있었다. 계획을 세울 때
 * 실제로 참조하는 것은 실행 중 · 그 직전 · 대기뿐이다 — 나머지는 이력으로 남으면 된다(F6).
 */
/** 사슬에 펼쳐 두는 대기 수 — 넘치면 「대기 +N」 팝오버로 접는다 */
export const WAIT_LIMIT = 2

export function narrowChain(
  plans: PlanListItem[],
  currentId: number | null,
  pulled: number[] = [],
): {
  shown: PlanListItem[]
  hidden: PlanListItem[]
  waiting: PlanListItem[]
} {
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
  const byDate = (a: PlanListItem, b: PlanListItem) =>
    a.writtenAt.localeCompare(b.writtenAt) || a.planId - b.planId
  const waits = plans
    .filter((p) => p.status === 'PLANNED')
    .sort((a, b) => byDate(b, a))
  for (const p of waits.slice(0, WAIT_LIMIT)) keep.add(p.planId)
  if (currentId != null) {
    keep.add(currentId)
    // 지금 보는 계획의 «부모»도 — 없으면 뿌리로 떨어져 어디서 갈라졌는지 안 보였다 (폐기 · 지난 계획)
    const cur = plans.find((p) => p.planId === currentId)
    if (cur?.previousPlanId != null) keep.add(cur.previousPlanId)
  }
  for (const id of pulled) keep.add(id)

  const folded = (p: PlanListItem) => !keep.has(p.planId)
  return {
    shown: plans.filter((p) => keep.has(p.planId)).sort(byDate),
    // 팝오버는 최근 것부터 — 찾는 계획은 대개 가까운 과거다
    hidden: plans
      .filter((p) => p.status !== 'PLANNED' && folded(p))
      .sort((a, b) => byDate(b, a)),
    waiting: waits.filter(folded),
  }
}
