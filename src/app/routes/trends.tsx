import { createFileRoute } from '@tanstack/react-router'
import { TrendsPage } from '@/pages/trends'

interface TrendsSearch {
  /** 목록에서 고른 종목 — 없으면 1위 (Q23 · 4장 ① 가) */
  code?: string
}

export const Route = createFileRoute('/trends')({
  validateSearch: (search: Record<string, unknown>): TrendsSearch =>
    typeof search.code === 'string' && search.code ? { code: search.code } : {},
  component: TrendsRoute,
})

function TrendsRoute() {
  const { code } = Route.useSearch()
  return <TrendsPage code={code} />
}
