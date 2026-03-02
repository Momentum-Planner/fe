import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/captures')({ component: CapturesPage })

function CapturesPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-(--sea-ink)">내 캡쳐</h1>
    </main>
  )
}
