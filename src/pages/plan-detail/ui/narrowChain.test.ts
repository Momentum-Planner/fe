import { describe, expect, it } from 'vitest'
import type { PlanListItem } from '@/entities/plan'
import { narrowChain } from './narrowChain'

const p = (
  planId: number,
  status: PlanListItem['status'],
  writtenAt: string,
  previousPlanId: number | null = null,
): PlanListItem => ({
  planId,
  stockCode: '000660',
  stockName: 'SK하이닉스',
  title: `계획 ${planId}`,
  status,
  writtenAt,
  entryPrice: 1,
  stopPrice: 1,
  quantity: 1,
  riskBefore: 0,
  riskAfter: 0,
  fillRate: 0,
  recordCount: 0,
  entryState: 'BREAKOUT',
  fundamentalScore: 5,
  previousPlanId,
  raise: { kind: 'R', r: 2 },
})

const SK = [
  p(7, 'CLOSED', '2026-06-02'),
  p(8, 'DONE', '2026-07-14'),
  p(11, 'DONE', '2026-08-11', 8),
  p(12, 'DONE', '2026-08-18', 11),
  p(1, 'RUNNING', '2026-08-24', 12),
  p(9, 'PLANNED', '2026-09-08', 1),
  p(15, 'PLANNED', '2026-09-07', 1),
]
const ids = (l: PlanListItem[]) => l.map((x) => x.planId)

describe('Q12 좁힌 사슬', () => {
  it('실행 중이 있으면 — 직전 → 실행 중 → 대기', () => {
    const { shown, hidden } = narrowChain(SK, 1)
    expect(ids(shown)).toEqual([12, 1, 15, 9])
    // 지난 계획은 최근 것부터
    expect(ids(hidden)).toEqual([11, 8, 7])
  })

  it('실행 중이 없으면 — 가장 최근에 끝난 계획이 기준점이다', () => {
    const plans = [
      p(1, 'DONE', '2026-05-10'),
      p(2, 'DONE', '2026-06-20', 1),
      p(3, 'CLOSED', '2026-07-15'),
      p(4, 'DONE', '2026-08-01', 2),
      p(5, 'PLANNED', '2026-09-10', 4),
    ]
    expect(ids(narrowChain(plans, 5).shown)).toEqual([4, 5])
  })

  it('지금 보는 계획과 팝오버에서 꺼낸 계획은 늘 보인다', () => {
    expect(ids(narrowChain(SK, 8, [7]).shown)).toEqual([7, 8, 12, 1, 15, 9])
  })
})
