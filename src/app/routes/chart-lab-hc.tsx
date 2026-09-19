import { createFileRoute } from '@tanstack/react-router'
import { HighchartsLabPage } from '@/pages/chart-lab/ui/HighchartsLabPage'

export const Route = createFileRoute('/chart-lab-hc')({
  component: HighchartsLabPage,
})
