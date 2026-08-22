import { Wallet } from 'lucide-react'
import { useAccount } from '@/entities/auth'
import { TopBarDropdown } from '@/widgets/TopBarDropdown'

/**
 * 보유 중 종목 (Q3). 계획이 있든 없든 지금 들고 있는 것 전부.
 * ⚠️ Trade API가 아직 없어서 목록이 비어 있다 — 자리만 잡아 둔 것이다.
 */
export function HoldingMenu() {
  const { data: account } = useAccount()

  return (
    <TopBarDropdown label="보유 중" icon={Wallet}>
      <p className="m-0 px-2 py-3 text-[13px] text-white/40">
        {account?.isLoggedIn
          ? '보유 중인 종목이 없습니다.'
          : '로그인 후 이용할 수 있습니다.'}
      </p>
    </TopBarDropdown>
  )
}
