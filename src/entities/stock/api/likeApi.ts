import { api } from '@/shared/api'
import type { LikeStockResponse } from '../model/types'

/**
 * 백엔드 관심종목 API 는 memberId 를 쿼리 파라미터로 받는다(현재 명세 기준).
 * memberId 는 로그인 계정(useAccount().userId)에서 가져온다.
 */
export const likeApi = {
  getLikes: (memberId: number) =>
    api.get<LikeStockResponse>('/api/v1/stocks/likes', {
      searchParams: { memberId },
    }),

  addLike: (memberId: number, stockCode: string) =>
    api.post<void>(`/api/v1/stocks/${stockCode}/like`, undefined, {
      searchParams: { memberId },
    }),

  removeLike: (memberId: number, stockCode: string) =>
    api.delete<void>(`/api/v1/stocks/${stockCode}/like`, {
      searchParams: { memberId },
    }),
}
