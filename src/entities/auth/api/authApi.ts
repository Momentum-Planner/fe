import { api, setAccessToken, clearAccessToken } from '@/shared/api'
import type {
  AccessTokenResponse,
  Account,
  FindEmailRequest,
  FindEmailResponse,
  FindPasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '../model/types'

const BASE = '/api/v1/auth'

function hasCsrfCookie(): boolean {
  return /(?:^|; )csrfToken=/.test(document.cookie)
}

/**
 * CSRF 토큰 쿠키를 보장한다. 백엔드는 login/refresh/logout POST 에 대해
 * `X-CSRF-Token` 헤더(쿠키 echo)를 요구하므로, 해당 호출 전에 쿠키가 없으면
 * 먼저 발급받는다.
 */
export async function ensureCsrfToken(): Promise<void> {
  if (hasCsrfCookie()) return
  await api.get<void>(`${BASE}/csrf`)
}

export const authApi = {
  /** CSRF 토큰 발급 (쿠키 설정). */
  csrf: () => api.get<void>(`${BASE}/csrf`),

  async login(req: LoginRequest): Promise<AccessTokenResponse> {
    await ensureCsrfToken()
    const res = await api.post<AccessTokenResponse>(`${BASE}/login`, req)
    setAccessToken(res.accessToken)
    return res
  },

  async register(req: RegisterRequest): Promise<AccessTokenResponse> {
    const res = await api.post<AccessTokenResponse>(`${BASE}/register`, req)
    setAccessToken(res.accessToken)
    return res
  },

  account: () => api.get<Account>(`${BASE}/account`),

  /**
   * refreshToken(HttpOnly 쿠키)으로 accessToken 을 재발급한다.
   * 401 자동 재시도 루프에 걸리지 않도록 skipAuthRefresh 로 호출한다.
   * 실패 시 accessToken 을 비우고 null 을 반환한다.
   */
  async refresh(): Promise<string | null> {
    try {
      await ensureCsrfToken()
      const res = await api.post<AccessTokenResponse>(
        `${BASE}/refresh`,
        undefined,
        { skipAuthRefresh: true },
      )
      setAccessToken(res.accessToken)
      return res.accessToken
    } catch {
      clearAccessToken()
      return null
    }
  },

  async logout(): Promise<void> {
    await ensureCsrfToken()
    try {
      await api.post<void>(`${BASE}/logout`)
    } finally {
      clearAccessToken()
    }
  },

  findEmail: (req: FindEmailRequest) =>
    api.post<FindEmailResponse>(`${BASE}/email/find`, req),

  findPassword: (req: FindPasswordRequest) =>
    api.post<void>(`${BASE}/password/find`, req),
}
