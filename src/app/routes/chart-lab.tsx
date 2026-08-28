import { createFileRoute } from '@tanstack/react-router'
import { ChartLabPage } from '@/pages/chart-lab'

export const Route = createFileRoute('/chart-lab')({
  component: ChartLabPage,
})
