/**
 * accessToken 인메모리 스토어. refreshToken 은 HttpOnly 쿠키라 JS 가 접근할 수
 * 없으므로, accessToken 만 메모리에 보관한다. 새로고침 시에는 비어 있으며
 * `POST /auth/refresh` 로 복구한다(refreshToken 쿠키 기반).
 *
 * localStorage 가 아닌 메모리에 두는 이유: XSS 로 토큰이 탈취되는 표면을 줄이기
 * 위함. 짧은 수명의 accessToken + HttpOnly refresh 쿠키 조합이 권장 패턴이다.
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
