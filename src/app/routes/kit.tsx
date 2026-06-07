import { createFileRoute } from '@tanstack/react-router'
import { KitPage } from '@/pages/kit'

export const Route = createFileRoute('/kit')({
  component: KitPage,
})
