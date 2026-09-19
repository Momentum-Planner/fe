import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ApiError } from '@/shared/api'
import { consumeKakaoState, useKakaoLogin } from '@/entities/auth'

/**
 * 카카오 동의 화면이 돌려보내는 자리. code 를 백엔드에 넘기면 쿠키가 심기고,
 * 로그인하면 마이페이지로 간다.
 *
 * ⚠️ StrictMode 에서 effect 가 두 번 돈다 — code 는 한 번만 쓸 수 있어서
 *    두 번째 요청이 실패로 보이지 않게 ref 로 막는다.
 */
export function KakaoCallbackPage() {
  const { code, state, error } = useSearch({ from: '/auth/kakao/callback' })
  const navigate = useNavigate()
  const login = useKakaoLogin()
  const started = useRef(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (error) {
      setProblem('카카오 로그인을 취소했습니다.')
      return
    }
    if (!code || !consumeKakaoState(state)) {
      setProblem(
        '로그인 요청을 확인하지 못했습니다. 처음부터 다시 시도해 주세요.',
      )
      return
    }
    login.mutate(code, {
      onSuccess: () => void navigate({ to: '/profile', replace: true }),
      onError: (e) =>
        setProblem(
          e instanceof ApiError ? e.message : '카카오 로그인에 실패했습니다.',
        ),
    })
  }, [code, state, error, login, navigate])

  return (
    <main className="flex flex-col items-center gap-3 px-6 pt-24 pb-16">
      {problem ? (
        <>
          <p className="text-[14px] text-white/70">{problem}</p>
          <Link
            to="/trends"
            className="rounded-full bg-white/[0.12] px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/[0.18]"
          >
            처음으로
          </Link>
        </>
      ) : (
        <p className="text-[14px] text-white/50">
          카카오 계정을 확인하고 있습니다…
        </p>
      )}
    </main>
  )
}
