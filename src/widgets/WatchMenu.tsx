import { Link } from '@tanstack/react-router'
import { Bookmark, X } from 'lucide-react'
import { useAccount } from '@/entities/auth'
import { useStockSearch } from '@/entities/search'
import { useLikes, useRemoveLike } from '@/entities/stock'
import { fromServerRegime } from '@/shared/lib/snapshots'
import { EntryGateBadge } from '@/shared/ui/EntryGateBadge'
import { TopBarDropdown } from '@/widgets/TopBarDropdown'

/** 종목 · 진입 상태 · 현재가 · 해제 — 검색 결과와 같은 칸 (2026-09-19 사용자 「눌렀을 때 이렇게」) */
// 좁으면(sm 미만) 진입 상태를 감춘다 — 휴대폰 폭에서 종목 이름 칸이 눌렸다
const COLS =
  'grid grid-cols-[minmax(0,1fr)_96px_16px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_150px_96px_16px]'
const won = (n: number) => n.toLocaleString('ko-KR')

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
    // 개수는 싣지 않는다 (사용자 「숫자 나오는 거 빼」 · 건수 금지)
    <TopBarDropdown label="관심" icon={Bookmark} width={460}>
      {likes.length > 0 && (
        <div
          className={`${COLS} border-b border-white/[0.08] px-2 pb-1.5 text-[11px] text-white/45`}
        >
          <span>종목</span>
          <span className="hidden sm:block">진입 상태</span>
          <span className="text-right">현재가</span>
          <span />
        </div>
      )}
      {likes.map(({ stockCode, stockName }) => (
        <WatchRow
          key={stockCode}
          stockCode={stockCode}
          stockName={stockName}
          onRemove={() => removeLike.mutate(stockCode)}
        />
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

/**
 * 관심 한 줄 — 진입 상태 · 현재가는 검색 API 로 그 종목을 찾아 붙인다.
 * ⚠️ 종목마다 한 번씩 묻는다 — 관심이 수십 개를 넘으면 관심 목록 API 에 싣는 편이 낫다.
 */
function WatchRow({
  stockCode,
  stockName,
  onRemove,
}: {
  stockCode: string
  stockName: string
  onRemove: () => void
}) {
  const { data: found = [] } = useStockSearch(stockCode)
  const hit = found.find((f) => f.stockCode === stockCode)
  return (
    <div
      className={`${COLS} rounded-[8px] px-2 py-2 transition-colors hover:bg-white/[0.06]`}
    >
      <Link
        to="/stocks/$ticker"
        params={{ ticker: stockCode }}
        className="flex min-w-0 items-baseline gap-1.5"
      >
        <span className="truncate text-[14px] font-semibold text-white/90 hover:text-white">
          {stockName}
        </span>
        <span className="font-number text-[11px] text-white/35">
          {stockCode}
        </span>
      </Link>
      <span className="hidden sm:block">
        {hit?.entryState ? (
          <EntryGateBadge
            size="sm"
            entryState={hit.entryState}
            regime={fromServerRegime(hit.regime)}
          />
        ) : (
          <span className="text-[11px] text-white/30">판정 없음</span>
        )}
      </span>
      <span className="font-number text-right text-[13px] font-semibold whitespace-nowrap text-white">
        {hit?.price != null ? won(hit.price) : '—'}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label={`${stockName} 관심 종목에서 삭제`}
        className="flex text-white/35 transition-colors hover:text-white"
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}
