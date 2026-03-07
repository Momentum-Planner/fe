import { CapturesPage } from '@/pages/captures'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/captures')({ component: CapturesPage })
