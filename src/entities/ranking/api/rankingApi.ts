import { api } from '@/shared/api'
import type { RankingResponse, Regime } from '../model/types'

const BASE = '/api/v1/ranking'

/**
 * 백엔드 `at` 은 LocalDateTime(ISO_DATE_TIME, 타임존 없음) 을 요구한다.
 * 클라이언트 로컬 벽시계 기준 `YYYY-MM-DDTHH:mm:ss` 로 포맷한다.
 */
function toLocalDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

const PATH: Record<Regime, string> = {
  success: `${BASE}/breakout-success`,
  ready: `${BASE}/breakout-ready`,
}

export const rankingApi = {
  /** 레짐별 랭킹 스냅샷 조회. at 미지정 시 현재 시각으로 조회. */
  getRanking: (regime: Regime, at: string = toLocalDateTime()) =>
    api.get<RankingResponse>(PATH[regime], { searchParams: { at } }),
}
