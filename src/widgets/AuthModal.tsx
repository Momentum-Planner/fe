import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { ApiError } from '@/shared/api'
import { startKakaoLogin } from '@/entities/auth'

/**
 * AuthModal — 카카오 로그인 하나. 처음 온 사용자는 그 자리에서 가입된다.
 *
 * 이메일·비밀번호 가입(회원가입 · 이메일 찾기 · 비밀번호 찾기 네 화면)은 걷었다.
 * 이름·전화번호·비밀번호를 받지 않으려고 카카오로 옮긴 것이다 (2026-09-18).
 * 백엔드의 이메일 로그인 API 는 아직 남아 있다.
 */

type AuthModalProps = {
  open?: boolean
  onClose?: () => void
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return '카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function AuthModal({ open = true, onClose = () => {} }: AuthModalProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const start = () => {
    setPending(true)
    setError(null)
    // 성공하면 페이지가 카카오로 넘어간다 — pending 을 되돌릴 일이 없다.
    startKakaoLogin().catch((e: unknown) => {
      setError(errorMessage(e))
      setPending(false)
    })
  }

  // ⚠️ body 로 포털한다 — 상단 바의 backdrop-blur 가 fixed 의 기준을 바로 바꿔서
  //    바 안에 두면 모달이 56px 높이에 갇혀 잘린다.
  return createPortal(
    <div style={authStyles.scrim} onClick={onClose}>
      <div style={authStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={authStyles.top}>
          <span style={authStyles.title}>로그인</span>
          <button
            style={authStyles.iconBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p style={authStyles.lead}>
          카카오 계정으로 시작합니다. 처음이면 그대로 가입됩니다.
        </p>

        {error && <div style={authStyles.error}>{error}</div>}

        <button
          type="button"
          style={{ ...authStyles.kakao, opacity: pending ? 0.6 : 1 }}
          disabled={pending}
          onClick={start}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.32 4.66 6.74l-.95 3.5c-.08.3.26.54.52.37l4.18-2.77c.52.06 1.05.1 1.59.1 5.52 0 10-3.58 10-8S17.52 3 12 3z"
            />
          </svg>
          {pending ? '카카오로 이동 중…' : '카카오 로그인'}
        </button>
      </div>
    </div>,
    document.body,
  )
}

const authStyles: Record<string, CSSProperties> = {
  scrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(10,10,10,0.55)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  modal: {
    width: 420,
    maxWidth: '100%',
    background: '#2B2B2B',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20,
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    padding: '30px 30px 26px',
    boxSizing: 'border-box',
    color: '#fff',
    fontFamily: 'var(--font-text)',
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: { fontSize: 24, fontWeight: 800, letterSpacing: '-.01em' },
  iconBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: 'none',
    width: 34,
    height: 34,
    borderRadius: 10,
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lead: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  error: {
    fontSize: 13,
    color: 'var(--color-brand-red)',
    marginTop: 4,
    marginBottom: 12,
  },
  /**
   * ⚠️ 토큰에 없는 색이다 — 카카오 로그인 디자인 가이드가 버튼 색을 정해 둔다
   * (배경 #FEE500 · 글자 85% 검정 · 말풍선 심볼). 브랜드 규정이라 여기서만 쓴다.
   */
  kakao: {
    width: '100%',
    height: 50,
    border: 'none',
    borderRadius: 12,
    background: '#FEE500',
    color: 'rgba(0,0,0,0.85)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
}
