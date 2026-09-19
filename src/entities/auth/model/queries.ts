import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/authApi'

export const authKeys = {
  all: ['auth'] as const,
  account: () => [...authKeys.all, 'account'] as const,
}

/** 현재 로그인 계정 조회. 비로그인 시 isLoggedIn=false 가 내려온다. */
export function useAccount() {
  return useQuery({
    queryKey: authKeys.account(),
    queryFn: () => authApi.account(),
  })
}

export function useKakaoLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => authApi.kakaoLogin(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.account() }),
  })
}

/** 로그아웃하면 사용자 축 캐시(계획·거래 기록·내 정보)가 남지 않게 전부 비운다. */
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      qc.clear()
    },
  })
}
