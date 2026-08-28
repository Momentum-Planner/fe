import { useAccount } from '@/entities/auth'

/**
 * 오늘의 계획 — 오늘 실행할 내 계획.
 *
 * 원래 `/trends` 우측 탭이었는데 「오늘의 후보 & 계획」 한 메뉴가 탭 둘을 덮는 게
 * 헷갈려서 메뉴로 갈랐다 (Q1-2 가 「재지 않고 감으로 넘긴 자리」라고 남겨둔 그 자리다).
 *
 * ⚠️ TradePlan API 가 아직 없어 빈 상태만 그린다. 껍데기(여백·카드·타이포)는
 * `/trends` 와 맞춰 뒀고, **내용이 붙을 때 UI 를 다시 짠다.**
 *
 * `/captures`(거래 계획) 와의 차이 — 여기는 **오늘**, 저기는 **전체**다.
 */
export function PlansPage() {
  const { data: account } = useAccount()

  return (
    <main className="flex flex-col gap-4 px-6 pt-6 pb-6">
      <section className="card flex min-h-[420px] w-full min-w-0 flex-col px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-bold text-white">오늘의 계획</h3>
        </div>

        <p className="m-0 py-10 text-center text-[13px] text-white/40">
          {account?.isLoggedIn
            ? '오늘 실행할 계획이 없습니다.'
            : '로그인 후 이용할 수 있습니다.'}
        </p>
      </section>
    </main>
  )
}
