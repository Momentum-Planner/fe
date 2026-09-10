import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
    // 필터가 바뀌어도 «앞의 목록을 들고 있는다» — 계획 싱글의 사슬이 이 목록으로
    // 그려지는데, 빈 배열로 한 번 지나가면 마디가 사라졌다 다시 선다
    placeholderData: keepPreviousData,
  })
}

export function usePlanDetail(id: number | null | undefined) {
  return useQuery({
    queryKey: planKeys.detail(id as number),
    queryFn: () => planApi.getDetail(id as number),
    enabled: id != null,
    /**
     * **다른 계획으로 옮겨도 앞 계획을 들고 있는다.**
     *
     * 이게 없으면 사슬에서 마디를 누를 때마다 `isLoading` 이 되어 화면이 통째로
     * 「불러오는 중」으로 갈린다 — 사슬이 언마운트되고 가로 스크롤이 0 으로
     * 돌아간다. 「눌러도 왼쪽으로 안 가는 경우」가 이것이었다. 캐시에 있으면
     * 안 갈리고 없으면 갈리니 «될 때도 있고 안 될 때도» 있었다.
     *
     * 사슬은 계획을 옮겨 다녀도 «안 변하는 틀»이다 (Q3).
     */
    placeholderData: keepPreviousData,
  })
}

export function useStockPosition(stockCode: string | null | undefined) {
  return useQuery({
    queryKey: planKeys.position(stockCode as string),
    queryFn: () => planApi.getPosition(stockCode as string),
    enabled: !!stockCode,
  })
}
