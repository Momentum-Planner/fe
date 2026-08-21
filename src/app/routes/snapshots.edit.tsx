import { createFileRoute } from '@tanstack/react-router'
import { SnapshotEditPage } from '@/pages/snapshots'

type EditSearch = { id?: number }

export const Route = createFileRoute('/snapshots/edit')({
  validateSearch: (search: Record<string, unknown>): EditSearch => ({
    id: search.id != null ? Number(search.id) : undefined,
  }),
  component: SnapshotEditPage,
})
