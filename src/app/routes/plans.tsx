import { createFileRoute } from '@tanstack/react-router'
import { PlansPage } from '@/pages/plans'

export const Route = createFileRoute('/plans')({
  component: PlansPage,
})
