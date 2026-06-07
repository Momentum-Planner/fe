import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import './search-results.css'

type Status = 'success' | 'prep'
type Result = {
  name: string
  ticker: string
  status: Status
  price: number
  change: string
  dir: 'up' | 'down'
}

const results: Result[] = [
  {
    name: '삼성전자',
    ticker: '005930',
    status: 'success',
    price: 89_200,
    change: '+0.79%',
    dir: 'up',
  },
  {
    name: '삼성SDI',
    ticker: '006400',
    status: 'prep',
    price: 315_000,
    change: '+1.42%',
    dir: 'up',
  },
  {
    name: '삼성바이오로직스',
    ticker: '207940',
    status: 'success',
    price: 1_042_000,
    change: '+2.10%',
    dir: 'up',
  },
  {
    name: '삼성물산',
    ticker: '028260',
    status: 'success',
    price: 158_300,
    change: '-0.51%',
    dir: 'down',
  },
  {
    name: '삼성생명',
    ticker: '032830',
    status: 'prep',
    price: 96_400,
    change: '+0.33%',
    dir: 'up',
  },
  {
    name: '삼성전기',
    ticker: '009150',
    status: 'success',
    price: 152_800,
    change: '+3.04%',
    dir: 'up',
  },
  {
    name: '삼성화재',
    ticker: '000810',
    status: 'prep',
    price: 412_500,
    change: '-0.22%',
    dir: 'down',
  },
  {
    name: '삼성에스디에스',
    ticker: '018260',
    status: 'success',
    price: 168_900,
    change: '+1.08%',
    dir: 'up',
  },
]

function StatusBadge({ status }: { status: Status }) {
  const isSuccess = status === 'success'
  return (
    <span className={`sBadge ${isSuccess ? 'success' : 'prep'}`}>
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
        {isSuccess ? (
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
      {isSuccess ? '돌파 성공' : '돌파 준비'}
    </span>
  )
}

export function SearchResultsPage() {
  const { q } = useSearch({ from: '/search' })
  const navigate = useNavigate()
  const query = q || '삼성'

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
          <span className="cnt">8건</span>
        </div>
        <p className="resSub">종목명 또는 종목코드로 검색했습니다.</p>

        <div className="resList">
          <div className="resColHead">
            <span>종목</span>
            <span>돌파 상태</span>
            <span>현재가</span>
          </div>
          {results.map((r) => (
            <Link
              key={r.ticker}
              className="srow"
              to="/stocks/$ticker"
              params={{ ticker: r.name }}
            >
              <div className="sMain">
                <span className="sNm">{r.name}</span>
                <span className="sTk">{r.ticker}</span>
              </div>
              <StatusBadge status={r.status} />
              <div className="sPrice">
                <span className="sPr">₩ {r.price.toLocaleString()}</span>
                <span className={`sCh ${r.dir}`}>{r.change}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
