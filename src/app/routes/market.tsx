import { MarketPage } from '@/pages/market'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/market')({ component: MarketPage })
