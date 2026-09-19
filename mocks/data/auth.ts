/**
 * 로그인 상태 목. 사용자 축(계획 · 거래 기록 · 계좌) 화면은 로그인해야 내용이 뜨므로
 * **처음엔 로그인된 채로 시작한다.** 로그아웃하면 이 탭에서는 로그아웃이 유지된다.
 *
 * 카카오는 목이 흉내 내지 않는다 — 동의 화면 대신 곧장 콜백으로 돌려보낸다.
 */
const KEY = 'mock-logged-out'

export const mockSession = {
  get loggedIn(): boolean {
    try {
      return sessionStorage.getItem(KEY) !== '1'
    } catch {
      return true
    }
  },
  set loggedIn(v: boolean) {
    try {
      if (v) sessionStorage.removeItem(KEY)
      else sessionStorage.setItem(KEY, '1')
    } catch {
      // 저장소가 막힌 환경 — 로그인된 채로 둔다
    }
  },
}

export const mockMe = {
  userId: 1,
  nickname: '개발자',
  provider: 'KAKAO' as const,
  email: null,
  joinedAt: '2026-09-18T10:00:00+09:00',
}
