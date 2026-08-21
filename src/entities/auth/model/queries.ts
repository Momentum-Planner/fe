import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import type { FindEmailRequest, LoginRequest, RegisterRequest } from './types'

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

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: LoginRequest) => authApi.login(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.account() }),
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: RegisterRequest) => authApi.register(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.account() }),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.account() }),
  })
}

export function useFindEmail() {
  return useMutation({
    mutationFn: (req: FindEmailRequest) => authApi.findEmail(req),
  })
}

export function useFindPassword() {
  return useMutation({
    mutationFn: authApi.findPassword,
  })
}
