import { setRefreshHandler } from '@/shared/api'
import { authApi } from '../api/authApi'

let initialized = false

/**
 * 앱 시작 시 1회 호출. HTTP 클라이언트에 401 refresh 핸들러를 주입한다.
 * (entities → shared 단방향 의존을 유지하기 위한 주입 지점)
 *
 * 새로고침 뒤 세션 복구는 따로 안 한다 — 쿠키가 남아 있으니 첫 요청이 그대로
 * 인증되고, accessToken 이 만료됐으면 그 요청의 401 이 refresh 를 부른다.
 */
export function initAuth(): void {
  if (initialized) return
  initialized = true
  setRefreshHandler(() => authApi.refresh())
}
