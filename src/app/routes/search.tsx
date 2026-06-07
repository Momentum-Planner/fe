import { createFileRoute } from '@tanstack/react-router'
import { SearchResultsPage } from '@/pages/search'

type SearchParams = { q: string }

export const Route = createFileRoute('/search')({
  validateSearch: (search): SearchParams => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  component: SearchResultsPage,
})
