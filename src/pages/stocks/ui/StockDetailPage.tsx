import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { toggleWatch, useWatchlist } from '@/shared/lib/watchlist'
import { snapshotsByStock } from '@/shared/lib/snapshots'
import { SnapshotCard } from '@/shared/ui/SnapshotCard'
import { SearchBar } from '@/shared/ui/SearchBar'
import { StockChart } from './StockChart'
import { ItemGrid } from './ItemCards'
import './stock-detail.css'

const MA_PILLS = [
  { label: '50일', tone: 'green1' },
  { label: '150일', tone: 'green2' },
  { label: '200일', tone: 'green3' },
]

const STOCK_NAME = 'SK하이닉스'

export function StockDetailPage() {
  const [showSR, setShowSR] = useState(true)
  const [showMA, setShowMA] = useState(true)
  const [maOn, setMaOn] = useState([true, true, true])
  const watched = useWatchlist().some((w) => w.name === STOCK_NAME)
  const pastSnapshots = snapshotsByStock(STOCK_NAME)
  const judgmentCounts = {
    buy: pastSnapshots.filter((s) => s.judgment === 'buy').length,
    sell: pastSnapshots.filter((s) => s.judgment === 'sell').length,
    hold: pastSnapshots.filter((s) => s.judgment === 'hold').length,
  }

  const maVisible = maOn.map((on) => on && showMA)
  const toggleMa = (i: number) =>
    setMaOn((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  return (
    <main className="stock-detail">
      <header className="topbar">
        <SearchBar />
      </header>

      <div className="content">
        {/* Chart card */}
        <section className="chartCard">
          <div className="chartHead">
            <div>
              <h2>
                SK하이닉스 <span className="code">| 003680</span>
              </h2>
              <div className="price">₩ 1,150,482</div>
            </div>
            <button
              className="bookmark"
              type="button"
              aria-label={watched ? '관심 종목에서 제거' : '관심 종목에 추가'}
              aria-pressed={watched}
              onClick={() => toggleWatch(STOCK_NAME)}
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

          <StockChart showSR={showSR} maVisible={maVisible} />
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

            <Link to="/snapshots/new" className="recordBtn">
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

      <ItemGrid stock={STOCK_NAME} />
    </main>
  )
}
