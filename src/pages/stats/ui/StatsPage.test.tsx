import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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
import { StatsPage } from './StatsPage'

// 라우터 없이 그린다 — 링크가 어디로 가려 했는지만 남긴다
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to?: string }) => (
    <a data-to={to}>{children}</a>
  ),
}))

/**
 * ⑦ 이 **세 덩어리로 서는지** 본다. 값이 맞는지는 `model/aggregate.test.ts`
 * 가 보고, 여기서는 «무엇이 있고 무엇이 없는지»만 본다.
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const draw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StatsPage />
    </QueryClientProvider>,
  )
}

describe('거래 통계 — 요약 · 워터폴 · 기록', () => {
  it('요약이 «먼저» 서고 그 아래로 워터폴과 기록이 선다', async () => {
    draw()
    expect(await screen.findByText('요약')).toBeInTheDocument()
    // 요약 한 묶음 안에 세 층
    expect(screen.getByText('최대 수익')).toBeInTheDocument()
    expect(screen.getByText('최대 손실')).toBeInTheDocument()
    // 성과 넷은 칸 이름이 곧 제목이다 — 「성과」 줄 이름은 걷었다 (Q15)
    expect(screen.getByText('승률')).toBeInTheDocument()
    expect(screen.getByText('위험')).toBeInTheDocument()
    expect(screen.getByText('월별 손익과 누적')).toBeInTheDocument()
    expect(screen.getByText('거래 기록')).toBeInTheDocument()
  })

  it('그룹별 성과와 종형 곡선은 «없다»', async () => {
    draw()
    await screen.findByText('요약')
    expect(screen.queryByText('그룹별 성과')).not.toBeInTheDocument()
    expect(
      screen.queryByText('트렌드 8조건 — 어기고 산 거래'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('종형 곡선')).not.toBeInTheDocument()
    // 표는 거래 기록 하나뿐이다
    expect(screen.getAllByRole('table')).toHaveLength(1)
  })

  it('제목이 «한 번씩만» 선다 — 바탕에 뜬 소제목을 걷어냈다', async () => {
    draw()
    await screen.findByText('요약')
    for (const name of ['요약', '거래 기록', '월별 손익과 누적'])
      expect(screen.getAllByText(name)).toHaveLength(1)
  })

  it('위험 셋이 성과와 «따로» 선다', async () => {
    draw()
    await screen.findByText('위험')
    for (const k of ['평균 위험노출', '자본 감소', '연속 손실'])
      expect(screen.getByText(k)).toBeInTheDocument()
    // 「벽 왼쪽」 은 뺐고 「기대값」 은 「기대수익」 이다 (Q15 ⑥)
    expect(screen.queryByText('벽 왼쪽')).not.toBeInTheDocument()
    expect(screen.getByText('기대수익')).toBeInTheDocument()
  })

  it('① 은 «적는» 길도 연다 — 머리줄에서 기간을 고른다', async () => {
    draw()
    const title = await screen.findByText('월별 손익과 누적')
    // 「기간」은 거래 기록의 열 이름에도 있다 — 워터폴 카드 안에서 찾는다
    const card = title.closest('.card') as HTMLElement
    expect(within(card).getByText('기간')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '전체 기간' })).toBeDisabled()
  })

  it('② 는 «접힌 색인»이다 — 한 줄이 계획 하나, 손익 합계 순 (Q14)', async () => {
    draw()
    const table = (await screen.findAllByRole('table')).at(-1)!
    const heads = within(table).getAllByRole('button', { expanded: false })
    expect(heads.length).toBeGreaterThanOrEqual(30)
    // 펼친 것이 없다 — 행은 머리줄뿐
    expect(
      within(table).queryAllByRole('button', { expanded: true }),
    ).toHaveLength(0)
    expect(
      screen.getByRole('button', { name: '수익 큰 순' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '손실 큰 순' }),
    ).toBeInTheDocument()
  })

  it('② 는 구분(매수/매도) 손잡이가 없고 · 종목 찾기가 있다', async () => {
    draw()
    await screen.findByText('거래 기록')
    expect(
      screen.queryByRole('button', { name: /매수\s*37/ }),
    ).not.toBeInTheDocument()
    // 게이트 거르기는 뺐다 (Q14 ⑦)
    expect(screen.queryByText('게이트')).not.toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: '종목 찾기' }),
    ).toBeInTheDocument()
  })

  it('② 는 전체 건수를 올리지 않는다 — count() 쿼리를 안 쓴다 (Q14 ⑤)', async () => {
    draw()
    await screen.findByText('거래 기록')
    expect(screen.queryByText(/체결 83건/)).not.toBeInTheDocument()
    expect(screen.queryByText('보고 있는 것')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '있음' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '없음' })).toBeInTheDocument()
  })

  it('② 의 거르기는 오른쪽에서 걸린다 — 걸면 해제가 선다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findByText('거래 기록')

    await user.click(screen.getByRole('button', { name: '없음' }))
    // 계획 없는 매도 열둘이 한 줄씩
    expect(screen.getAllByText('계획에 없음').length).toBeGreaterThanOrEqual(12)
    expect(screen.queryByText(/돌파 183,500/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '거르기 해제' }))
    expect(screen.getByText(/돌파 183,500/)).toBeInTheDocument()
  })
})
