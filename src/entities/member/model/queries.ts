import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memberApi } from '../api/memberApi'
import type { UpdateMyInfoRequest } from './types'

export const memberKeys = {
  all: ['member'] as const,
  me: () => [...memberKeys.all, 'me'] as const,
}

export function useMyInfo(enabled = true) {
  return useQuery({
    queryKey: memberKeys.me(),
    queryFn: () => memberApi.me(),
    enabled,
  })
}

/**
 * ⚠️ 닉네임은 상단 바 계정 칩(auth 의 account)에도 있다. entities 끼리는 서로 모르므로
 * 그쪽을 새로 받는 것은 부르는 페이지의 몫이다.
 */
export function useUpdateMyInfo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: UpdateMyInfoRequest) => memberApi.updateMe(req),
    onSuccess: (me) => qc.setQueryData(memberKeys.me(), me),
  })
}
