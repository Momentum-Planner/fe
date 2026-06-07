import { createFileRoute } from '@tanstack/react-router'
import { SnapshotCreatePage } from '@/pages/snapshots'

export const Route = createFileRoute('/snapshots/new')({
  component: SnapshotCreatePage,
})
