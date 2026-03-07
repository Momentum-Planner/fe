import { createFileRoute } from '@tanstack/react-router'
import { TrendsPage } from '@/pages/trends'

export const Route = createFileRoute('/trends')({ component: TrendsPage })
