import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { daysAgo, toLocalDate, toLocalDateTime } from '@/shared/lib/datetime'
import { useBases, useDailyCandles } from '@/entities/stock'
import { MarketChart } from './MarketChart'

/**
 * 오늘의 후보 화면의 주 차트 카드 — 종목 머리글 + 캔들.
 * **목록에서 고른 종목**이다 (4장 ① 가). 종목(계획) 화면으로 가는 길 「계획 세우기 →」 는
 * 이름 줄 오른쪽 하나. 판 맨 아래로 내렸다가(⑤ 가) 되올렸다 — 이름 곁이어야 한다 (사용자).
 *
 * 머리글은 **한 줄**이다. 이름·가격·변동을 세로로 쌓으면 81px 을 먹었고,
 * 그만큼 차트가 밀려 1440×900 에서 아래 카드 셋이 잘렸다.
 *
 * 색 규칙 (책 13장 ①) — **가격은 색을 안 진다.** 지금 값에는 방향이 없기
 * 때문이다. 색이 붙는 것은 변동뿐이고, 거기서도 ▲/▼ 와 부호가 같은 말을
 * 하므로 색을 빼도 정보가 남는다.
 */
export function ChartCard({
  stock,
}: {
  stock: { stockCode: string; stockName: string } | null
}) {
  const code = stock?.stockCode ?? ''
  const range = useMemo(
    () => ({ from: toLocalDate(daysAgo(365)), to: toLocalDateTime() }),
    [],
  )
  const { data: candles } = useDailyCandles(code, range)
  const { data: bases } = useBases(code, range)

  const sorted = candles
    ? [...candles].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))
    : []
  const last = sorted.at(-1)?.closePrice
  const prev = sorted.at(-2)?.closePrice
  const diff = last != null && prev != null ? last - prev : null
  const pct = diff != null && prev ? (diff / prev) * 100 : null
  const up = (diff ?? 0) >= 0

  return (
    // 안쪽 여백 20 — 카드 셋 · 목록과 한 세로선 (4장 ③ 가).
    // 카드 면은 TrendsPage 가 두른다 — 차트와 카드 셋이 한 판이다 (4장 ④ 가)
    <div className="flex flex-1 flex-col px-4 pt-4 pb-2 sm:px-5">
      {/* 좁으면 줄을 바꿔 둘째 줄로 — 한 줄에 우겨 넣어 종목 이름이 한 글자씩 세로로 꺾였다 (2026-09-19) */}
      <header className="mb-2 flex min-h-[28px] flex-wrap items-center gap-x-3 gap-y-2">
        {/* 이름이 주인공 (4장 ② 가) — 목록에서 고른 것과 같은 이름이 가장 크게 잇는다.
            링크가 아니다 — 입구는 오른쪽 버튼 하나 (입구 둘은 까닭이 없다 · 사용자) */}
        <h2 className="text-[24px] leading-none font-bold whitespace-nowrap text-white">
          {stock?.stockName ?? ''}
        </h2>
        <span className="font-number text-[12px] leading-none text-white/40">
          {code}
        </span>

        {last != null && (
          <>
            <span className="ml-1 h-3.5 w-px bg-white/10" />
            {/* 가격은 후보가 된 이유가 아니라 한 단계 아래 (24 → 16) */}
            <span className="font-number text-[16px] leading-none font-semibold whitespace-nowrap text-white/80">
              ₩ {last.toLocaleString()}
            </span>
          </>
        )}
        {diff != null && pct != null && (
          <span
            className={cn(
              'font-number rounded-md px-2 py-1 text-[13px] leading-none font-semibold whitespace-nowrap',
              up
                ? 'bg-brand-red/10 text-brand-red'
                : 'bg-brand-blue/10 text-brand-blue',
            )}
          >
            {up ? '▲ +' : '▼ −'}
            {Math.abs(pct).toFixed(2)}%
            <span className="ml-1.5 opacity-70">
              {up ? '+' : '−'}
              {Math.abs(diff).toLocaleString()}
            </span>
          </span>
        )}
        {stock && (
          // 테 두른 알약 — 거래 계획 「+ 체결」 과 같은 모양 · 입구는 이것 하나.
          // 💀 판 맨 아래로 내렸더니(4장 ⑤ 가) 이름에서 멀어졌다 — 이름 줄로 되올린다 (2026-09-19 사용자)
          <Link
            to="/stocks/$ticker"
            params={{ ticker: stock.stockCode }}
            className="rounded-pill ml-auto px-3 py-1.5 text-[12px] whitespace-nowrap text-white/85 ring-1 ring-white/25 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            계획 세우기 →
          </Link>
        )}
      </header>
      <MarketChart candles={candles} bases={bases} />
    </div>
  )
}
