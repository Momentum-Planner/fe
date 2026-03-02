import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/market')({ component: MarketPage })

function MarketPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-(--sea-ink)">시장 동향</h1>
    </main>
  )
}
