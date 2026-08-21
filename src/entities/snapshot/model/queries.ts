import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { snapshotApi } from '../api/snapshotApi'
import type {
  SnapshotCreateRequest,
  SnapshotListFilters,
  SnapshotUpdateRequest,
} from './types'

export const snapshotKeys = {
  all: ['snapshot'] as const,
  list: (filters: SnapshotListFilters) =>
    [...snapshotKeys.all, 'list', filters] as const,
  detail: (id: number) => [...snapshotKeys.all, 'detail', id] as const,
}

export function useSnapshotList(filters: SnapshotListFilters = {}) {
  return useQuery({
    queryKey: snapshotKeys.list(filters),
    queryFn: () => snapshotApi.getList(filters),
  })
}

export function useSnapshotDetail(id: number | null | undefined) {
  return useQuery({
    queryKey: snapshotKeys.detail(id as number),
    queryFn: () => snapshotApi.getDetail(id as number),
    enabled: id != null,
  })
}

export function useCreateSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: SnapshotCreateRequest) => snapshotApi.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: snapshotKeys.all }),
  })
}

export function useUpdateSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ snapshotId, ...req }: SnapshotUpdateRequest) =>
      snapshotApi.update(snapshotId, { snapshotId, ...req }),
    onSuccess: () => qc.invalidateQueries({ queryKey: snapshotKeys.all }),
  })
}
