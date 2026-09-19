import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import { authKeys, useAccount, useLogout } from '@/entities/auth'
import type { Account } from '@/entities/auth'
import {
  NICKNAME_MAX_LENGTH,
  useMyInfo,
  useUpdateMyInfo,
} from '@/entities/member'
import type { MyInfo } from '@/entities/member'

/**
 * 마이페이지 (Q5 — 우측 계정 자리의 닉네임 칩이 여기로 온다).
 * 로그인하면 이 화면에 선다.
 *
 * 지금 고칠 수 있는 것은 닉네임 하나다 — 카카오로 가입해서 이름·전화번호·
 * 비밀번호를 받지 않는다.
 *
 * **계정은 한 줄 머리** (2026-09-19 · 가) — 닉네임 ✎ · 가입 방식 · 가입일 · 로그아웃.
 * 💀 이 페이지에 오는 이유가 거래 통계가 됐다(내비에서 옮겨 왔다) — 계정 카드가 첫 화면을 먹지 않게 한 줄로.
 * 닉네임은 ✎ 를 눌렀을 때만 그 자리에서 칸이 열린다.
 */
export function ProfilePage() {
  const { data: account, isPending: accountPending } = useAccount()
  const loggedIn = account?.isLoggedIn ?? false
  const { data: me, error } = useMyInfo(loggedIn)

  if (accountPending) return <Shell />
  if (!loggedIn)
    return (
      <Shell>
        <p className="card m-0 px-5 py-6 text-[13px] text-white/45">
          로그인하면 내 정보를 볼 수 있습니다. 오른쪽 위 「로그인」을 눌러
          주세요.
        </p>
      </Shell>
    )
  if (error)
    return (
      <Shell>
        <p className="card m-0 px-5 py-6 text-[13px] text-white/45">
          내 정보를 불러오지 못했습니다.
        </p>
      </Shell>
    )
  if (!me) return <Shell />

  return (
    <Shell>
      <section className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
        <NicknameField me={me} />
        <span className="rounded-pill bg-white/[0.08] px-2.5 py-0.5 text-[12px] text-white/75">
          {providerLabel(me)}
        </span>
        <span className="font-number text-[12px] text-white/45">
          {me.joinedAt.slice(0, 10)} 가입
        </span>
        <span className="ml-auto">
          <LogoutButton />
        </span>
      </section>
    </Shell>
  )
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    // 아래 거래 통계와 같은 폭 · 같은 여백 — 한 페이지로 이어져 보이게
    <main className="flex flex-col gap-4 px-6 pt-6">
      <h1 className="t-h1 text-white">내 정보</h1>
      {children}
    </main>
  )
}

function providerLabel(me: MyInfo): string {
  if (me.provider === 'KAKAO') return '카카오'
  return me.email ? `이메일 (${me.email})` : '이메일'
}

/** 칸을 벗어날 때가 아니라 「저장」을 눌렀을 때 보낸다 — 닉네임은 한 번에 한 값이다 */
function NicknameField({ me }: { me: MyInfo }) {
  const qc = useQueryClient()
  const update = useUpdateMyInfo()
  const [value, setValue] = useState(me.nickname)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => setValue(me.nickname), [me.nickname])

  const trimmed = value.trim()
  const invalid = trimmed.length === 0 || trimmed.length > NICKNAME_MAX_LENGTH
  const unchanged = trimmed === me.nickname

  const save = () => {
    setSaved(false)
    update.mutate(
      { nickname: trimmed },
      {
        onSuccess: (next) => {
          setSaved(true)
          setEditing(false)
          // 상단 바 계정 칩도 같은 닉네임을 든다
          qc.setQueryData<Account>(authKeys.account(), (prev) =>
            prev ? { ...prev, nickname: next.nickname } : prev,
          )
        },
      },
    )
  }

  const problem =
    update.error instanceof ApiError
      ? update.error.message
      : update.error
        ? '저장하지 못했습니다.'
        : trimmed.length > NICKNAME_MAX_LENGTH
          ? `${NICKNAME_MAX_LENGTH}자 이하로 적어 주세요.`
          : null

  if (!editing)
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-[18px] font-bold text-white">{me.nickname}</span>
        <button
          type="button"
          onClick={() => {
            setValue(me.nickname)
            setSaved(false)
            setEditing(true)
          }}
          aria-label="닉네임 고치기"
          className="text-white/40 hover:text-white/80"
        >
          <Pencil size={14} aria-hidden />
        </button>
        {saved && (
          <span className="text-[12px] text-white/45">저장했습니다</span>
        )}
      </div>
    )

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (!invalid && !unchanged) save()
      }}
    >
      <div className="flex items-center gap-2">
        <input
          id="nickname"
          aria-label="닉네임"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
          }}
          className="bg-bg-input w-[200px] rounded-md px-2.5 py-1 text-[14px] text-white outline-none focus:ring-1 focus:ring-white/30"
        />
        <button
          type="submit"
          disabled={invalid || unchanged || update.isPending}
          className="rounded-pill text-fg-inverse shrink-0 bg-white px-3 py-1 text-[12px] font-semibold disabled:bg-white/[0.08] disabled:text-white/40"
        >
          {update.isPending ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[12px] text-white/45 hover:text-white/80"
        >
          취소
        </button>
      </div>
      {problem && <span className="text-brand-red text-[12px]">{problem}</span>}
    </form>
  )
}

function LogoutButton() {
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() =>
        logout.mutate(undefined, {
          onSettled: () => void navigate({ to: '/trends' }),
        })
      }
      disabled={logout.isPending}
      className="text-[13px] text-white/45 hover:text-white/80"
    >
      로그아웃
    </button>
  )
}
