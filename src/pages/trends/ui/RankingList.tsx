import { Info } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { rankingRows } from '../model/marketData'

const GRID =
  'grid grid-cols-[28px_minmax(0,1fr)_92px_96px_116px] items-center gap-2'

/** 랭킹 리스트 — ranked momentum table; the #1 row is highlighted. */
export function RankingList() {
  return (
    <section className="card flex w-full flex-col px-6 pt-6 pb-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-bold text-white">랭킹 리스트</h3>
        <div className="group relative">
          <button
            type="button"
            aria-label="랭킹 정보"
            className="p-1.5 text-white/80 transition-colors hover:text-white"
          >
            <Info size={18} strokeWidth={2} />
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute top-full right-0 z-30 mt-2 w-[300px] rounded-xl border border-white/10 bg-[#1a1a1a] p-4 text-left opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-opacity duration-150 group-hover:opacity-100"
          >
            <div className="text-[13px] font-bold text-white">
              이 랭킹은 어떻게 산정되나요?
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/70">
              단순히 많이 오른 종목이 아닌, 조금씩 꾸준히 오른 종목을 높게
              평가합니다. 급등보다 지속적인 상승이 더 강한 모멘텀을 만들기
              때문입니다.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-1 text-[12px] text-white/50">
        순위 · 오늘 09:44 기준
      </div>

      <div
        className={cn(
          GRID,
          'border-b border-white/[0.06] py-3 text-[12px] text-white/55',
        )}
      >
        <span />
        <span />
        <span className="text-right">1년 모멘텀</span>
        <span className="text-right">흐름 안정도</span>
        <span className="text-right">현재 가격</span>
      </div>

      {rankingRows.map((row, i) => (
        <Link
          key={row.name}
          to="/stocks/$ticker"
          params={{ ticker: row.name }}
          className={cn(
            GRID,
            '-mx-3 rounded-[10px] border-b border-white/[0.04] px-3 py-3.5 text-[14px] transition-colors hover:bg-white/[0.06]',
            i === 0 && 'bg-white/[0.04]',
          )}
        >
          <span className="font-number text-[13px] text-white/50">{i + 1}</span>
          <span className="font-medium text-white">{row.name}</span>
          <span className="font-number text-brand-red text-right font-bold">
            +{row.momentum}%
          </span>
          <span className="font-number text-right font-medium text-white">
            {row.stability}
          </span>
          <span className="font-number text-right font-medium text-white">
            ₩ {row.price.toLocaleString()}
          </span>
        </Link>
      ))}
    </section>
  )
}
