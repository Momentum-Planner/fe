import { createFileRoute, redirect } from '@tanstack/react-router'
import { queryClient } from '@/shared/api'
import { authKeys } from '@/entities/auth'
import type { Account } from '@/entities/auth'

/**
 * 첫 화면을 계정 상태로 가른다 (Q7-2).
 *
 * Q7+Q3 의 우측 탭이 「로그인 O · 활성 계획 ≥1건 → 오늘의 계획」을 기본으로
 * 띄우고 있었는데, 탭이 없어지며 그 자리가 비었다. 최종미지 둘째 줄
 * (「충동적으로 매매하지 않고」)은 **먼저 보이는 것**으로 미는 것이라
 * 진입 지점을 옮겨 그 몫을 되살린다.
 *
 * ⚠️ TradePlan API 가 없어 **계획 건수는 아직 못 본다.** 계획이 0건이면
 *    빈 화면으로 보내게 되므로, API 가 붙으면 「활성 계획 ≥1건」 조건을 더한다.
 */

/** 계정 응답을 이 시간까지만 기다린다. 못 받으면 비로그인으로 보고 넘어간다. */
const ACCOUNT_WAIT_MS = 1200

export const Route = createFileRoute('/')({
  loader: async () => {
    throw redirect({ to: (await isLoggedIn()) ? '/plans' : '/trends' })
  },
})

/**
 * 💀 **첫 화면을 인증 응답에 매달지 않는다.** 로더에는 pendingComponent 가 없어서
 * 기다리는 동안 **화면이 백지가 된다** — `/api/v1/auth/account` 가 없거나 느린
 * 환경에서 앱이 아예 안 뜬다.
 *
 *   ① 캐시에 있으면 즉시 쓴다     부트스트랩이 미리 채워 둔다 · 로그인 직후 · 재방문
 *   ② 없으면 짧게만 기다린다      못 받으면 비로그인으로 본다
 *
 * ⚠️ 판정을 놓쳤을 때의 손해는 **「랭킹이 먼저 뜬다」뿐**이다. 그쪽으로 기운다.
 */
async function isLoggedIn(): Promise<boolean> {
  const cached = queryClient.getQueryData<Account>(authKeys.account())
  if (cached) return cached.isLoggedIn

  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), ACCOUNT_WAIT_MS),
  )
  // 부트스트랩이 이미 같은 키로 요청을 걸어 뒀다 — 여기서는 그 결과만 기다린다.
  const pending = queryClient
    .getQueryCache()
    .find<Account>({ queryKey: authKeys.account() })?.promise

  const account = await Promise.race([pending ?? timeout, timeout]).catch(
    () => null,
  )
  return account?.isLoggedIn ?? false
}
