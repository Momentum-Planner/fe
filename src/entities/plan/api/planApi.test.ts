import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from 'mocks/server'
import { planApi } from './planApi'
import type { PlanCreate } from '../model/types'

/**
 * `planApi` 층 자체를 지난다.
 *
 * 💀 `mocks/handlers.test.ts` 는 `fetch` 를 «직접» 불러서 이 층을 건너뛴다.
 * 그래서 `update` 가 본문을 `{ json: patch }` 로 감싸 보내던 동안 — 서버가
 * 필드를 하나도 못 읽고 기존값을 되돌려 주던 동안 — **36건이 전부 초록이었다.**
 * 저장은 조용히 아무것도 안 고쳤고 에러도 안 났다.
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BLANK: PlanCreate = {
  stockCode: '000660',
  title: 'api 층 테스트',
  entryPrice: 1_200_000,
  stopPrice: 1_150_000,
  quantity: 5,
  memo: '',
  goals: [2],
  previousPlanId: null,
}

describe('planApi — 본문이 실제로 나간다', () => {
  it('create 의 입력이 «그대로» 도착한다', async () => {
    const p = await planApi.create(BLANK)
    expect(p.entryPrice).toBe(1_200_000)
    expect(p.stopPrice).toBe(1_150_000)
    expect(p.quantity).toBe(5)
    expect(p.plannedStop.goals.map((g) => g.r)).toEqual([2])
  })

  it('update 가 «실제로 고친다»', async () => {
    const p = await planApi.create(BLANK)
    const next = await planApi.update(p.planId, {
      quantity: 9,
      entryPrice: 1_300_000,
    })
    expect(next.quantity).toBe(9)
    expect(next.entryPrice).toBe(1_300_000)
    // 파생도 따라온다 — 목과 화면이 같은 식을 써야 한다
    expect(next.riskAfter).not.toBe(p.riskAfter)
  })

  it('close 의 사유가 도착한다', async () => {
    const p = await planApi.create(BLANK)
    const next = await planApi.close(p.planId, { closeReason: '거래량 미달' })
    expect(next.status).toBe('CLOSED')
    expect(next.closeReason).toBe('거래량 미달')
  })

  it('remove 는 행을 없앤다', async () => {
    const p = await planApi.create(BLANK)
    await planApi.remove(p.planId)
    await expect(planApi.getDetail(p.planId)).rejects.toThrow()
  })
})
