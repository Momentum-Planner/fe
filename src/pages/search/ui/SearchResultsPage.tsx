import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useStockSearch } from '@/entities/search'
import './search-results.css'

/** 돌파 성공/준비 2종만 배지로 구분(그 외 레짐은 준비형 아이콘으로 표시). */
function StatusBadge({ success }: { success: boolean }) {
  return (
    <span className={`sBadge ${success ? 'success' : 'prep'}`}>
      <svg
        width="14"
        height="11"
        viewBox="-1 -1 28 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {success ? (
          <>
            <path d="M2 14 L7 12 L11 9 L15 5 L22 1" />
            <path d="M17 2 L22 0.5 L23 6" />
          </>
        ) : (
          <>
            <path d="M2 8 L6 9 L11 7 L15 8 L21 6" />
            <path d="M16 2 L21 6 L22 11" />
          </>
        )}
      </svg>
      {success ? '돌파 성공' : '돌파 준비'}
    </span>
  )
}

export function SearchResultsPage() {
  const { q } = useSearch({ from: '/search' })
  const navigate = useNavigate()
  const query = q

  const { data: results = [], isLoading, isError } = useStockSearch(query)

  return (
    <main className="search-results">
      <header className="topbar">
        <div className="search">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            key={query}
            defaultValue={query}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const next = e.currentTarget.value.trim()
                if (next) navigate({ to: '/search', search: { q: next } })
              }
            }}
          />
          <Link className="clear" to="/trends" aria-label="지우기">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>
      </header>

      <section className="results">
        <div className="resHead">
          <h1>
            <span className="q">‘{query}’</span> 검색 결과
          </h1>
          <span className="cnt">{results.length}건</span>
        </div>
        <p className="resSub">종목명 또는 종목코드로 검색했습니다.</p>

        <div className="resList">
          <div className="resColHead">
            <span>종목</span>
            <span>돌파 상태</span>
            <span>현재가</span>
          </div>

          {isLoading && <p className="resEmpty">불러오는 중…</p>}
          {isError && <p className="resEmpty">검색에 실패했습니다.</p>}
          {!isLoading && !isError && results.length === 0 && (
            <p className="resEmpty">검색 결과가 없습니다.</p>
          )}

          {results.map((r) => (
            <Link
              key={r.stockCode}
              className="srow"
              to="/stocks/$ticker"
              params={{ ticker: r.stockCode }}
            >
              <div className="sMain">
                <span className="sNm">{r.stockName}</span>
                <span className="sTk">{r.stockCode}</span>
              </div>
              <StatusBadge success={r.regime === 'BREAKOUT_SUCCESS'} />
              <div className="sPrice">
                <span className="sPr">
                  {r.price != null ? `₩ ${r.price.toLocaleString()}` : '-'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
