import { describe, expect, it } from 'vitest'
import type { PlanListItem } from '@/entities/plan'
import { liveSpan } from './planSpan'

const item = (over: Partial<PlanListItem>): PlanListItem => ({
  planId: 1,
  stockCode: '000660',
  stockName: 'SK하이닉스',
  title: '',
  status: 'DONE',
  writtenAt: '2026-08-18',
  entryPrice: 1_082_000,
  stopPrice: 1_030_000,
  quantity: 5,
  riskBefore: 0,
  riskAfter: 0,
  fillRate: 1,
  recordCount: 1,
  entryState: 'BREAKOUT',
  fundamentalScore: 5,
  previousPlanId: null,
  goals: [],
  initialStopWidth: null,
  ...over,
})

describe('Q12 고정한 과거 계획은 «살아 있던 구간»에만 그린다', () => {
  it('실행 완료는 이어받은 계획의 작성일에서 끝난다', () => {
    const done = item({ planId: 12, writtenAt: '2026-08-18' })
    const next = item({
      planId: 1,
      status: 'RUNNING',
      writtenAt: '2026-08-24',
      previousPlanId: 12,
    })
    expect(liveSpan(done, [done, next])).toEqual({
      from: '2026-08-18',
      to: '2026-08-24',
    })
  })

  it('실행 중 · 대기는 오른쪽 끝까지 — 새 계획을 쓰는 중이면 그날까지', () => {
    const run = item({ status: 'RUNNING', writtenAt: '2026-08-24' })
    expect(liveSpan(run, [run])).toEqual({ from: '2026-08-24', to: null })
    expect(liveSpan(run, [run], '2026-09-17')).toEqual({
      from: '2026-08-24',
      to: '2026-09-17',
    })
  })

  it('끝난 날을 모르면 두 주로 잡는다 — 0 폭이면 유령이 안 보인다', () => {
    const dropped = item({ status: 'CLOSED', writtenAt: '2026-08-12' })
    expect(liveSpan(dropped, [dropped])).toEqual({
      from: '2026-08-12',
      to: '2026-08-26',
    })
  })
})
