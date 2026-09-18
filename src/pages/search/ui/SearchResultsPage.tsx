import { Link, useSearch } from '@tanstack/react-router'
import { useStockSearch } from '@/entities/search'
import { fromServerRegime } from '@/shared/lib/snapshots'
import { EntryGateBadge } from '@/shared/ui/EntryGateBadge'

const won = (n: number) => n.toLocaleString('ko-KR')

/** 종목 · 진입 상태 · 현재가 — 머리줄과 줄이 같은 칸을 쓴다 */
const COLS = 'grid grid-cols-[minmax(0,1fr)_200px_140px] items-center gap-5'

/**
 * 종목 검색 결과. 틀은 계획 세부 화면을 따른다 — `px-6 pt-4` 판 위에 `card` 가 쌓이고,
 * 종목은 「이름 18 굵게 · 코드 숫자체 흐리게」 · 상태는 머리줄의 진입 관문 뱃지 그대로.
 *
 * 검색어는 상단 바의 검색 칸 하나가 받는다 — 치는 대로 이 페이지의 `q` 가 바뀐다.
 * 페이지 안에 칸을 또 두지 않는다(두 칸이 서로 다른 값을 들게 된다).
 *
 * 💀 「돌파 상태」(돌파 성공 / 준비 두 뱃지) 열을 「진입 상태」 로 바꿨다 (2026-09-18) —
 *    레짐 뱃지는 진입 관문 뱃지로 통일됐다. 종목 화면에 들어가서 보는 뱃지와 같아야 한다.
 */
export function SearchResultsPage() {
  const { q } = useSearch({ from: '/search' })
  const query = q.trim()

  const { data, isLoading, isError } = useStockSearch(query)
  // 칸을 비우면 쿼리가 꺼지지만 앞 결과(placeholderData)는 남아 있다
  const results = query ? (data ?? []) : []

  const empty = !query
    ? '위 검색 칸에 종목명이나 종목코드를 입력해 주세요.'
    : isLoading
      ? '불러오는 중…'
      : isError
        ? '검색에 실패했습니다.'
        : results.length === 0
          ? '검색 결과가 없습니다.'
          : null

  return (
    <main className="flex flex-col gap-3 px-6 pt-4 pb-6">
      {/* ── 검색어 · 한 줄 ── 계획 화면의 «이 종목 · 한 줄» 자리 */}
      <section className="card flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3">
        {query ? (
          <>
            <h1 className="text-[18px] font-bold text-white">
              <span className="text-brand-red">‘{query}’</span> 검색 결과
            </h1>
            {!isLoading && (
              <span className="font-number text-[13px] font-semibold text-white/45">
                {results.length}건
              </span>
            )}
          </>
        ) : (
          <h1 className="text-[18px] font-bold text-white">종목 검색</h1>
        )}
        <span className="text-[12px] text-white/35">
          종목명 또는 종목코드로 찾습니다
        </span>
      </section>

      {/* ── 결과 ── */}
      <section className="card px-2 py-2">
        <div
          className={`${COLS} border-b border-white/[0.06] px-4 pt-2 pb-2.5 text-[12px] text-white/45`}
        >
          <span>종목</span>
          <span>진입 상태</span>
          <span className="text-right">현재가</span>
        </div>

        {empty ? (
          <p className="py-10 text-center text-[13px] text-white/40">{empty}</p>
        ) : (
          results.map((r) => (
            <Link
              key={r.stockCode}
              to="/stocks/$ticker"
              params={{ ticker: r.stockCode }}
              className={`${COLS} rounded-md px-4 py-3.5 transition-colors hover:bg-white/[0.04]`}
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-[16px] font-bold text-white">
                  {r.stockName}
                </span>
                <span className="font-number text-[12px] text-white/35">
                  {r.stockCode}
                </span>
              </div>
              <div>
                {r.entryState ? (
                  <EntryGateBadge
                    size="sm"
                    entryState={r.entryState}
                    regime={fromServerRegime(r.regime)}
                  />
                ) : (
                  // 스크리닝 판정이 한 번도 없던 종목 — 후보였던 적이 없다
                  <span className="text-[12px] text-white/30">판정 없음</span>
                )}
              </div>
              <span className="font-number text-right text-[15px] font-bold text-white">
                {r.price != null ? won(r.price) : '—'}
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  )
}
