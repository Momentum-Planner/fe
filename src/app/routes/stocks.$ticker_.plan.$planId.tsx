/**
 * 그 종목의 «계획 하나»가 골라진 상태.
 *
 * 💀 전에는 `/plans/:planId` 였다. 그러면 계획이 종목과 «떨어진» 것처럼 읽히는데,
 * 실제로는 사슬도 차트도 종목 하나에 묶여 있다 — 계획은 그 종목 안의 한 마디다.
 * 주소가 그 사실을 말해야 한다 (2026-09-11).
 *
 * ⚠️ 「거래 계획」 내비는 계획 «컬렉션»(`/plans`)이다. 이 화면은 그 자식이 아니다.
 *
 * 💀 파일 이름의 **`$ticker_` 뒤 밑줄**이 `/stocks/:ticker` 라우트와의 «중첩을
 * 끊는다». 밑줄이 없으면 이 화면이 그 라우트의 «자식»이 되는데, 부모가
 * `<Outlet/>` 을 안 그리므로 **주소만 바뀌고 화면은 그대로 있었다** —
 * 「계획을 눌러도 그 계획으로 안 넘어간다」가 이것이었다 (2026-09-11).
 *
 * 부모가 페이지 하나를 통째로 그리는 화면이라 `Outlet` 을 낄 자리가 없다.
 * 둘은 «같은 컴포넌트의 다른 상태»이지 부모–자식이 아니다.
 */
import { createFileRoute } from '@tanstack/react-router'
import { PlanDetailPage } from '@/pages/plan-detail'

export const Route = createFileRoute('/stocks/$ticker_/plan/$planId')({
  component: () => {
    const { ticker, planId } = Route.useParams()
    return <PlanDetailPage stockCode={ticker} planId={Number(planId)} />
  },
})
