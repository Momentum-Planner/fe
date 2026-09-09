/**
 * `plans_` 의 밑줄이 «중첩을 끊는다» — `plans.$planId` 로 두면 계획 컬렉션
 * 안쪽에 끼워지고 컬렉션이 Outlet 을 들어야 한다. 싱글은 컬렉션의 자식 화면이
 * 아니라 «다른 화면»이다.
 */
import { createFileRoute } from '@tanstack/react-router'
import { PlanDetailPage } from '@/pages/plan-detail'

export const Route = createFileRoute('/plans_/$planId')({
  component: () => {
    const { planId } = Route.useParams()
    return <PlanDetailPage planId={Number(planId)} />
  },
})
