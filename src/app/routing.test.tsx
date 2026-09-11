import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
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
import { planApi } from '@/entities/plan'
import { routeTree } from './routeTree.gen'

/**
 * **라우팅을 «진짜 라우터»로 본다.**
 *
 * 💀 이 파일이 없을 때 이런 버그가 났다 — `stocks.$ticker.plan.$planId` 가
 * `/stocks/:ticker` 의 «자식»으로 잡혔는데, 부모가 페이지를 통째로 그리느라
 * `<Outlet/>` 이 없었다. 그래서 **주소는 바뀌는데 화면은 그대로**였다.
 * 「계획을 눌러도 그 계획으로 안 넘어간다」가 그것이다 (2026-09-11).
 *
 * 컴포넌트 테스트는 `Link` 를 목으로 바꿔 쓰므로 이 층을 **통째로 건너뛴다.**
 * 오늘 같은 병이 세 번 났다 —
 * ```text
 * planApi 가 본문을 못 보냄     목 테스트가 fetch 를 직접 불러 api 층을 건너뜀
 * 차트 선이 화면 밖             선을 그리는 코드만 보고 «축 범위»를 안 봄
 * 라우트 중첩                   Link 를 목으로 바꿔 «어디로 가는지»가 사라짐
 * ```
 * 층을 건너뛰면 그 층의 버그는 영영 안 잡힌다. 그래서 이 층을 연다.
 */

// 개발 도구는 테스트에서 쓸모가 없고 무겁다
vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: () => null,
}))
vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function goTo(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={qc}>
      {/* 타입은 앱의 라우터 하나로 등록돼 있어 여기서는 좁히지 않는다 */}
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )
  return router
}

describe('종목과 계획의 주소', () => {
  it('`/stocks/:ticker` 는 «실행 중»을 편다', async () => {
    const list = (await planApi.getList({ stockCode: '000660' })).plans
    const running = list.find((p) => p.status === 'RUNNING')
    expect(running).toBeDefined()

    goTo('/stocks/000660')
    // 계획을 안 골랐으면 화면이 하나를 고른다 — 「지금 살아 있는 판단」이 먼저다
    expect(await screen.findAllByText(running!.title)).not.toHaveLength(0)
  })

  it('`/stocks/:ticker/plan/:id` 가 «그 계획»을 편다', async () => {
    const list = (await planApi.getList({ stockCode: '000660' })).plans
    const running = list.find((p) => p.status === 'RUNNING')!
    const other = list.find(
      (p) => p.planId !== running.planId && p.status === 'PLANNED',
    )!

    goTo(`/stocks/000660/plan/${other.planId}`)

    /**
     * 💀 **여기가 깨졌던 자리다.** 중첩 라우트일 때는 부모만 그려져서
     * 실행 중 계획이 계속 떠 있었다 — 주소가 가리키는 계획이 아니라.
     *
     * ✔ 실제로 되돌려서 «이 테스트가 그 버그를 잡는지» 확인했다 —
     *   파일 이름에서 `$ticker_` 의 밑줄을 빼면 이 줄에서 깨진다 (2026-09-11).
     *   그물이 실제로 그 물고기를 잡는지 보지 않으면 그물이 아니다.
     */
    const hits = await screen.findAllByText(other.title)
    expect(hits.length).toBeGreaterThan(0)
    // 머리줄이 «그 계획»이어야 한다. 실행 중은 사슬 마디로만 남는다
    expect(
      screen.getAllByText(other.title).some((el) => el.tagName === 'SPAN'),
    ).toBe(true)
  })

  it('계획이 «없는» 종목은 첫 계획의 문을 연다', async () => {
    const none = await planApi.getList({ stockCode: '005380' })
    expect(none.plans).toHaveLength(0)

    goTo('/stocks/005380')
    expect(
      await screen.findByText('이 종목에 계획이 없습니다.'),
    ).toBeInTheDocument()
  })
})
