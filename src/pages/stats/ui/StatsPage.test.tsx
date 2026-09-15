import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from 'mocks/server'
import { StatsPage } from './StatsPage'

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
    expect(screen.getByText('성과')).toBeInTheDocument()
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

  it('위험 넷이 성과와 «따로» 선다', async () => {
    draw()
    await screen.findByText('위험')
    for (const k of ['평균 위험노출', '자본 감소', '연속 손실', '벽 왼쪽'])
      expect(screen.getByText(k)).toBeInTheDocument()
    expect(
      screen.getByText(/1R이 없어 «벽 왼쪽»과 «R 평균» 셈에 없습니다/),
    ).toBeInTheDocument()
  })

  it('① 은 «적는» 길도 연다 — 머리줄에서 기간을 고른다', async () => {
    draw()
    await screen.findByText('월별 손익과 누적')
    expect(screen.getByText('기간')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '전체 기간' })).toBeDisabled()
  })

  it('② 는 한 번에 30행만 세운다 — 나머지는 «내려가면» 붙는다', async () => {
    draw()
    const table = (await screen.findAllByRole('table')).at(-1)!
    // 목의 체결은 83건 — 첫 판은 30행이다
    expect(within(table).getAllByRole('row').length).toBe(1 + 30)
    // 「더 보기」 바는 없다 — 표가 자기 스크롤을 가진다
    expect(
      screen.queryByRole('button', { name: /더 보기/ }),
    ).not.toBeInTheDocument()
  })

  it('② 는 계획 칸이 2값이다 — 통계 축과 같은 둘', async () => {
    draw()
    expect(await screen.findByText('거래 기록')).toBeInTheDocument()
    expect(screen.getAllByText('계획에 없음').length).toBeGreaterThan(0)
  })

  it('② 의 머리줄 셈이 «손잡이»다 — 누르면 목록이 걸린다', async () => {
    const user = userEvent.setup()
    draw()
    await screen.findByText('거래 기록')

    // 손잡이 셋 — 「구분」「계획」은 열 이름과 같은 말이라 둘씩 뜬다
    expect(screen.getByText('게이트')).toBeInTheDocument()
    expect(screen.getAllByText('구분')).toHaveLength(2)

    const before = screen.getByText('보고 있는 것').nextSibling?.textContent
    expect(before).toBe('83건')

    // 「매수 37」 을 누르면 매수만 남는다
    await user.click(screen.getByRole('button', { name: /매수\s*37/ }))
    expect(screen.getByText('보고 있는 것').nextSibling?.textContent).toBe(
      '37건',
    )
    // 거르기 전의 수는 손잡이에 그대로 남는다 — 무엇이 있는지가 보여야 한다
    expect(
      screen.getByRole('button', { name: /매도\s*46/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '거르기 해제' }))
    expect(screen.getByText('보고 있는 것').nextSibling?.textContent).toBe(
      '83건',
    )
  })
})
