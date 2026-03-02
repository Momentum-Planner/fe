import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile')({ component: ProfilePage })

function ProfilePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-(--sea-ink)">내 정보</h1>
    </main>
  )
}
