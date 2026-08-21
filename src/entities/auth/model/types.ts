/** 백엔드 AuthV1Dto 와 1:1 대응하는 인증 도메인 타입. */

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  phoneNumber: string
}

/** login / register / refresh 응답 공통: accessToken 만 바디로 내려온다. */
export interface AccessTokenResponse {
  accessToken: string
}

export interface FindEmailRequest {
  phoneNumber: string
  name: string
}

export interface FindEmailResponse {
  email: string
}

export interface FindPasswordRequest {
  email: string
  name: string
}

export interface Account {
  isLoggedIn: boolean
  userId: number | null
  nickname: string | null
}
