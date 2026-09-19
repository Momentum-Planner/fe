import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { dedupeRanking, EPS_FLOOR, useMergedRanking } from '@/entities/ranking'
import type { Quarters } from '@/entities/ranking'
import { useRankingStream } from '@/entities/realtime'

// 6:4로 좁아졌고 관심 패널이 열리면 더 좁아진다 — 지표 칸을 최소치로 잡고
// 종목명이 남는 폭을 먹는다.
//
// 「1년 모멘텀」·「흐름 안정도」 열을 뺐다 (2026-09-09) — 둘 다 옛 순위 기준이고,
// 차트 밑 카드에서도 같은 이유로 빠졌다 (Q6).
// 값은 «가운데»로 모은다 — 오른쪽 정렬이면 머리글과 값의 글자 폭이 달라
// 서로 다른 자리에 서고, 그게 열이 어긋나 보이던 이유였다.
// 간격을 1.5 → 2.5 로 벌리고 그만큼 칸 폭을 깎았다 (종목명은 안 건드린다)
/**
 * 순위 · 종목 · 현재 가격.
 * 판정(EPS · 연속 · 가속 · 33)은 화면에 안 쓴다 (2026-09-19 사용자 · 「그냥 화면에 보여주지 말자」).
 * 어떻게 줄 세웠는지는 ⓘ 에 적는다. 현재 가격은 96px · 한 줄.
 */
const GRID = 'grid grid-cols-[20px_minmax(0,1fr)_96px] items-center gap-2.5'

/** ⓘ 점수표 — `scoreOf` 와 같은 넷 */
const SCORE_ROWS = [
  [`EPS 증가율 ${EPS_FLOOR}% 이상`, `${EPS_FLOOR}% 이상인 분기마다 1점`, '0~3'],
  ['EPS 증가율이 오름', '직전 분기보다 오르면 1점', '0~2'],
  ['매출 증가율이 오름', '직전 분기보다 오르면 1점', '0~2'],
  ['마진율이 오름', '직전 분기보다 오르면 1점', '0~2'],
] as const

interface RankingRow {
  stockName: string
  stockCode: string | null
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
  quarters: Quarters | null
}

/**
 * 이 목록이 «언제» 것인가. ⑤-2 는 마감 후 배치라 그 시각이 곧 목록의 나이다.
 *
 * ⚠️ 백엔드가 아직 이 값을 안 준다 — 응답에 필드가 생기면 그걸 쓴다.
 *    지금은 KRX 마감 배치(15:30)를 기준으로 «직전에 돌았을 시각»을 친다.
 *    15:30 전이거나 주말이면 직전 영업일로 물러난다.
 */
function batchStamp(now = new Date()): string {
  const d = new Date(now)
  const beforeBatch = d.getHours() * 60 + d.getMinutes() < 15 * 60 + 30
  if (beforeBatch) d.setDate(d.getDate() - 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)

  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} 15:30`
}

/**
 * 스크리너 — 돌파성공 + 돌파준비를 합친 하나의 목록. 1위 행만 강조한다.
 * 궤적 ① 근거 노출의 자리다. 여기서 고른 종목이 ③ 계획 작성으로 넘어간다.
 * 레짐을 탭으로 고르지 않기로 해서 prop이 없다.
 */
export function RankingList({
  selected,
  onSelect,
}: {
  /** 차트 · 카드가 보이고 있는 종목 */
  selected: string | null
  onSelect: (code: string) => void
}) {
  const { data: restItems, isLoading, isError } = useMergedRanking()
  // 실시간 ranking-update 가 오면 그것을 우선, 없으면 REST 스냅샷 사용.
  const success = useRankingStream('success')
  const ready = useRankingStream('ready')
  const live = success || ready ? [...(success ?? []), ...(ready ?? [])] : null

  const items: RankingRow[] = live
    ? // 실시간 스트림엔 분기 값이 없다 — 판정 못 하니 서버가 준 순서 그대로
      dedupeRanking(live).map((r) => ({
        ...r,
        quarters: null,
      }))
    : restItems.map((r) => ({
        stockName: r.stockName,
        stockCode: r.stockCode,
        currentPrice: r.currentPrice,
        oneYearMomentum: r.oneYearMomentum,
        fipScore: r.fipScore,
        quarters: r.quarters,
      }))

  return (
    <section className="card flex w-full min-w-0 flex-col px-4 pt-4 pb-3 sm:px-5">
      <div className="shrink-0">
        <div className="flex items-start justify-between">
          {/* 제목은 내비를 따라 쓰지 않는다 — 내비는 «화면 이름»(스크리너)이고
            여기는 그 화면 안 «이 목록»이다. 목록을 목록이게 하는 건 무엇으로
            줄 세웠나이므로 그것을 쓴다.
            「순위」가 상설 순위표로 읽히는 문제는 옆의 시각이 막는다 —
            빠져 있던 건 이름이 아니라 「언제 것인가」였다 */}
          <div className="min-w-0">
            <h3 className="mt-0.5 text-[18px] leading-none font-bold whitespace-nowrap text-white">
              펀더멘털 순위
            </h3>
            <div className="font-number mt-1 truncate text-[12px] text-white/45">
              {batchStamp()} 기준
            </div>
          </div>
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
              className="pointer-events-none absolute top-full right-0 z-30 mt-2 w-[320px] rounded-xl border border-white/10 bg-[#1a1a1a] p-4 text-left opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-opacity duration-150 group-hover:opacity-100"
            >
              <div className="text-[13px] font-bold text-white">
                이 순위는 어떻게 매겨지나요?
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-white/70">
                게이트를 통과한 종목을{' '}
                <b className="text-white/90">최근 3분기</b> 실적으로 채점합니다.
                관측 하나에 1점, <b className="text-white/90">9점 만점</b>
                입니다. 증가율은 전년 동기 대비입니다.
              </p>
              {/* 점수표를 그대로 — 20% 는 분기마다(셋), 오름은 분기 사이 비교마다(둘) */}
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed">
                {SCORE_ROWS.map(([what, how, pts]) => (
                  <li key={what} className="flex items-baseline gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-white/90">{what}</div>
                      <div className="text-white/45">{how}</div>
                    </div>
                    <span className="font-number shrink-0 text-white/70">
                      {pts}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                점수가 높은 순입니다. 같으면 EPS 증가율 상승폭(최근 − 3분기 전,
                %p)이 큰 순입니다.
              </p>
            </div>
          </div>
        </div>
        <div
          className={cn(
            GRID,
            'border-b border-white/[0.06] pt-0.5 pb-2 text-[11px] text-white/50',
          )}
        >
          <span />
          <span />
          <span className="text-right">현재 가격</span>
        </div>
      </div>

      {/* 넘치는 줄은 여기서 넘긴다 — 목록 높이는 왼쪽(차트 + 카드)을 따른다.
          −12 로 내보내 줄 안쪽 12 를 상쇄한다 — 순위 숫자가 제목과 한 세로선 (4장 ③ 가) */}
      <div className="no-scrollbar -mx-3 min-h-0 flex-1 overflow-y-auto">
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
          items.map((row, i) => {
            const code = row.stockCode ?? row.stockName
            const on = code === selected
            return (
              // 줄을 누르면 «고른다» — 차트 · 카드가 이 종목으로 바뀐다.
              // 종목 화면으로 가는 길은 차트 머리의 ⤢ 하나 (4장 ① 가)
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(code)}
                className={cn(
                  GRID,
                  'w-full rounded-[10px] border-b border-white/[0.04] px-3 py-3.5 text-left text-[14px] transition-colors hover:bg-white/[0.06]',
                  on && 'bg-white/[0.08] hover:bg-white/[0.08]',
                )}
              >
                {/* 고른 줄은 배경 하나로만 — 순위 숫자까지 빨갛게 하니 과했다 (2026-09-19 사용자) */}
                <span className="font-number text-[13px] text-white/50">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    'truncate font-medium',
                    on ? 'text-white' : 'text-white/80',
                  )}
                >
                  {row.stockName}
                </span>
                <span className="font-number text-right font-medium whitespace-nowrap text-white/60">
                  {row.currentPrice != null
                    ? `₩ ${row.currentPrice.toLocaleString()}`
                    : '-'}
                </span>
              </button>
            )
          })}
      </div>
    </section>
  )
}
