import { api } from '@/shared/api'
import { toLocalDate, toLocalDateTime, daysAgo } from '@/shared/lib/datetime'
import type {
  BaseListResponse,
  DailyCandleResponse,
  MovingAveragePeriod,
  MovingAverageResponse,
} from '../model/types'

/** 백엔드: from=LocalDate, to=LocalDateTime. 기본 구간은 최근 1년. */
export interface ChartRange {
  from?: string // LocalDate
  to?: string // LocalDateTime
}

function range({ from, to }: ChartRange = {}) {
  return {
    from: from ?? toLocalDate(daysAgo(365)),
    to: to ?? toLocalDateTime(),
  }
}

export const chartApi = {
  getDailyCandles: (stockCode: string, r?: ChartRange) =>
    api.get<DailyCandleResponse>(`/api/v1/stocks/${stockCode}/chart/daily`, {
      searchParams: range(r),
    }),

  getMovingAverages: (
    stockCode: string,
    period: MovingAveragePeriod,
    r?: ChartRange,
  ) =>
    api.get<MovingAverageResponse>(
      `/api/v1/stocks/${stockCode}/chart/moving-averages`,
      { searchParams: { period, ...range(r) } },
    ),

  getBases: (stockCode: string, r?: ChartRange) =>
    api.get<BaseListResponse>(`/api/v1/stocks/${stockCode}/chart/bases`, {
      searchParams: range(r),
    }),
}
