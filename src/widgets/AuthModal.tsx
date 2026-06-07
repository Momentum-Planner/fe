import { useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * AuthModal — popup dialog with 4 screens (로그인 / 회원가입 / 이메일 찾기 /
 * 비밀번호 찾기) over a translucent scrim. Ported from the design's AuthModal.jsx.
 */

type ScreenKey = 'login' | 'register' | 'find_email' | 'find_pw'

type FieldSpec = {
  label: string
  placeholder: string
  type?: string
  required?: boolean
}

const EyeOff = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)
const EyeOn = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

function AuthField({ label, required, placeholder, type = 'text' }: FieldSpec) {
  const [shown, setShown] = useState(false)
  const isSecret = type === 'password'
  return (
    <div style={authStyles.field}>
      <label style={authStyles.label}>
        {label}
        {required && <span style={authStyles.req}>*</span>}
      </label>
      <div style={authStyles.inputWrap}>
        <input
          type={isSecret && !shown ? 'password' : 'text'}
          placeholder={placeholder}
          style={authStyles.input}
        />
        {isSecret && (
          <button
            type="button"
            style={authStyles.eye}
            onClick={() => setShown((s) => !s)}
            aria-label="표시"
          >
            {shown ? <EyeOn /> : <EyeOff />}
          </button>
        )}
      </div>
    </div>
  )
}

const SCREENS: Record<
  ScreenKey,
  { title: string; fields: FieldSpec[]; submit: string }
> = {
  login: {
    title: '로그인',
    fields: [
      { label: '이메일', placeholder: '이메일을 입력하세요', type: 'email' },
      {
        label: '비밀번호',
        placeholder: '비밀번호를 입력하세요',
        type: 'password',
      },
    ],
    submit: '로그인',
  },
  register: {
    title: '회원가입',
    fields: [
      { label: '이메일', placeholder: 'ooo을 입력하세요', type: 'email' },
      { label: '비밀번호', placeholder: 'ooo을 입력하세요', type: 'password' },
      {
        label: '비밀번호 확인',
        required: true,
        placeholder: 'ooo을 입력하세요',
        type: 'password',
      },
      { label: '이름', placeholder: 'ooo을 입력하세요' },
      { label: '전화번호', placeholder: 'ooo을 입력하세요', type: 'tel' },
    ],
    submit: '회원가입 완료 및 로그인',
  },
  find_email: {
    title: '이메일 찾기',
    fields: [
      { label: '전화번호', placeholder: 'ooo을 입력하세요', type: 'tel' },
      { label: '이름', placeholder: 'ooo을 입력하세요' },
    ],
    submit: '이메일 확인',
  },
  find_pw: {
    title: '비밀번호 찾기',
    fields: [
      { label: '이메일', placeholder: 'ooo을 입력하세요', type: 'email' },
      { label: '이름', placeholder: 'ooo을 입력하세요' },
      { label: '전화번호', placeholder: '전화번호', type: 'tel' },
    ],
    submit: '비밀번호 발송',
  },
}

type AuthModalProps = {
  open?: boolean
  initial?: ScreenKey
  onClose?: () => void
}

export function AuthModal({
  open = true,
  initial = 'login',
  onClose = () => {},
}: AuthModalProps) {
  const [screen, setScreen] = useState<ScreenKey>(initial)
  if (!open) return null
  const s = SCREENS[screen]
  const isLogin = screen === 'login'

  return (
    <div style={authStyles.scrim} onClick={onClose}>
      <div style={authStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={authStyles.top}>
          <span style={authStyles.title}>{s.title}</span>
          {isLogin ? (
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
          ) : (
            <button
              style={authStyles.iconBtn}
              onClick={() => setScreen('login')}
              aria-label="뒤로"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {s.fields.map((f, i) => (
          <AuthField key={screen + i} {...f} />
        ))}

        <button
          type="button"
          style={authStyles.submit}
          onMouseDown={(e) => e.preventDefault()}
        >
          {s.submit}
        </button>

        {isLogin ? (
          <div style={authStyles.links}>
            <a style={authStyles.link} onClick={() => setScreen('find_email')}>
              이메일 찾기
            </a>
            <a
              style={{ ...authStyles.link, ...authStyles.linkBorder }}
              onClick={() => setScreen('find_pw')}
            >
              비밀번호 찾기
            </a>
            <a
              style={{
                ...authStyles.link,
                ...authStyles.linkBorder,
                ...authStyles.linkAccent,
              }}
              onClick={() => setScreen('register')}
            >
              회원가입
            </a>
          </div>
        ) : (
          <div style={authStyles.subLink}>
            <a style={authStyles.link} onClick={() => setScreen('login')}>
              로그인으로 돌아가기
            </a>
          </div>
        )}
      </div>
    </div>
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
  field: { marginBottom: 16 },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    color: '#fff',
  },
  req: { color: 'var(--color-brand-red)', marginLeft: 2 },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 999,
    background: '#0A0A0A',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontFamily: 'var(--font-text)',
    fontSize: 14,
    padding: '0 48px 0 18px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  eye: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.55)',
    display: 'flex',
  },
  submit: {
    width: '100%',
    height: 50,
    marginTop: 8,
    border: 'none',
    borderRadius: 999,
    background: 'var(--grad-blue)',
    color: '#fff',
    fontFamily: 'var(--font-text)',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '-.01em',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  subLink: { display: 'flex', justifyContent: 'center', marginTop: 18 },
  link: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    padding: '0 16px',
    cursor: 'pointer',
  },
  linkBorder: { borderLeft: '1px solid rgba(255,255,255,0.15)' },
  linkAccent: { color: '#8C7CFF', fontWeight: 700 },
}
