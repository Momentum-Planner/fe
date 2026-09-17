import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from 'mocks/server'
import { planApi } from '@/entities/plan'
import type { PlanCreate, PlanDetail } from '@/entities/plan'
import { PlanDetailPage } from './PlanDetailPage'
import { attachPointId, walkedSpine } from './spine'

/**
 * 폐기와 삭제가 «화면에서» 갈리는지 본다 (Q8).
 *
 * 목 테스트(`mocks/handlers.test.ts`)는 «서버가 무엇을 남기나»를 보고, 여기는
 * 「버튼이 실제로 무언가를 하는가」를 본다 — 고치기 전 `폐기` 는 `onClick` 이
 * 없는 **죽은 버튼**이었고, 목 테스트로는 그것을 못 잡는다.
 */

/**
 * 라우터 없이 `Link` 를 쓰는 컴포넌트를 띄우므로 라우터 훅 둘을 세운다.
 *
 * ⚠️ **이 목이 못 잡는 것이 있다.** `Link` 를 `<a>` 로 바꾸므로 «어디로 가는지»가
 *    테스트에서 사라진다. 실제로 그 자리에서 사고가 났다 —
 *    `stocks.$ticker.plan.$planId` 가 `/stocks/:ticker` 의 «자식»이 되면서
 *    부모가 `<Outlet/>` 을 안 그려 **주소만 바뀌고 화면은 그대로**였다
 *    (2026-09-11 · 파일 이름을 `$ticker_` 로 고쳐 중첩을 끊었다).
 *    라우팅은 라우트 트리에서 보는 것이지 여기서 볼 것이 아니다.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to?: string
    params?: Record<string, string>
  }) => (
    // 어디로 가려 했는지는 «남겨» 둔다 — 링크가 붙었는지는 볼 수 있어야 한다
    <a data-to={to} data-params={JSON.stringify(params ?? {})}>
      {children}
    </a>
  ),
  useNavigate: () => () => Promise.resolve(),
}))

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BLANK: PlanCreate = {
  stockCode: '000660',
  title: '테스트 계획',
  entryPrice: 1_200_000,
  stopPrice: 1_150_000,
  quantity: 5,
  memo: '',
  raise: { kind: 'R', r: 2 },
  trail50: false,
  previousPlanId: null,
}

function show(plan: PlanDetail) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={qc}>
      <PlanDetailPage stockCode={plan.stockCode} planId={plan.planId} />
    </QueryClientProvider>,
  )
  return qc
}

describe('폐기와 삭제 — 화면', () => {
  it('폐기는 «사유를 받고 나서» 닫는다', async () => {
    // 제목을 테스트마다 다르게 둔다 — 사슬이 같은 종목의 계획을 전부 그리므로
    // 같은 제목이 쌓이면 질의가 여럿을 집는다
    const plan = await planApi.create({ ...BLANK, title: '폐기 대상' })
    show(plan)
    const user = userEvent.setup()

    // 제목은 머리줄과 사슬 마디 «둘 다»에 뜬다
    await screen.findAllByText('폐기 대상')
    // **문은 사슬의 마디 위**에 있다 — 호버하면 뜨는 작은 버튼 (Q8 · D).
    // 이름이 붙어 있어 «어느 마디»인지가 버튼에 있다
    // 사슬은 «목록»으로 그려지므로 상세보다 늦게 온다 — find 로 기다린다
    await user.click(
      await screen.findByRole('button', { name: '폐기 대상 폐기' }),
    )

    // 사유가 비어 있으면 못 닫는다 — 판단에는 이유가 있다
    const go = screen.getByRole('button', { name: '폐기' })
    expect(go).toBeDisabled()
    expect(screen.getByText('사유 없이 닫을 수 없다')).toBeInTheDocument()

    await user.type(
      screen.getByPlaceholderText('왜 안 가기로 했는가'),
      '돌파가 거래량 없이 나왔다',
    )
    await user.click(screen.getByRole('button', { name: '폐기' }))

    // 계획은 «사라지지 않는다» — 상태와 사유가 그 자리에 남는다 (④-2)
    await waitFor(() =>
      expect(screen.getByText('돌파가 거래량 없이 나왔다')).toBeInTheDocument(),
    )
    expect(screen.getByText('폐기 사유 —')).toBeInTheDocument()
    // 닫힌 계획은 더 닫을 것이 없다
    expect(
      screen.queryByRole('button', { name: '폐기' }),
    ).not.toBeInTheDocument()
  })

  it('삭제는 확인을 한 번 거친다 — 되돌릴 수 없다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '삭제 대상' })
    show(plan)
    const user = userEvent.setup()

    // 제목은 머리줄과 사슬 마디 «둘 다»에 뜬다
    await screen.findAllByText('삭제 대상')
    // **폐기를 거치지 않고 «바로» 닿는다** (Q8 · D). 처음부터 삭제하러 온
    // 사람이 원하지 않는 행위를 지나게 하지 않는다
    await user.click(
      await screen.findByRole('button', { name: '삭제 대상 삭제' }),
    )
    // 한 번 더 누르기 전에는 안 지워진다
    expect(screen.getByRole('button', { name: '삭제한다' })).toBeInTheDocument()
    // 뜻은 라벨이 아니라 이 패널이 진다 — 두 글자로는 판단과 정정을 못 가른다
    expect(screen.getByText(/세지 않는다/)).toBeInTheDocument()
    expect(screen.getByText(/되돌릴 수 없다/)).toBeInTheDocument()
  })

  it('둘 다 «사슬»에 있고 머리줄에는 수정만 있다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '둘 다 뜬다' })
    show(plan)

    // 제목은 머리줄과 사슬 마디 «둘 다»에 뜬다
    await screen.findAllByText('둘 다 뜬다')
    // 문턱이 같아 늘 같이 뜬다 (대기 + 체결 0건)
    const close = await screen.findByRole('button', { name: '둘 다 뜬다 폐기' })
    const del = await screen.findByRole('button', { name: '둘 다 뜬다 삭제' })
    expect(close).toBeInTheDocument()
    expect(del).toBeInTheDocument()

    // 흐름을 «바꾸는 문» 셋은 사슬에, 값을 «만지는 것»은 세부에
    const edit = screen.getByRole('button', { name: '수정' })
    expect(close.closest('section')).not.toContainElement(edit)
    expect(del.closest('section')).not.toContainElement(edit)
  })

  it('체결이 붙으면 치우는 길이 «없고», 없는 이유를 말한다', async () => {
    // 목의 1번은 실행 중 + 체결 있음
    const plan = await planApi.getDetail(1)
    expect(plan.recordCount).toBeGreaterThan(0)
    show(plan)

    await screen.findByText(/체결이 붙어 치울 수 없다/)
    // 버튼만 지우지 않는다 — 왜 없는지를 적는다 (디자인 4장 ⑤)
    expect(screen.getByText(/끝내는 길은 매도 계획이다/)).toBeInTheDocument()
    // 이 마디에는 문이 «안 열린다» — 사슬에서 그 마디만 버튼이 없다
    expect(
      screen.queryByRole('button', { name: `${plan.title} 폐기` }),
    ).not.toBeInTheDocument()
  })

  it('폐기한 계획에는 «폐기» 버튼이 없다 — 더 닫을 것이 없다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '이미 닫힘' })
    await planApi.close(plan.planId, { closeReason: '안 가기로 했다' })
    show(plan)

    await screen.findByText('폐기 사유 —')
    expect(
      screen.queryByRole('button', { name: '이미 닫힘 폐기' }),
    ).not.toBeInTheDocument()
  })
})

/**
 * 「이어서 세우기」 (ⓐ-1).
 *
 * 요점은 **값을 안 물려주는지**다 — 진입가·스톱가·수량을 복사해 두면 그게 곧
 * 「서비스가 제시한 값」이 되고, 사용자는 지우지 않고 그냥 저장한다.
 * ④는 *「진입가도 손절선도 서비스가 제시하지 않는다」* 다.
 */
/**
 * 새 계획 폼은 **순차 공개**다 (Q11 B) — 날짜를 골라야 ② 가, 칸을 벗어나야 ③ 이 열린다.
 * 테스트도 사용자가 가는 길 그대로 간다.
 */
async function pickLatestDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '스냅샷 날짜' }))
  const days = await waitFor(() => {
    const open = screen
      .getAllByRole('button', { name: /^\d{4}-\d{2}-\d{2}$/ })
      .filter((b) => !(b as HTMLButtonElement).disabled)
    expect(open.length).toBeGreaterThan(0)
    return open
  })
  await user.click(days.at(-1)!)
}

async function fillToQuantity(user: ReturnType<typeof userEvent.setup>) {
  await pickLatestDate(user)
  await user.type(screen.getByLabelText('진입 예상가'), '1200000')
  await user.type(screen.getByLabelText('스톱가격'), '1150000')
  // 칸을 벗어나야 ③ 이 열린다 (Q11 F)
  await user.tab()
  await user.type(await screen.findByLabelText('수량'), '5')
  await user.tab()
}

describe('이어서 세우기', () => {
  it('문은 «사슬의 빈 자리»다 — 머리줄에 버튼이 없다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '문이 어디냐' })
    show(plan)

    // 제목은 머리줄과 사슬 마디 «둘 다»에 뜬다
    await screen.findAllByText('문이 어디냐')
    // 새 마디가 «설 자리»가 곧 「무엇을 이어받나」의 답이다
    const gate = screen.getByRole('button', { name: '이어서 세우기' })
    expect(gate).toBeInTheDocument()
    // 사슬 안에 있다 — 머리줄(수정·폐기가 선 줄)이 아니다
    expect(gate.closest('section')).not.toContainElement(
      screen.getByRole('button', { name: '수정' }),
    )
  })

  it('값은 «비어» 있고 날짜부터 고른다 — 순차 공개 (Q11 B)', async () => {
    const plan = await planApi.create({
      ...BLANK,
      title: '뿌리 계획',
      raise: { kind: 'R', r: 3 },
      trail50: true,
    })
    show(plan)
    const user = userEvent.setup()

    // 제목은 머리줄과 사슬 마디 «둘 다»에 뜬다
    await screen.findAllByText('뿌리 계획')
    // **사슬의 빈 자리**가 문이다 — 머리줄 버튼이 아니다 (ⓐ-1)
    await user.click(screen.getByRole('button', { name: '이어서 세우기' }))

    // 처음에는 ① 근거만 선다. 이름은 안 묻는다 — 자동이다 (Q11 A)
    expect(
      screen.getByRole('button', { name: '스냅샷 날짜' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('진입 예상가')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('계획 이름')).not.toBeInTheDocument()
    // 등록은 맨 아래 ⑤ 와 함께 나타난다 (Q12)
    expect(
      screen.queryByRole('button', { name: '등록' }),
    ).not.toBeInTheDocument()

    // **세부가 서 있던 그 칸을 차지한다** — 덧붙지 않는다.
    expect(
      screen.queryByRole('button', { name: '수정' }),
    ).not.toBeInTheDocument()
    // 만드는 동안 새 마디가 설 자리가 켜지고, **같은 자리를 다시 누르면 끝난다**
    const gate = screen.getByRole('button', { name: '생성 그만두기' })
    await user.click(gate)
    expect(
      await screen.findByRole('button', { name: '수정' }),
    ).toBeInTheDocument()
  })

  it('차트에서 «집는» 칸을 켜고 끌 수 있다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '집기 확인' })
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText('집기 확인')
    await user.click(
      await screen.findByRole('button', { name: '이어서 세우기' }),
    )
    await pickLatestDate(user)

    // ④-1-1-1 의 📦 자료가 「차트」다 — 숫자를 쓰는 것보다 그 자리를 짚는 것
    const arm = screen.getAllByRole('button', { name: '차트에서 집기' })
    expect(arm.length).toBe(2) // 진입가 · 스톱가격
    await user.click(arm[0]!)
    expect(
      screen.getByRole('button', { name: '차트에서 집는 중' }),
    ).toBeInTheDocument()
    // 한 번에 한 칸만 집는다
    expect(
      screen.getAllByRole('button', { name: '차트에서 집기' }).length,
    ).toBe(1)
  })

  /**
   * ⚠️ 시간을 넉넉히 준다 — 숫자 칸 셋에 «한 자씩» 치면 그때마다 다시 그려지고,
   *    차트까지 붙은 화면이라 기본 5초가 아슬아슬하다. 느린 것이 문제가 아니라
   *    **입력할 때마다 결과가 따라온다**는 것을 재는 테스트라 타이핑이 본질이다.
   */
  it('쓰는 동안 «위험노출»이 같이 움직인다', { timeout: 20_000 }, async () => {
    const plan = await planApi.create({ ...BLANK, title: '노출 확인' })
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText('노출 확인')
    await user.click(
      await screen.findByRole('button', { name: '이어서 세우기' }),
    )
    await pickLatestDate(user)

    // 후보 선이 «조회와 같은 목록»으로 뜬다 (④-1-1-2)
    expect(screen.getByText('10일선')).toBeInTheDocument()

    await user.type(screen.getByLabelText('진입 예상가'), '1200000')
    await user.type(screen.getByLabelText('스톱가격'), '1150000')
    // 쉼표가 «치는 동안» 찍힌다 (Q11 D)
    expect(screen.getByLabelText('진입 예상가')).toHaveValue('1,200,000')
    await user.tab()

    // ③ 이 열리고, 수량을 넣으면 «실행 후»가 따라 움직인다 (④-1 · 디자인 9장 ④)
    await user.type(await screen.findByLabelText('수량'), '5')
    const after = (
      plan.riskBefore +
      (50_000 * 5 * 100) / plan.accountTotal
    ).toFixed(2)
    expect(screen.getByText(`${after}%`)).toBeInTheDocument()
    await user.tab()

    // 스톱 상향을 이어받았으므로 ④ 는 접힌 채 채워져 있고 ⑤ 와 등록이 선다
    expect(screen.getByRole('button', { name: '등록' })).toBeEnabled()
    // 이름이 자동으로 붙는다 — 진입 상태 + 진입가
    expect(
      screen.getByText(/^(조기|돌파|눌림|진입 불가) 1,200,000$/),
    ).toBeInTheDocument()

    // 등록하면 계좌 총액을 «따로» 확인받는다 (Q11 A)
    await user.click(screen.getByRole('button', { name: '등록' }))
    expect(
      screen.getByRole('dialog', { name: '계좌 총액 확인' }),
    ).toBeInTheDocument()
  })

  it(
    '스톱 규칙은 «이어받아 오되 고칠 수 있다» (④-1-4)',
    { timeout: 20_000 },
    async () => {
      const plan = await planApi.create({
        ...BLANK,
        title: '규칙 고치기',
        raise: { kind: 'R', r: 3 },
        trail50: true,
      })
      show(plan)
      const user = userEvent.setup()

      await screen.findAllByText('규칙 고치기')
      await user.click(
        await screen.findByRole('button', { name: '이어서 세우기' }),
      )
      await fillToQuantity(user)

      // 값이 «채워져» 온다 — 진입가·수량과 반대다. 그쪽은 판단, 이쪽은 규칙.
      // 이어받았으므로 접힌 채 요약 한 줄이다 (Q12)
      expect(
        screen.getByText('스톱 상향 3R · 50일선 트레일링 켬'),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '고치기 ▸' }))

      const trail = screen.getByRole('switch', { name: '50일선 트레일링' })
      expect(trail).toBeChecked()
      const three = screen.getByRole('button', { name: '3R' })
      const two = screen.getByRole('button', { name: '2R' })
      expect(three).toHaveAttribute('aria-pressed', 'true')

      // 스톱 상향은 «끔»이 없다 — 다른 값으로 바꿀 수만 있다 (Q12)
      await user.click(two)
      expect(two).toHaveAttribute('aria-pressed', 'true')
      expect(three).toHaveAttribute('aria-pressed', 'false')
    },
  )

  it('세우면 «승계»가 붙고 스톱 규칙이 따라온다', async () => {
    const root = await planApi.create({
      ...BLANK,
      title: '승계 뿌리',
      raise: { kind: 'AVG' },
      trail50: true,
    })
    // 훅이 하는 일을 API 층에서 그대로 확인한다 — 화면은 이 값을 넘길 뿐이다
    const next = await planApi.create({
      ...BLANK,
      title: '이어진 계획',
      previousPlanId: root.planId,
      raise: root.plannedStop.raise,
      trail50: root.plannedStop.trail50,
    })
    expect(next.previousPlanId).toBe(root.planId)
    expect(next.plannedStop.raise).toEqual({ kind: 'AVG' })
    expect(next.plannedStop.trail50).toBe(true)
    // 세운 계획은 «대기»로 난다
    expect(next.status).toBe('PLANNED')
  })
})

/**
 * 만든 계획이 **사슬에 실제로 붙는지.**
 *
 * 💀 유령 선은 줄기 «끝»을 가리키는데 계획은 「지금 보고 있는 계획」에 붙고
 * 있었다. 대기 계획을 보면서 만들면 그 대기에 붙는데, 사슬은 갈래를 줄기 끝에서만
 * 꺼내므로 **만든 계획이 화면 어디에도 안 그려졌다.** 둘을 `spine.ts` 한 군데로
 * 모은 뒤에도 어긋나지 않는지를 여기서 잰다.
 */
describe('만든 계획이 사슬에 붙는다', () => {
  it('«대기» 계획을 보면서 만들어도 줄기 끝에 붙는다', async () => {
    // 목의 9번은 SK하이닉스의 «대기» 계획이다 — 줄기가 아니다
    const daegi = await planApi.getDetail(9)
    expect(daegi.status).toBe('PLANNED')

    const born = await planApi.create({
      ...BLANK,
      title: '대기에서 만든 것',
      previousPlanId: attachPointId(
        (await planApi.getList({ stockCode: '000660' })).plans,
      ),
    })

    // 붙은 곳이 «줄기의 끝»이다 — 보고 있던 대기 계획이 아니다
    const list = (await planApi.getList({ stockCode: '000660' })).plans
    const tail = walkedSpine(list).at(-1)
    expect(born.previousPlanId).toBe(tail?.planId)
    expect(born.previousPlanId).not.toBe(daegi.planId)
  })

  it('만들면 사슬에 마디로 «뜬다»', async () => {
    const plan = await planApi.create({ ...BLANK, title: '사슬에 뜨나' })
    show(plan)

    // 사슬은 목록으로 그려진다 — 머리줄과 마디 «둘 다»에 제목이 있어야 붙은 것이다
    const hits = await screen.findAllByText('사슬에 뜨나')
    expect(hits.length).toBeGreaterThan(1)
  })
})

/**
 * **「매도 계획」이 없다** (2026-09-11).
 *
 * 명칭이 *「매도 = 그 계획을 «닫는» 것. 손절이든 익절이든 매도로 쓴다」* 이고,
 * ④-2 가 *「계획은 매수할 때 만들어진다. 살 때 파는 계획도 «같이» 만든다 —
 * 손절가를 정해야 계획이 성립한다」* 다. 파는 일은 계획 «안»에 있다 —
 * 스톱가격과 갱신 규칙 셋이 그것이다.
 *
 * ⚠️ 최종미지 ④-2 · ④-3 을 뒤집는다. 거기는 계획을 매수용·매도용으로 가른다.
 */
describe('계획에 매수·매도 구분이 없다', () => {
  it('계획은 «구분»을 안 든다 — 체결만 든다 (⑥)', async () => {
    const plan = await planApi.create({ ...BLANK, title: '구분 없음' })
    // 계획에는 없고
    expect(plan).not.toHaveProperty('side')
    // 체결에는 있다 — ⑥ 의 「구분으로 매수·매도가 갈린다」
    const run = await planApi.getDetail(1)
    expect(run.records.length).toBeGreaterThan(0)
    expect(run.records.at(0)).toHaveProperty('side')
  })

  it('화면에 「매도」가 안 뜬다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '매도 안 뜬다' })
    show(plan)

    await screen.findAllByText('매도 안 뜬다')
    // 계획을 가리키는 「매도」 뱃지가 어디에도 없다.
    // ⚠️ 체결 목록의 「매도」는 남는다 — 그건 체결의 구분이라 맞다
    expect(screen.queryByText('매도', { selector: 'span' })).toBeNull()
  })
})

/**
 * 세부 화면이 **읽을 때와 고칠 때 다른 것을 보인다.**
 *
 * 💀 손절폭 상한을 늘 띄웠더니 읽는 화면에 「상한 2.36% · 평균수익 4.72% ÷
 * 손익비 2」가 상시로 서 있었다. 이미 정해진 스톱가격을 보는 자리에서는
 * **상한이 아무 일도 안 한다** — 넘었으면 스톱가격 칸에 ⚠ 가 이미 붙는다.
 */
describe('읽을 때와 고칠 때', () => {
  it('손절폭 상한은 «생성·수정에서만» 뜬다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '스톱 폭 보기' })
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText('스톱 폭 보기')
    // 읽을 때는 없다
    expect(screen.queryByText(/^상한 /)).not.toBeInTheDocument()
    expect(screen.queryByText(/평균수익 .* ÷ 손익비/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '수정' }))
    // 고를 때 쓰는 선이라 «지금 정하는 사람»만 본다
    expect(screen.getByText(/^상한 /)).toBeInTheDocument()
    expect(screen.getByText(/평균수익 .* ÷ 손익비/)).toBeInTheDocument()
  })

  it('생성 칸에도 «같은 모양»으로 뜬다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '새 칸 확인' })
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText('새 칸 확인')
    await user.click(
      await screen.findByRole('button', { name: '이어서 세우기' }),
    )
    await pickLatestDate(user)
    expect(screen.getByText(/^상한 /)).toBeInTheDocument()
    expect(screen.getByText(/평균수익 .* ÷ 손익비/)).toBeInTheDocument()
  })

  it('메모는 «접지 않는다» — 고정 칸이다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '메모 자리' })
    show(plan)

    await screen.findAllByText('메모 자리')
    // 분류가 안 붙는 자유 서술이라 접어 두면 아무도 안 쓴다.
    // 비어 있어도 «자리»가 있어야 쓸 수 있다
    expect(screen.getByText('메모 없음')).toBeInTheDocument()
  })

  it('스톱 갱신 규칙이 «스톱가격과 같이» 선다 — 접힘이 아니다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '규칙 자리' })
    show(plan)

    await screen.findAllByText('규칙 자리')
    // 「어디서 자를까」와 「수익이 나면 어디로 올릴까」는 같은 선의 두 시점이다.
    // 꺼둔 50일선 트레일링도 «자리를 지킨다» (③-3-1) — 껐다는 사실을 잊지 않게
    // 백스톱은 스톱 상향의 선택지로 들어갔다 (Q12)
    expect(screen.getByText('스톱 갱신 규칙')).toBeInTheDocument()
    expect(screen.getByText('50일선 트레일링')).toBeInTheDocument()
    expect(screen.getByText('스톱 상향 2R')).toBeInTheDocument()
  })

  it('근거 블록이 «없다» — 계획 루프를 정한 뒤에 다시 세운다', async () => {
    const plan = await planApi.getDetail(1)
    show(plan)

    await screen.findAllByText(plan.title)
    // ④-0 의 25개 값을 「알아볼 수 있게」 보이는 문제가 안 풀렸다.
    // ⚠️ 스냅샷 «데이터»는 그대로 붙는다 — F4 가 사후에 못 만든다고 했으므로
    expect(screen.queryByText(/근거/)).not.toBeInTheDocument()
    expect(plan.snapshot.dailyScreeningResultId).toBeGreaterThan(0)
  })

  it('후보 선은 읽을 때 «고른 하나»뿐이고, 고칠 때만 펴지고 버튼이 된다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '후보 목록 보기' })
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText('후보 목록 보기')

    /**
     * 읽을 때는 **고른 하나만** 선다 (2026-09-16).
     * 💀 넷을 다 늘어놨더니 「왜 저건 안 되나」를 묻게 된다 — 고를 수 없는 선이다.
     *    이미 정해진 스톱가격을 보는 자리에서 답할 것은 「어디에 뒀나」 하나고,
     *    「무엇 중에서 골랐나」는 «고를 때»의 질문이다. 상한 표시와 같은 규칙.
     */
    const LINES = ['10일선', '20일선', '50일선', '최근 베이스 저항선']
    const shown = LINES.filter((l) => screen.queryByText(l))
    expect(shown.length).toBeLessThanOrEqual(1)
    /**
     * 안 눌린다 — 안 눌리는 것이 버튼처럼 생기면 눌러 보게 된다.
     * ⚠️ `/일선/` 으로 세면 **스톱 갱신 규칙의 「50일선 트레일링」**까지 걸린다.
     *    후보 줄만 집으려면 `aria-label` 에만 있는 「손절폭」으로 센다.
     */
    expect(screen.queryAllByRole('button', { name: /손절폭/ })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '수정' }))
    expect(screen.getByRole('button', { name: /10일선/ })).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /손절폭/ }).length,
    ).toBeGreaterThan(1)
  })
})

/**
 * 사슬을 **찾아가는 줄** (2026-09-11).
 *
 * 💀 칸이 210px 에 가로 스크롤이라 마디가 열 개만 넘어도 손으로 끌어서는 원하는
 * 자리를 못 찾는다. 특히 **실행 중**이 둘째·셋째에 있으면 화면 밖인데,
 * 그게 「지금 살아 있는 판단」이다 (④-2 — 종목당 하나뿐).
 *
 * ⚠️ 마디를 «옮기지» 않는다. 사슬의 순서는 시간이라 바꾸면 거짓이 된다 —
 *    옮기는 것은 «보는 자리»다.
 */
describe('사슬을 찾아간다', () => {
  it('«실행 중»으로 한 번에 간다', async () => {
    const plan = await planApi.getDetail(1)
    expect(plan.status).toBe('RUNNING')
    show(plan)

    await screen.findAllByText(plan.title)
    expect(
      await screen.findByRole('button', { name: /실행 중/ }),
    ).toBeInTheDocument()
  })

  it('«대기»도 한 자리 — 여럿이면 개수가 붙는다', async () => {
    const plan = await planApi.getDetail(1)
    show(plan)

    await screen.findAllByText(plan.title)
    /**
     * 실행 중은 종목당 «하나»지만(④-2) 대기는 «여럿»일 수 있다 —
     * 같은 종목에 시나리오를 여럿 두고 하나만 실현한다 (④-3).
     * 그래서 칩 하나가 돌아가며 하나씩 데려오고, 개수가 붙는다 —
     * **한 번 눌러서 다 못 본다는 사실이 보여야 한다.**
     */
    const waiting = (
      await planApi.getList({ stockCode: '000660' })
    ).plans.filter((p) => p.status === 'PLANNED')
    expect(waiting.length).toBeGreaterThan(1)

    // ⚠️ 「대기」로만 찾으면 «제목»에 그 글자가 든 마디의 버튼까지 잡힌다
    //    (목의 「3차 돌파 대기」). 앞머리로 좁힌다
    const chip = await screen.findByRole('button', {
      name: new RegExp(`^대기 ${waiting.length}개`),
    })
    expect(chip).toBeInTheDocument()
  })

  it('찾아가는 줄에 «실행 중»과 «대기»만 있다', async () => {
    const plan = await planApi.create({ ...BLANK, title: '줄 확인' })
    show(plan)

    await screen.findAllByText('줄 확인')
    /**
     * 사슬은 **왼쪽이 과거, 오른쪽이 지금**이다.
     *   최신   늘 오른쪽 끝 — 끌면 닿는다.  칩이 필요 없다
     *   개수   사슬 자체가 보여 준다.  숫자를 또 적을 이유가 없다
     *   제목   「계획 사슬」이라는 이름표도 뺐다 — 보면 사슬인 걸 안다
     * 찾기 어려운 것은 «가운데 어딘가»에 있는 실행 중 하나다 (2026-09-11).
     */
    expect(
      await screen.findByRole('button', { name: /실행 중/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '최신' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+개$/)).not.toBeInTheDocument()
    expect(screen.queryByText('계획 사슬')).not.toBeInTheDocument()
  })

  it('마디가 «적으면» 기간 고르개가 안 뜬다', async () => {
    // 계획이 넷 이하인 종목 — 끌어서 찾을 수 있는 크기다
    const few = (await planApi.getList({ stockCode: '035720' })).plans
    expect(few.length).toBeLessThanOrEqual(4)
    const plan = await planApi.getDetail(few[0]!.planId)
    show(plan)

    await screen.findAllByText(plan.title)
    expect(screen.queryByText('기간')).not.toBeInTheDocument()
  })

  it('확대는 «세로»만 넓힌다 — 가로는 이미 끌어서 본다', async () => {
    const plan = await planApi.getDetail(1)
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText(plan.title)
    const zoom = await screen.findByRole('button', { name: /확대/ })
    await user.click(zoom)
    expect(screen.getByRole('button', { name: /줄이기/ })).toBeInTheDocument()
  })

  it('찾아가는 줄이 사슬에 «덮이지» 않는다', async () => {
    const plan = await planApi.getDetail(1)
    show(plan)

    // 💀 `PanBox` 가 `absolute inset-0` 이라 형제로 두면 줄이 밑에 깔렸다.
    //    「최신이 있는데 안 보인다」가 그것이었다 — 세로로 쌓아서 고쳤다
    const row = await screen.findByRole('button', { name: /실행 중/ })
    const pan = document.querySelector('.chain-pan')
    expect(pan).not.toBeNull()
    expect(pan?.contains(row)).toBe(false)
  })
})

/**
 * **계획이 하나도 없는 종목** (2026-09-11).
 *
 * 💀 막고 있던 것은 새 계획 칸이 계좌·상한·후보 선을 «이어받는 계획»에서 읽던
 * 것이었다. 셋 다 계획의 값이 아닌데(계좌 · ⑦ 통계 · 종목) 편해서 거기서
 * 읽었고, 그 편의가 **첫 계획의 길을 막고 있었다.**
 */
describe('첫 계획', () => {
  it('사슬에 «빈 자리»만 서고 거기가 문이다', async () => {
    // 목에 계획이 하나도 없는 종목
    const none = await planApi.getList({ stockCode: '005380' })
    expect(none.plans).toHaveLength(0)

    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    render(
      <QueryClientProvider client={qc}>
        <PlanDetailPage stockCode="005380" />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('button', { name: '이어서 세우기' }),
    ).toBeInTheDocument()
    expect(screen.getByText('이 종목에 계획이 없습니다.')).toBeInTheDocument()
  })

  it('계좌·상한·후보 선이 «계획이 아닌 데서» 온다', async () => {
    const d = await planApi.getDefaults('005380')
    // 계좌가 든다 (F7) — 계획이 없어도 있다
    expect(d.accountTotal).toBeGreaterThan(0)
    // ⑦ 통계가 낸다 (④-1-1-2)
    expect(d.stopLimit).toBeGreaterThan(0)
    // 종목이 든다 — 이동평균선·저항선이라 진입가의 함수가 아니다
    expect(d.stopCandidates.length).toBe(4)
    // 걸린 것이 없으니 실행 «전» 위험노출은 0 이다
    expect(d.riskBefore).toBe(0)
  })
})

/**
 * 사슬의 마디가 **어디로 가려 하는지.**
 *
 * 💀 주소는 바뀌는데 화면이 안 바뀌던 버그가 있었다 — 라우트 파일이
 * `/stocks/:ticker` 의 «자식»으로 잡혀서, 부모가 `<Outlet/>` 을 안 그리니
 * 자식이 영영 안 그려졌다. 여기서는 «링크가 제대로 붙었는지»까지만 본다.
 */
describe('사슬의 마디가 가리키는 곳', () => {
  it('«그 종목의 그 계획»을 가리킨다', async () => {
    const plan = await planApi.getDetail(1)
    show(plan)

    await screen.findAllByText(plan.title)
    const links = document.querySelectorAll('a[data-to]')
    expect(links.length).toBeGreaterThan(1)
    for (const a of links) {
      expect(a.getAttribute('data-to')).toBe('/stocks/$ticker/plan/$planId')
      const params = JSON.parse(a.getAttribute('data-params') ?? '{}') as {
        ticker?: string
        planId?: string
      }
      // 종목이 «주소에» 들어간다 — 계획은 그 종목 안의 한 마디다
      expect(params.ticker).toBe(plan.stockCode)
      expect(Number(params.planId)).toBeGreaterThan(0)
    }
  })
})

/**
 * **④-1-3 현금보다 큰 매수는 막는다.**
 *
 * ⚠️ 위험노출 2.5% 초과를 «경고만» 하는 것과 다르다 — 그건 판단의 문제고,
 * 이건 **기록이 사실과 어긋나는** 문제다. 그래서 화면도 서버도 막는다.
 */
describe('현금 부족', () => {
  it('화면이 ✕ 로 막고 «무엇을 고쳐야 하는지»를 말한다', async () => {
    const plan = await planApi.getDetail(1)
    show(plan)
    const user = userEvent.setup()

    await screen.findAllByText(plan.title)
    await user.click(screen.getByRole('button', { name: '수정' }))

    // 현금보다 큰 수량을 넣는다
    const qty = screen.getByLabelText('수량')
    await user.clear(qty)
    await user.type(qty, '999')

    // ⚠ 가 아니라 ✕ 다 — 기호가 형태로 갈리므로 색이 무너져도 남는다
    expect(await screen.findByText(/^✕ 현금/)).toBeInTheDocument()
  })

  it('서버도 막는다 — 화면만 막으면 «우회»된다', async () => {
    const { accountCash } = await planApi.getDefaults('000660')
    await expect(
      planApi.create({
        ...BLANK,
        title: '현금 초과',
        entryPrice: accountCash,
        quantity: 2,
      }),
    ).rejects.toThrow()
  })
})
