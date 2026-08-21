import { setRefreshHandler } from '@/shared/api'
import { authApi, ensureCsrfToken } from '../api/authApi'

let initialized = false

/**
 * 앱 시작 시 1회 호출. HTTP 클라이언트에 401 refresh 핸들러를 주입한다.
 * (entities → shared 단방향 의존을 유지하기 위한 주입 지점)
 */
export function initAuth(): void {
  if (initialized) return
  initialized = true
  setRefreshHandler(() => authApi.refresh())
}

/**
 * 새로고침 후 세션 복구. CSRF 토큰을 확보하고 refreshToken 쿠키로 accessToken 을
 * 재발급 시도한다. 실패해도(비로그인) 조용히 넘어간다.
 */
export async function restoreSession(): Promise<void> {
  try {
    await ensureCsrfToken()
    await authApi.refresh()
  } catch {
    // 백엔드 미가동/네트워크 오류 등 — 비로그인 상태로 앱을 띄운다.
  }
}
