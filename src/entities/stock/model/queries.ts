import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chartApi } from '../api/chartApi'
import type { ChartRange } from '../api/chartApi'
import { insightApi } from '../api/insightApi'
import { likeApi } from '../api/likeApi'
import type { MovingAveragePeriod } from './types'

export const stockKeys = {
  all: ['stock'] as const,
  chart: (code: string) => [...stockKeys.all, 'chart', code] as const,
  daily: (code: string, r?: ChartRange) =>
    [...stockKeys.chart(code), 'daily', r ?? null] as const,
  ma: (code: string, period: MovingAveragePeriod, r?: ChartRange) =>
    [...stockKeys.chart(code), 'ma', period, r ?? null] as const,
  bases: (code: string, r?: ChartRange) =>
    [...stockKeys.chart(code), 'bases', r ?? null] as const,
  insight: (code: string, kind: string, at?: string) =>
    [...stockKeys.all, 'insight', code, kind, at ?? 'now'] as const,
  likes: (memberId: number | null | undefined) =>
    [...stockKeys.all, 'likes', memberId ?? null] as const,
}

// ─────────────── 차트 ───────────────

export function useDailyCandles(code: string, r?: ChartRange, enabled = true) {
  return useQuery({
    queryKey: stockKeys.daily(code, r),
    queryFn: () => chartApi.getDailyCandles(code, r),
    enabled: enabled && !!code,
    select: (res) => res.candles,
  })
}

export function useMovingAverages(
  code: string,
  period: MovingAveragePeriod,
  r?: ChartRange,
  enabled = true,
) {
  return useQuery({
    queryKey: stockKeys.ma(code, period, r),
    queryFn: () => chartApi.getMovingAverages(code, period, r),
    enabled: enabled && !!code,
  })
}

export function useBases(code: string, r?: ChartRange, enabled = true) {
  return useQuery({
    queryKey: stockKeys.bases(code, r),
    queryFn: () => chartApi.getBases(code, r),
    enabled: enabled && !!code,
    select: (res) => res.bases,
  })
}

// ─────────────── 인사이트 (8종) ───────────────

function insightQuery<T>(
  code: string,
  kind: string,
  fetcher: () => Promise<T>,
  at?: string,
  enabled = true,
) {
  return {
    queryKey: stockKeys.insight(code, kind, at),
    queryFn: fetcher,
    enabled: enabled && !!code,
  }
}

export const useBaseStageInsight = (
  code: string,
  at?: string,
  enabled = true,
) =>
  useQuery(
    insightQuery(
      code,
      'base-stage',
      () => insightApi.baseStage(code, at),
      at,
      enabled,
    ),
  )

export const useRegimeInsight = (code: string, at?: string, enabled = true) =>
  useQuery(
    insightQuery(
      code,
      'regime',
      () => insightApi.regime(code, at),
      at,
      enabled,
    ),
  )

export const useMovingAverageInsight = (
  code: string,
  at?: string,
  enabled = true,
) =>
  useQuery(
    insightQuery(
      code,
      'moving-average',
      () => insightApi.movingAverage(code, at),
      at,
      enabled,
    ),
  )

export const useMomentumInsight = (code: string, at?: string, enabled = true) =>
  useQuery(
    insightQuery(
      code,
      'momentum',
      () => insightApi.momentum(code, at),
      at,
      enabled,
    ),
  )

export const useVolumeInsight = (code: string, at?: string, enabled = true) =>
  useQuery(
    insightQuery(
      code,
      'volume',
      () => insightApi.volume(code, at),
      at,
      enabled,
    ),
  )

export const useFipInsight = (code: string, at?: string, enabled = true) =>
  useQuery(
    insightQuery(code, 'fip', () => insightApi.fip(code, at), at, enabled),
  )

export const useRsInsight = (code: string, at?: string, enabled = true) =>
  useQuery(insightQuery(code, 'rs', () => insightApi.rs(code, at), at, enabled))

export const useEpsInsight = (code: string, at?: string, enabled = true) =>
  useQuery(
    insightQuery(code, 'eps', () => insightApi.eps(code, at), at, enabled),
  )

// ─────────────── 관심 종목 ───────────────

export function useLikes(memberId: number | null | undefined) {
  return useQuery({
    queryKey: stockKeys.likes(memberId),
    queryFn: () => likeApi.getLikes(memberId as number),
    enabled: memberId != null,
    select: (res) => res.stocks,
  })
}

export function useAddLike(memberId: number | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stockCode: string) =>
      likeApi.addLike(memberId as number, stockCode),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: stockKeys.likes(memberId) }),
  })
}

export function useRemoveLike(memberId: number | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stockCode: string) =>
      likeApi.removeLike(memberId as number, stockCode),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: stockKeys.likes(memberId) }),
  })
}
