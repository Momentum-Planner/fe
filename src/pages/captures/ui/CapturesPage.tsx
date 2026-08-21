import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { RegimeIcon } from '@/shared/ui/RegimeIcon'
import { DateTimePicker } from '@/shared/ui/DateTimePicker'
import type { Judgment, Regime } from '@/shared/lib/snapshots'
import {
  fromServerJudgment,
  fromServerRegime,
  toServerJudgment,
  toServerRegime,
} from '@/shared/lib/snapshots'
import { toLocalDateTime } from '@/shared/lib/datetime'
import { useSnapshotList } from '@/entities/snapshot'
import './snapshot-list.css'

const startOfToday = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0)
}

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

function formatRecordedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}. ${p(d.getHours())}:${p(d.getMinutes())}`
}

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

  const selectedJudgments = (['buy', 'sell', 'hold'] as Judgment[]).filter(
    (k) => judg[k],
  )
  const selectedRegimes = (
    ['start', 'prep', 'fail', 'drop', 'none'] as Regime[]
  ).filter((k) => reg[k])

  // 서버 필터링 — 기간/판단/레짐/종목명을 백엔드로 전달한다.
  const { data, isLoading, isError } = useSnapshotList({
    startDate: toLocalDateTime(startDt),
    endDate: toLocalDateTime(endDt),
    judgments: selectedJudgments.map(toServerJudgment),
    regimes: selectedRegimes.map(toServerRegime),
    stockName: keyword.trim() || undefined,
  })

  const counts = {
    buy: data?.buyCount ?? 0,
    sell: data?.sellCount ?? 0,
    hold: data?.watchCount ?? 0,
  }
  const items = (data?.snapshots ?? []).map((s) => ({
    snapshotId: s.snapshotId,
    name: s.stockName,
    regime: fromServerRegime(s.stockRegime),
    judgment: fromServerJudgment(s.judgment),
    date: formatRecordedAt(s.recordedAt),
    price: `₩${s.price.toLocaleString()}`,
  }))

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
                placeholder="종목명으로 검색"
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
          {items.map((snap) => (
            <Link
              key={snap.snapshotId}
              to="/snapshots/edit"
              search={{ id: snap.snapshotId }}
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
              <div className="snapBot">
                <span className="snapDate">{snap.date}</span>
                <div className={`snapPrice ${snap.judgment}`}>{snap.price}</div>
              </div>
            </Link>
          ))}
          {(isLoading || isError || items.length === 0) && (
            <p
              style={{
                gridColumn: '1 / -1',
                padding: '32px 0',
                textAlign: 'center',
                color: 'rgba(255,255,255,.4)',
                fontSize: 14,
              }}
            >
              {isLoading
                ? '불러오는 중…'
                : isError
                  ? '스냅샷을 불러오지 못했습니다.'
                  : '조건에 맞는 스냅샷이 없습니다.'}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
