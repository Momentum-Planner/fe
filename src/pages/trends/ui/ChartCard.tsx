import { Maximize2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MarketChart } from './MarketChart'

/** Main hero chart card — SK하이닉스 header + price + candlestick chart. */
export function ChartCard() {
  return (
    <section className="card px-6 pt-5 pb-3">
      <header className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="t-h1 text-white">SK하이닉스</h2>
          <div className="font-number text-brand-red mt-1.5 flex items-baseline gap-2.5 text-[30px] font-bold tracking-[-0.02em]">
            <span>₩ 1,150,482</span>
            <span className="text-[15px] font-semibold opacity-95">
              ▲ +1.18% (+13,482)
            </span>
          </div>
        </div>
        <Link
          to="/stocks/$ticker"
          params={{ ticker: 'SK하이닉스' }}
          aria-label="종목 상세 보기"
          className="p-1.5 text-white/80 transition-colors hover:text-white"
        >
          <Maximize2 size={22} strokeWidth={2} />
        </Link>
      </header>
      <MarketChart />
    </section>
  )
}
