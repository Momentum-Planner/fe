/** 백엔드 AuthV1Dto 와 1:1 대응하는 인증 도메인 타입. */

export interface Account {
  isLoggedIn: boolean
  userId: number | null
  nickname: string | null
}

export interface OAuthAuthorizeUrlResponse {
  url: string
}
