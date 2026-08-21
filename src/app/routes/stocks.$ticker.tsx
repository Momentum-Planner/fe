import { createFileRoute } from '@tanstack/react-router'
import { StockDetailPage } from '@/pages/stocks'

export const Route = createFileRoute('/stocks/$ticker')({
  component: StockDetailPage,
})
