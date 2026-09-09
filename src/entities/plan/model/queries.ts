import { useQuery } from '@tanstack/react-query'
import { planApi } from '../api/planApi'
import type { PlanListFilters } from './types'

export const planKeys = {
  all: ['plan'] as const,
  list: (filters: PlanListFilters) =>
    [...planKeys.all, 'list', filters] as const,
  detail: (id: number) => [...planKeys.all, 'detail', id] as const,
  position: (stockCode: string) =>
    [...planKeys.all, 'position', stockCode] as const,
}

export function usePlanList(filters: PlanListFilters = {}) {
  return useQuery({
    queryKey: planKeys.list(filters),
    queryFn: () => planApi.getList(filters),
    select: (res) => res.plans,
  })
}

export function usePlanDetail(id: number | null | undefined) {
  return useQuery({
    queryKey: planKeys.detail(id as number),
    queryFn: () => planApi.getDetail(id as number),
    enabled: id != null,
  })
}

export function useStockPosition(stockCode: string | null | undefined) {
  return useQuery({
    queryKey: planKeys.position(stockCode as string),
    queryFn: () => planApi.getPosition(stockCode as string),
    enabled: !!stockCode,
  })
}
