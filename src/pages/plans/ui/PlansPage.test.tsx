import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('계획 컬렉션', () => {
  it('종목별로 묶여서 뜬다', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={qc}>
        <PlansPage />
      </QueryClientProvider>,
    )
    // 목의 계획들이 세 종목에 걸쳐 있다
    expect(await screen.findByText('SK하이닉스')).toBeInTheDocument()
    expect(screen.getByText('삼성전자')).toBeInTheDocument()
    // 빈 그룹이 걸러져도 «있는» 그룹은 남는다
    expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument()
  })
})
