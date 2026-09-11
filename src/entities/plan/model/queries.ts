import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { planApi } from '../api/planApi'
import type { PlanClose, PlanCreate, PlanListFilters, PlanPatch } from './types'

export const planKeys = {
  all: ['plan'] as const,
  list: (filters: PlanListFilters) =>
    [...planKeys.all, 'list', filters] as const,
  detail: (id: number) => [...planKeys.all, 'detail', id] as const,
  position: (stockCode: string) =>
    [...planKeys.all, 'position', stockCode] as const,
  defaults: (stockCode: string) =>
    [...planKeys.all, 'defaults', stockCode] as const,
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

/**
 * 계획 수정.
 *
 * 성공하면 **싱글과 목록을 둘 다** 비운다 — 사슬이 목록으로 그려지므로, 싱글만
 * 갱신하면 마디의 가격·수량이 옛 값으로 남는다.
 */
/**
 * 계획을 세울 때 «계획이 아닌 데서» 오는 값들 (계좌 · 통계 · 종목).
 * 계획이 하나도 없는 종목에서도 온다 — 첫 계획이 여기에 기댄다.
 */
export function usePlanDefaults(stockCode: string | null | undefined) {
  return useQuery({
    queryKey: planKeys.defaults(stockCode as string),
    queryFn: () => planApi.getDefaults(stockCode as string),
    enabled: !!stockCode,
  })
}

export function useUpdatePlan(planId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: PlanPatch) => planApi.update(planId, patch),
    onSuccess: (next) => {
      qc.setQueryData(planKeys.detail(planId), next)
      void qc.invalidateQueries({ queryKey: [...planKeys.all, 'list'] })
      // 손절가가 바뀌면 종목의 «지금 손절가»도 바뀐다 — 실행 중 계획이 그 값을 든다
      void qc.invalidateQueries({
        queryKey: planKeys.position(next.stockCode),
      })
    },
  })
}

/**
 * 계획을 «세운다».
 *
 * 상세를 미리 꽂아 둔다 — 세운 직후 그 싱글로 가므로, 캐시에 없으면 한 번
 * 「불러오는 중」을 지난다. 목록은 비운다.
 */
export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PlanCreate) => planApi.create(body),
    onSuccess: (next) => {
      qc.setQueryData(planKeys.detail(next.planId), next)
      void qc.invalidateQueries({ queryKey: [...planKeys.all, 'list'] })
    },
  })
}

/**
 * 계획 폐기 (Q8) — **삭제와 다른 행위다.**
 *
 * 계획이 사라지지 않으므로 캐시를 «비우지 않고 갈아끼운다». 사슬이 목록으로
 * 그려지는데, 폐기한 마디는 거기서 «회색으로 남아야» 한다.
 */
export function useClosePlan() {
  const qc = useQueryClient()
  return useMutation({
    /**
     * **대상을 인자로 받는다.** 훅이 계획 하나에 묶여 있으면 사슬에서 «옆 마디»를
     * 닫을 수 없다 — 문은 사슬에 있는데 훅은 지금 보는 계획만 들고 있게 된다.
     */
    mutationFn: ({ planId, ...body }: PlanClose & { planId: number }) =>
      planApi.close(planId, body),
    onSuccess: (next) => {
      qc.setQueryData(planKeys.detail(next.planId), next)
      void qc.invalidateQueries({ queryKey: [...planKeys.all, 'list'] })
      // 실행 중이던 계획을 폐기하면 종목의 «지금 손절가»가 주인을 잃는다.
      // ⚠️ 그 물량을 어디로 보낼지는 최종미지가 안 말한다 (Q8 남은 미결)
      void qc.invalidateQueries({
        queryKey: planKeys.position(next.stockCode),
      })
    },
  })
}

/**
 * 계획 삭제 (Q8) — **없던 일로 만든다.**
 *
 * 폐기와 달리 상세 캐시를 «지운다». 남겨 두면 목록에서 빠진 계획을 싱글이
 * 계속 그리고 있어, 「지웠는데 아직 있다」로 읽힌다.
 *
 * ⚠️ 화면 이동은 여기서 안 한다 — 지운 계획의 싱글에 머무를 수 없으므로
 *    부르는 쪽이 어디로 갈지 정한다.
 */
export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    /** 대상을 인자로 받는 이유는 `useClosePlan` 과 같다 */
    mutationFn: (planId: number) => planApi.remove(planId),
    onSuccess: (_data, planId) => {
      qc.removeQueries({ queryKey: planKeys.detail(planId) })
      void qc.invalidateQueries({ queryKey: [...planKeys.all, 'list'] })
    },
  })
}
