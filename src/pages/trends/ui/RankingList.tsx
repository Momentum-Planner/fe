import { Info } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { useBreakoutRanking } from '@/entities/ranking'
import type { Regime } from '@/entities/ranking'
import { useRankingStream } from '@/entities/realtime'

const GRID =
  'grid grid-cols-[28px_minmax(0,1fr)_92px_96px_116px] items-center gap-2'

function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

interface RankingRow {
  stockName: string
  stockCode: string | null
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
}

/** 랭킹 리스트 — ranked momentum table; the #1 row is highlighted. */
export function RankingList({ regime = 'success' }: { regime?: Regime }) {
  const {
    data: restItems = [],
    isLoading,
    isError,
  } = useBreakoutRanking(regime)
  // 실시간 ranking-update 가 오면 그것을 우선, 없으면 REST 스냅샷 사용.
  const stream = useRankingStream(regime)

  const items: RankingRow[] =
    stream ??
    restItems.map((r) => ({
      stockName: r.stockName,
      stockCode: r.stockCode,
      currentPrice: r.currentPrice,
      oneYearMomentum: r.oneYearMomentum,
      fipScore: r.fipScore,
    }))

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
        모멘텀 → FIP 순 · 상위 종목
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

      {isLoading && (
        <div className="py-10 text-center text-[13px] text-white/40">
          불러오는 중…
        </div>
      )}

      {isError && (
        <div className="py-10 text-center text-[13px] text-white/40">
          랭킹을 불러오지 못했습니다.
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="py-10 text-center text-[13px] text-white/40">
          표시할 종목이 없습니다.
        </div>
      )}

      {!isLoading &&
        !isError &&
        items.map((row, i) => (
          <Link
            key={row.stockCode ?? row.stockName}
            to="/stocks/$ticker"
            params={{ ticker: row.stockCode ?? row.stockName }}
            className={cn(
              GRID,
              '-mx-3 rounded-[10px] border-b border-white/[0.04] px-3 py-3.5 text-[14px] transition-colors hover:bg-white/[0.06]',
              i === 0 && 'bg-white/[0.04]',
            )}
          >
            <span className="font-number text-[13px] text-white/50">
              {i + 1}
            </span>
            <span className="font-medium text-white">{row.stockName}</span>
            <span className="font-number text-brand-red text-right font-bold">
              {formatSigned(row.oneYearMomentum)}%
            </span>
            <span className="font-number text-right font-medium text-white">
              {row.fipScore.toFixed(2)}
            </span>
            <span className="font-number text-right font-medium text-white">
              {row.currentPrice != null
                ? `₩ ${row.currentPrice.toLocaleString()}`
                : '-'}
            </span>
          </Link>
        ))}
    </section>
  )
}
