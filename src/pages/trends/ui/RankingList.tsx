import { Info } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import {
  dedupeRanking,
  sortRanking,
  useMergedRanking,
} from '@/entities/ranking'
import { useRankingStream } from '@/entities/realtime'

// 6:4로 좁아졌고 관심 패널이 열리면 더 좁아진다 — 지표 칸을 최소치로 잡고
// 종목명이 남는 폭을 먹는다.
//
// 「1년 모멘텀」·「흐름 안정도」 열을 뺐다 (2026-09-09) — 둘 다 옛 순위 기준이고,
// 차트 밑 카드에서도 같은 이유로 빠졌다 (Q6).
// 값은 «가운데»로 모은다 — 오른쪽 정렬이면 머리글과 값의 글자 폭이 달라
// 서로 다른 자리에 서고, 그게 열이 어긋나 보이던 이유였다.
// 간격을 1.5 → 2.5 로 벌리고 그만큼 칸 폭을 깎았다 (종목명은 안 건드린다)
const GRID =
  'grid grid-cols-[20px_minmax(0,1fr)_68px_72px_30px_72px] items-center gap-2.5'

interface RankingRow {
  stockName: string
  stockCode: string | null
  currentPrice: number | null
  oneYearMomentum: number
  fipScore: number
  epsGrowth: number | null
  direction: 'accel' | 'flat' | 'decel' | null
  up: { eps: boolean; revenue: boolean; margin: boolean } | null
  fundamentalScore: number | null
}

const DASH = '—'

/** 방향 — 「증가율이 가속하는가」. 부호(+1/0/−1)가 아니라 말로 쓴다. */
const DIRECTION = { accel: '가속', flat: '유지', decel: '감속' } as const

/**
 * 동반 상승 — EPS · 매출 · 마진이 «함께» 오르는가 (책 C §4 코드 33).
 *
 * 화살표 셋이었는데 **무엇의 화살표인지 볼 수가 없었다.** 자리로만 뜻을
 * 실으면 열 이름을 따로 읽어야 하고, 열 이름 칸은 셋을 다 못 적는다.
 * 그래서 «이름 자체»를 띄우고 오른 것만 밝힌다 — 이름표가 자기를 설명하니
 * 범례가 필요 없고, 색을 빼도 명도로 남는다 (책 13장 ① · 33장 ②).
 */
function Coincident({ up }: { up: RankingRow['up'] }) {
  if (!up) return <span className="text-center text-white/30">{DASH}</span>
  const cells = [
    ['EPS', up.eps],
    ['매출', up.revenue],
    ['마진', up.margin],
  ] as const
  return (
    <span className="flex justify-center gap-[4px] text-[10px] leading-none whitespace-nowrap">
      {cells.map(([k, v]) => (
        <span key={k} className={v ? 'text-brand-red' : 'text-white/25'}>
          {k}
        </span>
      ))}
    </span>
  )
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
 * 오늘의 후보 — 돌파성공 + 돌파준비를 합친 하나의 목록. 1위 행만 강조한다.
 * 궤적 ① 근거 노출의 자리다. 여기서 고른 종목이 ③ 계획 작성으로 넘어간다.
 * 레짐을 탭으로 고르지 않기로 해서 prop이 없다.
 */
export function RankingList() {
  const { data: restItems, isLoading, isError } = useMergedRanking()
  // 실시간 ranking-update 가 오면 그것을 우선, 없으면 REST 스냅샷 사용.
  const success = useRankingStream('success')
  const ready = useRankingStream('ready')
  const live = success || ready ? [...(success ?? []), ...(ready ?? [])] : null

  const items: RankingRow[] = live
    ? sortRanking(dedupeRanking(live)).map((r) => ({
        ...r,
        epsGrowth: null,
        direction: null,
        up: null,
        fundamentalScore: r.fundamentalScore ?? null,
      }))
    : restItems.map((r) => ({
        stockName: r.stockName,
        stockCode: r.stockCode,
        currentPrice: r.currentPrice,
        oneYearMomentum: r.oneYearMomentum,
        fipScore: r.fipScore,
        epsGrowth: r.epsGrowth,
        direction: r.direction,
        up: r.up,
        fundamentalScore: r.fundamentalScore,
      }))

  return (
    <section className="card flex w-full min-w-0 flex-col px-4 pt-6 pb-3">
      <div className="flex items-start justify-between">
        {/* 제목은 내비를 따라 쓰지 않는다 — 내비는 «화면 이름»(오늘의 후보)이고
            여기는 그 화면 안 «이 목록»이다. 목록을 목록이게 하는 건 무엇으로
            줄 세웠나이므로 그것을 쓴다.
            「순위」가 상설 순위표로 읽히는 문제는 옆의 시각이 막는다 —
            빠져 있던 건 이름이 아니라 「언제 것인가」였다 */}
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold whitespace-nowrap text-white">
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
            className="pointer-events-none absolute top-full right-0 z-30 mt-2 w-[300px] rounded-xl border border-white/10 bg-[#1a1a1a] p-4 text-left opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-opacity duration-150 group-hover:opacity-100"
          >
            <div className="text-[13px] font-bold text-white">
              이 순위는 어떻게 매겨지나요?
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/70">
              게이트를 통과한 종목끼리 <b className="text-white/90">0~7점</b>{' '}
              으로 줄 세웁니다. 가격이 아니라 실적입니다.
            </p>
            {/* 「수준 · 방향 · 동반」이라고만 적었더니 읽어도 무슨 말인지
                알 수 없었다. 축 이름 대신 **묻는 말**을 그대로 쓴다 */}
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed">
              <li>
                <div className="text-white/90">EPS 증가율이 얼마나 높은가</div>
                <div className="font-number text-white/45">
                  40% 이상 3점 · 25~40% 2점 · 20~25% 1.5점 · 0~20% 1점
                </div>
              </li>
              <li>
                <div className="text-white/90">그 증가율이 오르고 있는가</div>
                <div className="text-white/45">
                  가속 +1점 · 유지 0점 · 감속 −1점
                </div>
              </li>
              <li>
                <div className="text-white/90">
                  EPS · 매출 · 마진이 같이 오르는가
                </div>
                <div className="text-white/45">각 1점 — 최근 3분기 기준</div>
              </li>
            </ul>
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
        <span className="text-center">EPS 증가율</span>
        <span className="text-center">동반 상승</span>
        <span className="text-center">점수</span>
        <span className="text-center">현재 가격</span>
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
            <span className="truncate font-medium text-white">
              {row.stockName}
            </span>
            {/* 「방향」을 따로 세우지 않는다 — 무엇의 방향인지 열 이름만 봐서는
                알 수 없었다. 방향은 «이 증가율의» 방향이므로 같은 칸에 붙인다 */}
            <span className="flex items-baseline justify-center gap-1 whitespace-nowrap">
              <span className="font-number text-[13px] text-white/85">
                {row.epsGrowth != null ? `+${row.epsGrowth}%` : DASH}
              </span>
              <span className="text-[11px] text-white/45">
                {row.direction != null ? DIRECTION[row.direction] : ''}
              </span>
            </span>
            <Coincident up={row.up} />
            <span className="font-number text-center font-semibold text-white">
              {row.fundamentalScore != null
                ? row.fundamentalScore.toFixed(1)
                : DASH}
            </span>
            <span className="font-number text-center font-medium text-white">
              {row.currentPrice != null
                ? `₩ ${row.currentPrice.toLocaleString()}`
                : '-'}
            </span>
          </Link>
        ))}
    </section>
  )
}
