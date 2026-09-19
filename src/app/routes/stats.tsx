import { createFileRoute, redirect } from '@tanstack/react-router'
import { StatsPage } from '@/pages/stats'

/**
 * ⑦ 거래 통계.
 *
 * **루트 내비에 남는다** — Q3 은 「거래 기록 컬렉션 뷰의 한 형식」이라 내비에서
 * 빠진다고 했는데, Q3 대비쌍의 *「통계를 매일 여러 번 본다 → 루트 내비로
 * 올린다」* 를 택했다 (Q9). 오브젝트가 아니라는 판정은 그대로다.
 *
 * 화면은 **셋**이다 — 월별 손익 워터폴(왼쪽) + 요약(오른쪽), 그 아래 거래 기록.
 * 자세한 것은 `pages/stats/ui/StatsPage.tsx` 머리주석.
 *
 * ⚠️ 옛 주석이 폐기된 **⑦⑧⑨ 번호**로 적혀 있었다 (「⑨ 지표 + ⑧ 그룹별 성과」).
 *    지금 유효한 것은 ①~⑧ 이고 통계는 ⑦ 이다.
 */
export const Route = createFileRoute('/stats')({
  // 거래 통계는 마이페이지로 옮겼다 (2026-09-19) — 옛 주소로 오면 거기로 보낸다
  beforeLoad: () => {
    throw redirect({ to: '/profile' })
  },
  component: StatsPage,
})
