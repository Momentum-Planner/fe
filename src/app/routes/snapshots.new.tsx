import { createFileRoute } from '@tanstack/react-router'
import { SnapshotCreatePage } from '@/pages/snapshots'

type NewSearch = { ticker?: string }

export const Route = createFileRoute('/snapshots/new')({
  // ticker = 종목코드(stockCode). 종목 상세에서 진입 시 전달된다.
  validateSearch: (search: Record<string, unknown>): NewSearch => ({
    ticker: typeof search.ticker === 'string' ? search.ticker : undefined,
  }),
  component: SnapshotCreatePage,
})
