import { describe, expect, it } from 'vitest'
import { PLANS, attachFill, editFill, removeFill } from './plans'

const byId = (id: number) => PLANS.find((p) => p.planId === id)!

/** 체결이 붙으면 계획 상태가 따라 움직인다 (Q22) */
describe('attachFill — 체결을 계획에 붙인다', () => {
  it('대기에 매수하면 실행 중이 되고 1R 이 박힌다', () => {
    const p = byId(2)
    expect(p.status).toBe('PLANNED')
    attachFill(2, {
      side: 'BUY',
      price: p.entryPrice,
      quantity: 10,
      filledAt: '2026-09-18',
    })
    const after = byId(2)
    expect(after.status).toBe('RUNNING')
    expect(after.initialStopWidth).toBeGreaterThan(0)
    expect(after.records.at(-1)?.side).toBe('BUY')
  })

  it('같은 종목에 새 계획으로 추가 매수하면 원래 실행 중은 실행 완료로 닫힌다', () => {
    // 삼성전자 — 방금 2 가 실행 중이 됐다. 대기 3 에 매수한다
    attachFill(3, {
      side: 'BUY',
      price: byId(3).entryPrice,
      quantity: 5,
      filledAt: '2026-09-19',
    })
    expect(byId(3).status).toBe('RUNNING')
    expect(byId(2).status).toBe('DONE')
  })

  it('이 계획이 산 만큼 다 팔면 실행 완료', () => {
    attachFill(3, {
      side: 'SELL',
      price: byId(3).entryPrice + 1000,
      quantity: 5,
      filledAt: '2026-09-20',
    })
    expect(byId(3).status).toBe('DONE')
    expect(byId(3).realized).toBeGreaterThan(0)
  })
})

/** 고치거나 지우면 상태가 체결에서 다시 나온다 (Q23 ⑤) */
describe('editFill · removeFill — 되돌릴 길', () => {
  it('실행 중이 된 계획의 매수를 지우면 대기로 돌아간다', () => {
    const p = byId(6)
    expect(p.status).toBe('PLANNED')
    attachFill(
      6,
      { side: 'BUY', price: p.entryPrice, quantity: 3, filledAt: '2026-09-21' },
      9001,
    )
    expect(byId(6).status).toBe('RUNNING')
    removeFill(9001)
    expect(byId(6).status).toBe('PLANNED')
    expect(byId(6).initialStopWidth).toBeNull()
  })

  it('다 판 매도의 수량을 줄이면 다시 실행 중', () => {
    const p = byId(6)
    attachFill(
      6,
      { side: 'BUY', price: p.entryPrice, quantity: 4, filledAt: '2026-09-21' },
      9002,
    )
    attachFill(
      6,
      {
        side: 'SELL',
        price: p.entryPrice,
        quantity: 4,
        filledAt: '2026-09-22',
      },
      9003,
    )
    expect(byId(6).status).toBe('DONE')
    editFill(9003, { quantity: 2 })
    expect(byId(6).status).toBe('RUNNING')
  })
})
