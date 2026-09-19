/** 백엔드 MemberV1Dto 와 1:1 대응. */

export type OAuthProvider = 'KAKAO'

export interface MyInfo {
  userId: number
  nickname: string
  /** 소셜 로그인 회원이면 공급자, 이메일 가입 회원이면 null */
  provider: OAuthProvider | null
  /** 이메일 가입 회원만 있다 */
  email: string | null
  joinedAt: string
}

export interface UpdateMyInfoRequest {
  nickname: string
}

/** 백엔드 MemberService.NICKNAME_MAX_LENGTH 와 같은 값 */
export const NICKNAME_MAX_LENGTH = 20
