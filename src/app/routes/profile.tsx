import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/profile'
import { StatsPage } from '@/pages/stats'

/**
 * 마이페이지 = 내 정보 + **거래 통계** (2026-09-19 사용자 「거래 통계의 내용은 마이페이지로」).
 * 두 페이지를 이 라우트가 잇는다 — 페이지끼리는 서로를 모른다(FSD). 내비의 「거래 통계」 는 뺐다.
 */
function ProfileWithStats() {
  return (
    <>
      <ProfilePage />
      <StatsPage />
    </>
  )
}

export const Route = createFileRoute('/profile')({
  component: ProfileWithStats,
})
