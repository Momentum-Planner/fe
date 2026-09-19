import type { PlanListItem } from '@/entities/plan'

/**
 * 과거 계획이 **살아 있던 날짜 구간** — 새 계획을 쓰며 고정한 과거 계획이 이 구간에만 그려진다 (Q12).
 *
 * ```text
 * 대기 · 실행 중         작성일 → 오른쪽 끝          (지금도 살아 있다)
 *                       단, 새 계획을 쓰는 중이면 → 그 계획이 시작하는 날
 * 실행 완료 · 폐기        작성일 → 이어받은 계획의 작성일
 * 이어받은 계획이 없으면   작성일 → +14일
 * ```
 *
 * ⚠️ **끝난 날짜가 모델에 없다.** 실행 완료는 «승계» 또는 «보유수량 0» 이 닫는데
 *    (④-2), 닫힌 날을 따로 안 든다. 승계면 다음 계획의 작성일이 곧 그날이고,
 *    아니면 모른다 — 그때는 두 주로 잡는다. 0 폭이면 유령이 아예 안 보인다.
 */
export function liveSpan(
  p: PlanListItem,
  siblings: PlanListItem[],
  until: string | null = null,
): { from: string; to: string | null } {
  if (p.status === 'PLANNED' || p.status === 'RUNNING')
    return { from: p.writtenAt, to: until }

  const next = siblings
    .filter((s) => s.previousPlanId === p.planId && s.writtenAt >= p.writtenAt)
    .sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))[0]
  if (next) return { from: p.writtenAt, to: next.writtenAt }

  const [y = 0, m = 1, d = 1] = p.writtenAt.split('-').map(Number)
  const end = new Date(Date.UTC(y, m - 1, d + 14)).toISOString().slice(0, 10)
  return { from: p.writtenAt, to: end }
}
