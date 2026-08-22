import { Link } from '@tanstack/react-router'
import { Bookmark, X } from 'lucide-react'
import { useAccount } from '@/entities/auth'
import { useLikes, useRemoveLike } from '@/entities/stock'
import { TopBarDropdown } from '@/widgets/TopBarDropdown'

/**
 * 관심 종목 (Q3). 목록이 종목명 몇 줄뿐이라 상시 레일(72px)도
 * 밀어내는 패널(280px)도 과했다 — 드롭다운은 가로를 전혀 안 먹는다.
 */
export function WatchMenu() {
  const { data: account } = useAccount()
  const memberId = account?.isLoggedIn ? account.userId : null
  const { data: likes = [] } = useLikes(memberId)
  const removeLike = useRemoveLike(memberId)

  return (
    <TopBarDropdown label="관심" icon={Bookmark} count={likes.length}>
      {likes.map(({ stockCode, stockName }) => (
        <div
          key={stockCode}
          className="flex items-center rounded-[8px] px-2 py-2 text-[14px] transition-colors hover:bg-white/[0.06]"
        >
          <Link
            to="/stocks/$ticker"
            params={{ ticker: stockCode }}
            className="flex-1 truncate text-white/85 hover:text-white"
          >
            {stockName}
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeLike.mutate(stockCode)
            }}
            aria-label={`${stockName} 관심 종목에서 삭제`}
            className="flex text-white/35 transition-colors hover:text-white"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      ))}
      {likes.length === 0 && (
        <p className="m-0 px-2 py-3 text-[13px] text-white/40">
          {account?.isLoggedIn
            ? '관심 종목이 없습니다.'
            : '로그인 후 이용할 수 있습니다.'}
        </p>
      )}
    </TopBarDropdown>
  )
}
