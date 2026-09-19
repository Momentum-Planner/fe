import { ApiError, api } from '@/shared/api'
import type { Account, OAuthAuthorizeUrlResponse } from '../model/types'

const BASE = '/api/v1/auth'

const LOGGED_OUT: Account = { isLoggedIn: false, userId: null, nickname: null }

/**
 * 토큰은 전부 HttpOnly 쿠키다 — 로그인·refresh 응답에 바디가 없다.
 * CSRF 헤더는 shared/api 의 클라이언트가 상태를 바꾸는 요청마다 붙인다.
 */
export const authApi = {
  /**
   * `/account` 는 보호 경로라 비로그인이면 401 이다(refresh 도 실패한 뒤).
   * 화면은 그것을 오류가 아니라 「비로그인」으로 읽는다.
   */
  async account(): Promise<Account> {
    try {
      return await api.get<Account>(`${BASE}/account`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return LOGGED_OUT
      throw e
    }
  },

  /** refreshToken 쿠키로 두 쿠키를 다시 받는다. 401 재시도 루프에 걸리지 않게 skipAuthRefresh. */
  async refresh(): Promise<boolean> {
    try {
      await api.post<void>(`${BASE}/refresh`, undefined, {
        skipAuthRefresh: true,
      })
      return true
    } catch {
      return false
    }
  },

  logout: () =>
    api.post<void>(`${BASE}/logout`, undefined, { skipAuthRefresh: true }),

  kakaoAuthorizeUrl: (state: string) =>
    api.get<OAuthAuthorizeUrlResponse>(`${BASE}/oauth/kakao/authorize-url`, {
      searchParams: { state },
    }),

  kakaoLogin: (code: string) =>
    api.post<void>(`${BASE}/oauth/kakao`, { code }, { skipAuthRefresh: true }),
}
