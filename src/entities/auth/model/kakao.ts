import { authApi } from '../api/authApi'

/**
 * 카카오 로그인의 state. 동의 화면으로 보내기 전에 만들어 두고, 콜백에서 대조한다.
 * 남이 만든 콜백 주소(자기 code 를 심은 링크)로 우리 사용자를 로그인시키는 것을 막는다.
 *
 * sessionStorage — 탭 하나에만 살고, 카카오를 다녀와도 같은 탭이면 남아 있다.
 */
const STATE_KEY = 'kakao-oauth-state'

export async function startKakaoLogin(): Promise<void> {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  const { url } = await authApi.kakaoAuthorizeUrl(state)
  window.location.assign(url)
}

/** 콜백의 state 가 우리가 보낸 것과 같은지. 한 번 쓰면 지운다. */
export function consumeKakaoState(state: string | undefined): boolean {
  const saved = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return !!saved && saved === state
}
