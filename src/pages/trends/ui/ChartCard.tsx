import { Maximize2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MarketChart } from './MarketChart'

/**
 * 오늘의 후보 화면의 주 차트 카드 — 종목 머리글 + 캔들.
 *
 * 머리글은 **한 줄**이다. 이름·가격·변동을 세로로 쌓으면 81px 을 먹었고,
 * 그만큼 차트가 밀려 1440×900 에서 아래 카드 셋이 잘렸다.
 *
 * 색 규칙 (책 13장 ①) — **가격은 색을 안 진다.** 지금 값에는 방향이 없기
 * 때문이다. 색이 붙는 것은 변동뿐이고, 거기서도 ▲/▼ 와 부호가 같은 말을
 * 하므로 색을 빼도 정보가 남는다.
 */
export function ChartCard() {
  return (
    <section className="card px-4 pt-4 pb-2 sm:px-6">
      {/* 좁으면 줄을 바꿔 둘째 줄로 — 한 줄에 우겨 넣어 종목 이름이 한 글자씩 세로로 꺾였다 (2026-09-19) */}
      <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[17px] leading-none font-bold whitespace-nowrap text-white">
          SK하이닉스
        </h2>
        <span className="font-number text-[12px] leading-none text-white/40">
          000660
        </span>

        <span className="ml-1 h-3.5 w-px bg-white/10" />

        <span className="font-number text-[24px] leading-none font-bold tracking-[-0.02em] whitespace-nowrap text-white">
          ₩ 1,150,482
        </span>
        <span className="font-number bg-brand-red/10 text-brand-red rounded-md px-2 py-1 text-[13px] leading-none font-semibold whitespace-nowrap">
          ▲ +1.18%
          <span className="ml-1.5 opacity-70">+13,482</span>
        </span>

        <Link
          to="/stocks/$ticker"
          params={{ ticker: 'SK하이닉스' }}
          aria-label="종목 상세 보기"
          className="ml-auto p-1.5 text-white/80 transition-colors hover:text-white"
        >
          <Maximize2 size={22} strokeWidth={2} />
        </Link>
      </header>
      <MarketChart />
    </section>
  )
}
