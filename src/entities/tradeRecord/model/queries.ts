import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { tradeRecordApi } from '../api/tradeRecordApi'
import type { NewTradeRecord, TradeListFilters } from './types'

export const tradeRecordKeys = {
  all: ['tradeRecord'] as const,
  list: (filters: TradeListFilters) =>
    [...tradeRecordKeys.all, 'list', filters] as const,
  stats: (filters: TradeListFilters) =>
    [...tradeRecordKeys.all, 'stats', filters] as const,
}

export function useTradeList(filters: TradeListFilters = {}) {
  return useQuery({
    queryKey: tradeRecordKeys.list(filters),
    queryFn: () => tradeRecordApi.getList(filters),
    select: (res) => res.records,
    placeholderData: keepPreviousData,
  })
}

/**
 * ⑦ 통계.
 *
 * 기간 필터를 걸었다 풀 때 **앞의 값을 들고 있는다** — 화면이 위에서 아래로
 * 층을 이루고 있어서, 빈 응답이 한 번 지나가면 아래 층이 통째로 접혔다 다시
 * 열린다. 계획 싱글의 사슬과 같은 이유다.
 */
export function useTradeStats(filters: TradeListFilters = {}) {
  return useQuery({
    queryKey: tradeRecordKeys.stats(filters),
    queryFn: () => tradeRecordApi.getStats(filters),
    placeholderData: keepPreviousData,
  })
}

/**
 * 체결에 계획을 붙인다 (Q21) — 목록 · 통계가 같이 흔들리므로 `all` 을 통째로 무효화한다.
 * 계획 쪽 상태(대기 → 실행 중 · 승계)도 바뀌므로 계획 목록도 다시 받는다.
 */
export function useAssignPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      recordId,
      planId,
    }: {
      recordId: number
      planId: number | null
    }) => tradeRecordApi.assignPlan(recordId, planId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tradeRecordKeys.all })
      void qc.invalidateQueries({ queryKey: ['plan'] })
    },
  })
}

/**
 * 체결을 적는다 (F2) — 계획 상태 · 보유수량 · 현금이 같이 움직이므로
 * 거래 기록 · 계획 · 계좌를 전부 다시 받는다.
 */
export function useCreateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NewTradeRecord) => tradeRecordApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tradeRecordKeys.all })
      void qc.invalidateQueries({ queryKey: ['plan'] })
      void qc.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}

/** 체결을 고치고 지운다 (Q23 ⑤) — 계획 상태가 체결에서 다시 나오므로 계획도 다시 받는다 */
function useRecordChange<TArg>(fn: (a: TArg) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tradeRecordKeys.all })
      void qc.invalidateQueries({ queryKey: ['plan'] })
    },
  })
}

export const useUpdateRecord = () =>
  useRecordChange(
    ({
      recordId,
      patch,
    }: {
      recordId: number
      patch: { price?: number; quantity?: number; filledAt?: string }
    }) => tradeRecordApi.update(recordId, patch),
  )

export const useDeleteRecord = () =>
  useRecordChange((recordId: number) => tradeRecordApi.remove(recordId))
