import { createFileRoute } from '@tanstack/react-router'
import { SnapshotEditPage } from '@/pages/snapshots'

export const Route = createFileRoute('/snapshots/edit')({
  component: SnapshotEditPage,
})
