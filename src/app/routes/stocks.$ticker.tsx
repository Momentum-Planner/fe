/**
 * 종목 세부 — **계획 화면이 이 자리를 흡수했다** (2026-09-11).
 *
 * 차트·사슬·계획이 한 화면에 있으므로 「종목을 본다」와 「그 종목의 계획을 본다」가
 * 같은 화면이다. `/trends` 에서 하이닉스를 누르면 여기로 온다.
 *
 * 계획을 «안 고르면» 화면이 하나를 고른다 — 실행 중이 있으면 그것, 없으면 최신.
 * 고르고 나면 URL 이 `/stocks/:ticker/plan/:planId` 로 깊어진다.
 */
import { createFileRoute } from '@tanstack/react-router'
import { PlanDetailPage } from '@/pages/plan-detail'

export const Route = createFileRoute('/stocks/$ticker')({
  component: () => {
    const { ticker } = Route.useParams()
    return <PlanDetailPage stockCode={ticker} />
  },
})
