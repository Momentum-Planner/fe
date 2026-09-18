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
import { closeFill, openFill } from '@/widgets/fill'
import { PlansPage } from './PlansPage'

/**
 * 계획 컬렉션이 **실제로 떠지는지** 본다.
 *
 * 💀 `noUncheckedIndexedAccess` 를 켜면서 이 화면의 그룹 묶는 부분을 고쳤다 —
 * `head: sorted[0]` 이 `undefined` 를 끼게 되어 «빈 그룹을 걸러내는» 단계가
 * 하나 늘었다. 로직을 건드렸으니 목록이 여전히 서는지가 확인돼야 한다.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
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
  it('처음은 「실행 중」 — 실행 중 계획만 서고 목표 · 진입 · 손절이 한 줄씩', async () => {
    draw()
    expect(await screen.findByText('SK하이닉스')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '실행 중' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('진입')).toBeInTheDocument()
    expect(screen.getByText('손절')).toBeInTheDocument()
    // 대기만 있는 종목(삼성전자) · 끝난 종목(카카오)은 이 거르기에 없다
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument()
    expect(screen.queryByText('카카오')).not.toBeInTheDocument()
  })

  it('「대기」 로 거르면 대기 계획이 서고, 실행 중은 빠진다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '대기' }))
    // 삼성전자 대기 둘 — 한 판 위에, 이름은 판 머리에 한 번만 (4장 ④)
    expect(screen.getAllByText('삼성전자')).toHaveLength(1)
    const board = screen.getByRole('region', { name: '삼성전자' })
    expect(
      within(board).getAllByRole('button', { name: '+ 체결' }),
    ).toHaveLength(2)
    expect(screen.queryByText('실행 중', { selector: 'span' })).toBeNull()
  })

  it('「완료 · 폐기」 로 거르면 끝난 계획이 선다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '완료 · 폐기' }))
    expect(screen.getByText('카카오')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ 체결' })).toBeNull()
  })

  it('카드의 「+ 체결」 은 오른쪽 칸을 그 계획이 골라진 채로 연다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findByText('SK하이닉스')
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
    await screen.findByText('SK하이닉스')
    await user.click(screen.getByRole('button', { name: '+ 체결 기록' }))
    expect(screen.getByLabelText('종목')).toBeInTheDocument()
  })

  it('Esc 로 체결 칸을 닫는다 (4장 ⑥ 서랍)', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findByText('SK하이닉스')
    act(() => openFill())
    expect(screen.getByLabelText('종목')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('종목')).not.toBeInTheDocument()
  })
})
