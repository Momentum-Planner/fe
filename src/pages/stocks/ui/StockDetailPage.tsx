import { useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { snapshotsByStock } from '@/shared/lib/snapshots'
import { daysAgo, toLocalDate, toLocalDateTime } from '@/shared/lib/datetime'
import { useAccount } from '@/entities/auth'
import {
  useAddLike,
  useBaseStageInsight,
  useBases,
  useDailyCandles,
  useEpsInsight,
  useFipInsight,
  useLikes,
  useMomentumInsight,
  useMovingAverageInsight,
  useMovingAverages,
  useRegimeInsight,
  useRemoveLike,
  useRsInsight,
  useVolumeInsight,
} from '@/entities/stock'
import { SnapshotCard } from '@/shared/ui/SnapshotCard'
import { StockChart } from './StockChart'
import { ItemGrid } from './ItemCards'
import {
  toBaseBoxes,
  toCandles,
  toMaLine,
  toVolume,
} from '../model/buildChartData'
import './stock-detail.css'

const MA_PILLS = [
  { label: '50일', tone: 'green1' },
  { label: '150일', tone: 'green2' },
  { label: '200일', tone: 'green3' },
]

// 차트 이동평균선 색상 (50/150/200)
const MA_COLORS = ['#34DE7B', '#FF3636', '#F46B1A'] as const

const STOCK_NAME = 'SK하이닉스'

export function StockDetailPage() {
  // 라우트의 ticker 는 종목코드(stockCode)다. 관심종목 API 는 코드 기준으로 동작한다.
  const { ticker } = useParams({ from: '/stocks/$ticker' })

  const [showSR, setShowSR] = useState(true)
  const [showMA, setShowMA] = useState(true)
  const [maOn, setMaOn] = useState([true, true, true])

  const { data: account } = useAccount()
  const memberId = account?.isLoggedIn ? account.userId : null
  const { data: likes = [] } = useLikes(memberId)
  const addLike = useAddLike(memberId)
  const removeLike = useRemoveLike(memberId)
  const watched = likes.some((l) => l.stockCode === ticker)
  const toggleBookmark = () => {
    if (memberId == null) return // 비로그인 시 무시(사이드바 로그인 유도)
    if (watched) removeLike.mutate(ticker)
    else addLike.mutate(ticker)
  }

  const pastSnapshots = snapshotsByStock(STOCK_NAME)
  const judgmentCounts = {
    buy: pastSnapshots.filter((s) => s.judgment === 'buy').length,
    sell: pastSnapshots.filter((s) => s.judgment === 'sell').length,
    hold: pastSnapshots.filter((s) => s.judgment === 'hold').length,
  }

  const maVisible = maOn.map((on) => on && showMA)
  const toggleMa = (i: number) =>
    setMaOn((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  // ── 차트 데이터 (최근 1년) ──
  const range = useMemo(
    () => ({ from: toLocalDate(daysAgo(365)), to: toLocalDateTime() }),
    [],
  )
  const { data: rawCandles } = useDailyCandles(ticker, range)
  const { data: ma50 } = useMovingAverages(ticker, 'MA_50', range)
  const { data: ma150 } = useMovingAverages(ticker, 'MA_150', range)
  const { data: ma200 } = useMovingAverages(ticker, 'MA_200', range)
  const { data: bases } = useBases(ticker, range)

  const candles = useMemo(() => toCandles(rawCandles ?? []), [rawCandles])
  const volume = useMemo(() => toVolume(rawCandles ?? []), [rawCandles])
  const movingAverages = useMemo(
    () => [
      { color: MA_COLORS[0], data: toMaLine(ma50?.dataPoints ?? []) },
      { color: MA_COLORS[1], data: toMaLine(ma150?.dataPoints ?? []) },
      { color: MA_COLORS[2], data: toMaLine(ma200?.dataPoints ?? []) },
    ],
    [ma50, ma150, ma200],
  )
  const baseBoxes = useMemo(
    () => toBaseBoxes(bases ?? [], candles),
    [bases, candles],
  )
  const lastClose = candles.at(-1)?.close ?? null
  const priceTags = useMemo(
    () => (lastClose != null ? [{ price: lastClose, color: '#FF367C' }] : []),
    [lastClose],
  )
  const visibleBars = Math.min(candles.length, 60)

  // ── 인사이트 (8종) ──
  const { data: regime } = useRegimeInsight(ticker)
  const { data: maInsight } = useMovingAverageInsight(ticker)
  const { data: momentum } = useMomentumInsight(ticker)
  const { data: volumeInsight } = useVolumeInsight(ticker)
  const { data: fip } = useFipInsight(ticker)
  const { data: rs } = useRsInsight(ticker)
  const { data: eps } = useEpsInsight(ticker)
  const { data: baseStage } = useBaseStageInsight(ticker)

  // 헤더 현재가: 인사이트 regime > 마지막 종가
  const headerPrice = regime?.currentPrice ?? lastClose

  return (
    <main className="stock-detail">
      <div className="content">
        {/* Chart card */}
        <section className="chartCard">
          <div className="chartHead">
            <div>
              <h2>
                종목 <span className="code">| {ticker}</span>
              </h2>
              <div className="price">
                {headerPrice != null
                  ? `₩ ${Math.round(headerPrice).toLocaleString()}`
                  : '—'}
              </div>
            </div>
            <button
              className="bookmark"
              type="button"
              aria-label={watched ? '관심 종목에서 제거' : '관심 종목에 추가'}
              aria-pressed={watched}
              onClick={toggleBookmark}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={watched ? '#fff' : 'none'}
                stroke="#fff"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1z" />
              </svg>
            </button>
          </div>

          <div className="controls">
            <div className="period">
              차트 기간
              <select defaultValue="50일">
                <option>50일</option>
                <option>150일</option>
                <option>200일</option>
              </select>
            </div>
            <button
              type="button"
              className="toggle yellow"
              aria-pressed={showSR}
              onClick={() => setShowSR((v) => !v)}
            >
              지지선/저항선
              <span className={cn('switch yellow', !showSR && 'off')}>
                <span className="thumb" />
              </span>
            </button>
            <button
              type="button"
              className="toggle green"
              aria-pressed={showMA}
              onClick={() => setShowMA((v) => !v)}
            >
              이동평균선
              <span className={cn('switch green', !showMA && 'off')}>
                <span className="thumb" />
              </span>
            </button>
            <span className="maLegend">
              {MA_PILLS.map((pill, i) => (
                <button
                  key={pill.label}
                  type="button"
                  className={cn('maChip', pill.tone, maVisible[i] && 'on')}
                  aria-pressed={maVisible[i]}
                  onClick={() => toggleMa(i)}
                >
                  <span className="maDot" />
                  {pill.label}
                </button>
              ))}
            </span>
          </div>

          {candles.length > 0 ? (
            <StockChart
              showSR={showSR}
              maVisible={maVisible}
              candles={candles}
              volume={volume}
              movingAverages={movingAverages}
              baseBoxes={baseBoxes}
              priceTags={priceTags}
              visibleBars={visibleBars}
            />
          ) : (
            <div className="chartArea flex items-center justify-center text-[13px] text-white/40">
              차트 데이터를 불러오는 중…
            </div>
          )}
        </section>

        {/* Snapshot rail */}
        <div className="rail">
          <section className="rrCard snapRail">
            <div className="pastHead">
              <span className="rrTitle">지난 스냅샷</span>
              <span className="pastLegend">
                <span>
                  <span className="d" style={{ background: '#FF3636' }} />
                  {judgmentCounts.buy}
                </span>
                <span>
                  <span className="d" style={{ background: '#34ADE4' }} />
                  {judgmentCounts.sell}
                </span>
                <span>
                  <span
                    className="d"
                    style={{ background: 'rgba(255,255,255,0.55)' }}
                  />
                  {judgmentCounts.hold}
                </span>
              </span>
            </div>

            <div className="no-scrollbar pastList">
              {pastSnapshots.length > 0 ? (
                pastSnapshots.map((snap, i) => (
                  <SnapshotCard key={`${snap.date}-${i}`} snap={snap} />
                ))
              ) : (
                <p className="py-4 text-center text-[13px] text-white/40">
                  이전 스냅샷이 없습니다.
                </p>
              )}
            </div>

            <Link to="/snapshots/new" search={{ ticker }} className="recordBtn">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>스냅샷 생성</span>
            </Link>
          </section>
        </div>
      </div>

      <ItemGrid
        stock={ticker}
        regime={regime}
        ma={maInsight}
        momentum={momentum}
        volume={volumeInsight}
        fip={fip}
        rs={rs}
        eps={eps}
        baseStage={baseStage}
      />
    </main>
  )
}
