import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { server } from 'mocks/server'
import { closeFill, openFill } from './fill'
import { PlansPage } from './PlansPage'

/**
 * 계획 컬렉션이 **실제로 떠지는지** 본다.
 *
 * 💀 `noUncheckedIndexedAccess` 를 켜면서 이 화면의 그룹 묶는 부분을 고쳤다 —
 * `head: sorted[0]` 이 `undefined` 를 끼게 되어 «빈 그룹을 걸러내는» 단계가
 * 하나 늘었다. 로직을 건드렸으니 목록이 여전히 서는지가 확인돼야 한다.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
  useNavigate: () => () => Promise.resolve(),
}))

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  act(() => closeFill())
})
afterAll(() => server.close())

const draw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PlansPage />
    </QueryClientProvider>,
  )
}

describe('거래 계획 — 계획 하나 = 카드 하나 · 거르기로 가른다 (Q23 · 4장 ③)', () => {
  it('거르기 넷이 한 줄 · 처음은 「실행 중」 · 목표 | 진입 | 손절 세 칸', async () => {
    draw()
    await screen.findAllByText('SK하이닉스')
    for (const name of ['실행 중', '대기', '완료', '폐기'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '실행 중' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getAllByText('진입').length).toBeGreaterThan(0)
    // 회색은 칸마다 하나 — 손절 옆엔 손절폭 % 만
    expect(screen.getAllByText(/^[−+]?\d+\.\d%$/).length).toBeGreaterThan(0)
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument()
  })

  it('「대기」 는 따로 — 종목끼리 판으로 묶지 않고 카드마다 이름', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '대기' }))
    // 삼성전자 대기 둘 — 줄 둘에 이름이 각각 · 붙어 서고 둘째 줄 이름은 흐리다 (줄 4장 ④)
    const sam = screen.getAllByText('삼성전자')
    expect(sam).toHaveLength(2)
    const first = sam[0]!.closest('article')!
    expect(first.nextElementSibling).toBe(sam[1]!.closest('article'))
    expect(sam[1]).toHaveClass('text-white/30')
    expect(screen.queryByRole('region', { name: '삼성전자' })).toBeNull()
  })

  it('「완료」 는 결과 거르기(모두 · 이익 · 손실) + 정렬 · 「폐기」 는 따로', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '완료' }))
    expect(screen.getByRole('button', { name: '모두' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('카카오')).toBeInTheDocument()
    expect(screen.getByText('정렬')).toBeInTheDocument()
    // 손실만 — 카카오(이익) 는 빠진다
    await user.click(screen.getByRole('button', { name: '손실' }))
    expect(screen.queryByText('카카오')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ 체결' })).toBeNull()
    await user.click(screen.getByRole('button', { name: '폐기' }))
    expect(screen.getByText('에스엠')).toBeInTheDocument()
  })

  it('카드의 「+ 체결」 은 오른쪽 칸을 그 계획이 골라진 채로 연다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.click(screen.getAllByRole('button', { name: '+ 체결' })[0]!)
    const panel = screen.getByText('체결 기록').closest('section')!
    // 종목이 이미 골라져 있다 — 종목 입력칸이 없다
    expect(within(panel).queryByLabelText('종목')).not.toBeInTheDocument()
    // 실행 중 카드는 구분을 비워 둔다 — 고르기 전엔 체결 칸이 안 열린다 (10장 E)
    expect(within(panel).queryByText('체결가')).not.toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: '매도' }))
    expect(within(panel).getByText('체결가')).toBeInTheDocument()
  })

  it('위 「+ 체결 기록」 은 빈 채로 연다 — 종목부터 고른다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '+ 체결 기록' }))
    expect(screen.getByLabelText('종목')).toBeInTheDocument()
  })

  it('Esc 로 체결 칸을 닫는다 (4장 ⑥ 서랍)', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    act(() => openFill())
    expect(screen.getByLabelText('종목')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('종목')).not.toBeInTheDocument()
  })

  it('지금 어디쯤 — 줄마다 전날 종가와 「손절까지 −x%」 (줄 배치 A)', async () => {
    draw()
    await screen.findAllByText('SK하이닉스')
    expect(
      screen.getAllByText(/^손절까지 [−+]?\d+\.\d%$/).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('현재가').length).toBeGreaterThan(0)
  })
})

describe('실행 중 순서 — 손절에 닿으면 가장 많이 잃는 것부터 (9장 ①)', () => {
  it('atStop 은 (손절 − 진입) × 수량이다 — 본전 이상이면 0 이상', async () => {
    const { atStop } = await import('./PlansPage')
    const p = { entryPrice: 201_000, stopPrice: 190_000, quantity: 20 }
    expect(atStop(p as never)).toBe(-220_000)
    expect(atStop({ ...p, stopPrice: 201_000 } as never)).toBe(0)
  })
})

describe('끝난 계획 정렬 — 손익 · 수익률 · 최근 (7장 ②)', () => {
  const a = { realized: 690_000, realizedPct: 5, writtenAt: '2026-08-01' }
  const b = { realized: 310_000, realizedPct: 15, writtenAt: '2026-09-01' }
  it('이익 — 손익이면 큰 돈, 수익률이면 큰 % 가 앞 · 최근이면 날짜', async () => {
    const { sortFor } = await import('./PlansPage')
    const order = (s: 'PNL' | 'PCT' | 'RECENT') =>
      ([a, b] as never[]).sort(sortFor('WIN', s)).map((x) => x === a)
    expect(order('PNL')).toEqual([true, false])
    expect(order('PCT')).toEqual([false, true])
    expect(order('RECENT')).toEqual([false, true])
  })
})

describe('처음 여는 필터 — 비어 있지 않은 첫 것 (2장 ①)', () => {
  it('실행 중 → 대기 → 완료 → 폐기 순으로 비어 있지 않은 첫 것', async () => {
    const { firstScope } = await import('./PlansPage')
    const of = (status: string) => ({ status }) as never
    expect(firstScope([of('PLANNED'), of('RUNNING')])).toBe('RUNNING')
    expect(firstScope([of('PLANNED'), of('DONE')])).toBe('PLANNED')
    expect(firstScope([of('CLOSED'), of('DONE')])).toBe('DONE')
    expect(firstScope([of('CLOSED')])).toBe('CLOSED')
    expect(firstScope([])).toBe('RUNNING')
  })
})

describe('거래 계획만의 찾기 — 찾으면 카드 끝에 찾은 종목의 빈 칸', () => {
  it('찾은 종목의 빈 칸 「+ 새 계획」 — 띄어쓰기 · 대소문자 무시', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '대기' }))
    await user.type(screen.getByLabelText('계획 찾기'), 'sk 하이')
    const slot = await screen.findByRole('group', { name: 'SK하이닉스 빈 칸' })
    expect(within(slot).getByText('+ 새 계획')).toBeInTheDocument()
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument()
  })

  it('계획이 없는 종목은 「+ 계획 없이 체결」 도 — 그 종목으로 칸을 연다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.type(screen.getByLabelText('계획 찾기'), 'naver')
    const slot = await screen.findByRole('group', { name: 'NAVER 빈 칸' })
    expect(within(slot).getByText('계획 없음')).toBeInTheDocument()
    await user.click(
      within(slot).getByRole('button', { name: '+ 계획 없이 체결' }),
    )
    expect(screen.queryByLabelText('종목')).not.toBeInTheDocument()
    expect(
      screen.getAllByText('매수 · 매도를 골라야 기록할 수 있습니다').length,
    ).toBeGreaterThan(0)
  })

  it('맞는 것이 없으면 그렇게 말한다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findAllByText('SK하이닉스')
    await user.type(screen.getByLabelText('계획 찾기'), '없는종목')
    expect(
      await screen.findByText(/에 맞는 계획이 없습니다/),
    ).toBeInTheDocument()
  })
})

describe('예상 위험노출 — 계획대로 다 샀다면 · 지금 손절 기준 (Q23)', () => {
  it('riskOf = (계획 진입 − 지금 손절) × 계획 수량 ÷ 계좌 · 본전 이상이면 0', async () => {
    const { riskOf } = await import('./PlansPage')
    const p = { entryPrice: 387_500, stopPrice: 361_150, quantity: 15 }
    expect(riskOf(p as never, 8_000_000)).toBeCloseTo(4.94, 2)
    expect(riskOf({ ...p, stopPrice: 387_500 } as never, 8_000_000)).toBe(0)
    expect(riskOf(p as never, 0)).toBeNull()
  })

  it('계좌 합계 막대는 없다 · 열 머리에 「예상 위험노출」', async () => {
    draw()
    await screen.findAllByText('SK하이닉스')
    expect(screen.queryByRole('meter')).toBeNull()
    expect(screen.getAllByText('예상 위험노출').length).toBeGreaterThan(0)
  })
})
