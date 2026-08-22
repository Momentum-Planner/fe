import { createFileRoute } from '@tanstack/react-router'
import { StatsPage } from '@/pages/stats'

/** ⑨ 지표 + ⑧ 그룹별 성과 + ⑦ 거래 목록 (Q1). */
export const Route = createFileRoute('/stats')({
  component: StatsPage,
})
