import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { RegimeIcon } from '@/shared/ui/RegimeIcon'
import { DateTimePicker } from '@/shared/ui/DateTimePicker'
import './snapshot-list.css'

const startOfToday = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0)
}

type Regime = 'start' | 'prep' | 'fail' | 'drop' | 'none'
type Judgment = 'buy' | 'sell' | 'hold'

const REGIME_LABEL: Record<Regime, string> = {
  start: '돌파성공',
  prep: '돌파준비',
  fail: '돌파실패',
  drop: '하방이탈',
  none: '방향미정',
}
const JUDGMENT_LABEL: Record<Judgment, string> = {
  buy: '매수',
  sell: '매도',
  hold: '관망',
}

type Snapshot = {
  name: string
  regime: Regime
  judgment: Judgment
  date: string
  price: string
  memo: string
}

const snapshots: Snapshot[] = [
  {
    name: 'SK하이닉스',
    regime: 'start',
    judgment: 'buy',
    date: '2026.03.12. 13:00',
    price: '₩1,100,000',
    memo: '베이스 돌파를 거래량 동반으로 확인하고 분할 매수 시작. 추세 초입으로 판단됨.',
  },
  {
    name: '삼성전자',
    regime: 'fail',
    judgment: 'sell',
    date: '2026.03.12. 14:30',
    price: '₩78,400',
    memo: '저항선 돌파 실패에 거래량도 부족. 비중 줄여 리스크 관리했음.',
  },
  {
    name: '현대자동차',
    regime: 'prep',
    judgment: 'hold',
    date: '2026.03.12. 15:01',
    price: '₩221,500',
    memo: '박스권 상단 눌림목 구간. 돌파 확인 전까지는 관망 유지.',
  },
  {
    name: 'SK하이닉스',
    regime: 'start',
    judgment: 'buy',
    date: '2026.02.20. 10:14',
    price: '₩980,000',
    memo: '눌림 후 재차 베이스 상단 안착. 모멘텀 살아있어 추가 매수.',
  },
  {
    name: 'LG화학',
    regime: 'drop',
    judgment: 'sell',
    date: '2026.02.14. 09:42',
    price: '₩342,000',
    memo: '지지선 이탈로 손절 라인 터치. 추세 훼손 판단해 비중 축소.',
  },
  {
    name: '삼성생명',
    regime: 'none',
    judgment: 'hold',
    date: '2026.01.28. 11:20',
    price: '₩94,200',
    memo: '방향성 불분명한 횡보 구간. 추세 확인될 때까지 대기.',
  },
  {
    name: '현대자동차',
    regime: 'start',
    judgment: 'buy',
    date: '2026.01.15. 14:55',
    price: '₩228,000',
    memo: '저항 돌파 후 지지로 전환되는 흐름 확인. 초기 진입.',
  },
  {
    name: '삼성전자',
    regime: 'fail',
    judgment: 'sell',
    date: '2026.01.08. 13:45',
    price: '₩81,200',
    memo: '돌파 시도 무산되며 윗꼬리 길게 발생. 단기 차익 실현.',
  },
  {
    name: 'LG화학',
    regime: 'prep',
    judgment: 'hold',
    date: '2025.12.22. 10:30',
    price: '₩365,500',
    memo: '베이스 다지는 중, 거래량 수축 관찰. 돌파 신호 기다리는 중.',
  },
]

export function CapturesPage() {
  const navigate = useNavigate()
  const [judg, setJudg] = useState<Record<Judgment, boolean>>({
    buy: false,
    sell: false,
    hold: false,
  })
  const [reg, setReg] = useState<Record<Regime, boolean>>({
    start: false,
    prep: false,
    fail: false,
    drop: false,
    none: false,
  })
  const [keyword, setKeyword] = useState('')
  const [quick, setQuick] = useState('전체')
  // Period range — default (today 00:00) ~ (now). Custom DateTimePicker popups.
  const [startDt, setStartDt] = useState(startOfToday)
  const [endDt, setEndDt] = useState(() => new Date())

  const resetFilters = () => {
    setJudg({ buy: false, sell: false, hold: false })
    setReg({ start: false, prep: false, fail: false, drop: false, none: false })
    setKeyword('')
    setQuick('전체')
    setStartDt(startOfToday())
    setEndDt(new Date())
  }

  // TEMP: live-filter the dummy list by stock name + 판단 + 레짐 (real filtering = backend).
  const q = keyword.trim().toLowerCase()
  const anyJudg = Object.values(judg).some(Boolean)
  const anyReg = Object.values(reg).some(Boolean)
  // counts = per-judgment totals of the 키워드+레짐 view (independent of the 판단 selection)
  const base = snapshots.filter(
    (s) =>
      `${s.name} ${s.memo}`.toLowerCase().includes(q) &&
      (!anyReg || reg[s.regime]),
  )
  const counts = {
    buy: base.filter((s) => s.judgment === 'buy').length,
    sell: base.filter((s) => s.judgment === 'sell').length,
    hold: base.filter((s) => s.judgment === 'hold').length,
  }
  const filtered = base.filter((s) => !anyJudg || judg[s.judgment])

  return (
    <main className="snapshot-list">
      {/* Search */}
      <div className="search">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          placeholder="종목명을 검색하세요"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = e.currentTarget.value.trim()
              if (v) navigate({ to: '/search', search: { q: v } })
            }
          }}
        />
      </div>

      {/* Filter */}
      <div className="filter">
        <div className="fHead">
          <span className="ttl">필터</span>
          <button className="reset" type="button" onClick={resetFilters}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            초기화
          </button>
        </div>

        <div className="fRow">
          <span className="fLabel">기간</span>
          <div className="fField">
            <span className="quickPick">
              빠른 선택{' '}
              <select value={quick} onChange={(e) => setQuick(e.target.value)}>
                <option>전체</option>
                <option>최근 1주</option>
                <option>최근 1개월</option>
                <option>최근 3개월</option>
                <option>최근 6개월</option>
                <option>최근 1년</option>
              </select>
            </span>
            <span className="dateRange">
              <DateTimePicker value={startDt} onChange={setStartDt} />
              <span className="tilde">~</span>
              <DateTimePicker value={endDt} onChange={setEndDt} />
            </span>
          </div>
        </div>

        <div className="fRow">
          <span className="fLabel">판단</span>
          <div className="fField">
            {(['buy', 'sell', 'hold'] as Judgment[]).map((k) => (
              <span
                key={k}
                className={cn('jPill', k, judg[k] ? 'on' : 'off')}
                onClick={() => setJudg((p) => ({ ...p, [k]: !p[k] }))}
              >
                <span className="dot" />
                {JUDGMENT_LABEL[k]}
              </span>
            ))}
          </div>
        </div>

        <div className="fRow">
          <span className="fLabel">주식 레짐</span>
          <div className="fField">
            {(['start', 'prep', 'fail', 'drop', 'none'] as Regime[]).map(
              (k) => (
                <span
                  key={k}
                  className={cn('rPill', k, reg[k] ? 'on' : 'off')}
                  onClick={() => setReg((p) => ({ ...p, [k]: !p[k] }))}
                >
                  <RegimeIcon regime={k} width={24} height={18} />
                  {REGIME_LABEL[k]}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="fRow">
          <span className="fLabel">키워드</span>
          <div className="fField">
            <span className="stockSearch">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.5)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                placeholder="종목명, 회고 메모 키워드로 검색"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </span>
          </div>
        </div>
      </div>

      {/* Result box */}
      <div className="resultBox">
        <div className="counts">
          <span className="cnt buy">
            <span className="pip" />
            매수 <span className="num">{counts.buy}</span>
          </span>
          <span className="cnt sell">
            <span className="pip" />
            매도 <span className="num">{counts.sell}</span>
          </span>
          <span className="cnt hold">
            <span className="pip" />
            관망 <span className="num">{counts.hold}</span>
          </span>
        </div>

        <div className="grid">
          {filtered.map((snap, i) => (
            <Link
              key={`${snap.name}-${i}`}
              to="/snapshots/edit"
              className={`snap ${snap.judgment}`}
            >
              <div className="snapTop">
                <div className="snapTopLeft">
                  <div className="snapName">{snap.name}</div>
                  <span className={`smPill ${snap.regime}`}>
                    <RegimeIcon regime={snap.regime} width={18} height={14} />
                    {REGIME_LABEL[snap.regime]}
                  </span>
                </div>
                <span className={`snapJ ${snap.judgment}`}>
                  {JUDGMENT_LABEL[snap.judgment]}
                </span>
              </div>
              <p className="snapMemo">{snap.memo}</p>
              <div className="snapBot">
                <span className="snapDate">{snap.date}</span>
                <div className={`snapPrice ${snap.judgment}`}>{snap.price}</div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p
              style={{
                gridColumn: '1 / -1',
                padding: '32px 0',
                textAlign: 'center',
                color: 'rgba(255,255,255,.4)',
                fontSize: 14,
              }}
            >
              조건에 맞는 스냅샷이 없습니다.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
