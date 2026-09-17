/**
 * 거래 기록 — **아카이브다. 색인에서 결과로 찾는다** (Q14).
 *
 * ```text
 * [종목 찾기]  [수익 큰 순 | 손실 큰 순]
 * ▸ LG화학        ◆ 돌파 183,500   25.11.03 ~ 26.01.04   [스냅샷] [계획 보기]  │  +730만
 * ▸ 카카오        계획에 없음        25.10.02 ~ 25.10.02                        │  −101만
 * ```
 *
 * 💀 **브라우징이 아니었다** (Q13 ① 을 Q14 가 뒤집는다). *「솔직히 목록은 필요
 * 없는데 아카이브처럼 찾는 게 있어야 한다」* — 찾는 기준은 결과였다. 그래서
 * 기본은 **전부 접힌 색인**이고 순서는 **손익 합계(원)**다.
 *
 * 💀 **줄 하나 = 계획 하나** (Q13 ②). 계획 없는 체결은 «매도 하나»가 한 줄이다 —
 * 한 묶음으로 두면 손익 순위에서 계획 없이 크게 잃은 거래가 합계 속에 묻힌다.
 *
 * 💀 **스냅샷은 머리줄에서 연다** (Q13 ③). 계획의 것이라 체결마다 열면 같은
 * 것이 반복됐다. 더 깊이는 계획 화면으로.
 *
 * ⚠️ **위쪽 기간 선택에 안 걸린다.** 여기 필터는 목록 «자기» 것이다.
 */

import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SELL_REASON_LABEL } from '@/entities/tradeRecord'
import type { TradeRecord, TradeSnapshot } from '@/entities/tradeRecord'
import { REGIME_LABEL } from '@/shared/lib/snapshots'
import {
  LIST_FILTER_ALL,
  isNoneGroup,
  dateBounds,
  filterGroups,
  gatePassed,
  groupRows,
  isAllFilter,
  sortGroups,
} from '../model/aggregate'
import type {
  FillRow,
  ListFilter,
  ListOrder,
  PlanClass,
  PlanGroup,
} from '../model/aggregate'
import { Dash, Panel, pct, toneOf, won } from './parts'

/**
 * 한 번에 «더» 세우는 행 수. **묶음을 중간에서 자르지 않는다** (Q13 ⑤) —
 * 이 수를 넘기는 묶음까지 통째로 넣는다. 접힌 묶음은 머리줄 한 행이다.
 */
const PAGE = 30
/** 바닥에서 이만큼 남았을 때 미리 이어 붙인다 — 빈 칸을 보이지 않으려고 */
const NEAR_END = 120
const COLS = 7

export function RecordList({ rows }: { rows: FillRow[] }) {
  const [shown, setShown] = useState(PAGE)
  const [filter, setFilter] = useState<ListFilter>(LIST_FILTER_ALL)
  const [order, setOrder] = useState<ListOrder>('PROFIT')
  /** 사용자가 직접 여닫은 묶음만 든다. 없으면 기본값을 따른다 */
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  /** 스냅샷을 연 묶음 — 포괄 목록이라 «여럿» 열린다 (45) */
  const [snaps, setSnaps] = useState<Set<string>>(new Set())

  const groups = useMemo(
    () => sortGroups(groupRows(rows), order),
    [rows, order],
  )
  const shownGroups = useMemo(
    () => filterGroups(groups, filter),
    [groups, filter],
  )
  /**
   * 💀 **전체 건수를 올리지 않는다** (Q14 ⑤). 손잡이 옆의 수 · 「체결 83건」 ·
   * 「보고 있는 것」 줄을 전부 걷었다 — *「count() 쿼리 날리기 힘들다」*.
   * 아카이브는 쌓이기만 하므로 목록이 서버에서 끊겨 오게 되면 전체 셈은 따로
   * 쿼리를 써야 한다. 합계가 필요한 자리는 위의 요약 카드다.
   */
  const bounds = useMemo(() => dateBounds(rows), [rows])

  // 거르거나 목록이 갈리면 «처음»으로 돌아간다
  useEffect(() => setShown(PAGE), [rows, filter, order])

  /** **기본은 전부 접힌 색인이다** (Q14) — 한 줄이 계획 하나. 눌러야 체결이 펼쳐진다 */
  const isOpen = (g: PlanGroup) => toggled[g.key] ?? false

  // 묶음 단위로 이어 붙인다
  const page: PlanGroup[] = []
  let used = 0
  for (const g of shownGroups) {
    if (used >= shown) break
    page.push(g)
    used += 1 + (isOpen(g) ? g.rows.length : 0)
  }
  const rest = shownGroups.length - page.length
  const on = !isAllFilter(filter)

  return (
    <Panel
      title="거래 기록"
      desc="계획 하나가 한 줄 — 눌러서 체결을 펼칩니다. 위쪽 기간 선택에 걸리지 않습니다"
    >
      {/**
       * **찾기와 순서만 앞에 선다** (Q14 ⑤). 아카이브에서 손이 가는 것은 둘이고,
       * 거르기 셋은 오른쪽 끝에 한 단 흐리게 — 없애지 않는다. **하나라도 걸리면
       * 흐림을 푼다** — 걸린 조건이 흐려 보이면 목록이 왜 줄었는지 못 읽는다.
       */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/8 pb-3">
        <input
          type="search"
          value={filter.q}
          onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
          placeholder="종목 이름이나 코드"
          aria-label="종목 찾기"
          className="text-fg-primary placeholder:text-fg-tertiary w-56 rounded-sm border border-white/16 bg-white/6 px-2.5 py-1.5 text-[12px] outline-none focus:border-white/30"
        />
        <Group
          value={order}
          onPick={setOrder}
          items={[
            { key: 'PROFIT', label: '수익 큰 순' },
            { key: 'LOSS', label: '손실 큰 순' },
          ]}
        />

        <div
          className={`ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 transition-opacity focus-within:opacity-100 hover:opacity-100 ${
            on ? '' : 'opacity-60'
          }`}
        >
          {/**
           * 날짜는 **위쪽 워터폴과 따로 논다** — 워터폴의 기간은 「통계를 어느
           * 구간으로 접을까」이고 여기는 「그날 무엇을 샀더라」를 찾는 것이다.
           */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/30">체결일</span>
            <DayPick
              value={filter.from}
              min={bounds.min}
              max={filter.to || bounds.max}
              onPick={(from) => setFilter((f) => ({ ...f, from }))}
            />
            <span className="text-[11px] text-white/25">~</span>
            <DayPick
              value={filter.to}
              min={filter.from || bounds.min}
              max={bounds.max}
              onPick={(to) => setFilter((f) => ({ ...f, to }))}
            />
            {(filter.from || filter.to) && (
              <button
                type="button"
                onClick={() => setFilter((f) => ({ ...f, from: '', to: '' }))}
                className="rounded-sm px-1.5 py-1 text-[11px] text-white/35 transition hover:bg-white/8 hover:text-white/70"
                aria-label="체결일 지우기"
              >
                ✕
              </button>
            )}
          </div>
          <Group
            label="계획"
            value={filter.plan}
            onPick={(plan) => setFilter((f) => ({ ...f, plan }))}
            items={[
              { key: 'ALL', label: '전체' },
              { key: 'YES' as PlanClass, label: '있음' },
              { key: 'NONE' as PlanClass, label: '없음' },
            ]}
          />
          <Group
            label="게이트"
            value={filter.gate}
            onPick={(gate) => setFilter((f) => ({ ...f, gate }))}
            items={[
              { key: 'ALL', label: '전체' },
              { key: 'PASS', label: '◆ 통과' },
              { key: 'SHORT', label: '◇ 미달' },
            ]}
          />
          {on && (
            <button
              type="button"
              onClick={() => setFilter(LIST_FILTER_ALL)}
              className="rounded-pill border border-white/12 px-2.5 py-1 text-[11px] text-white/55 transition hover:bg-white/8"
            >
              거르기 해제
            </button>
          )}
        </div>
      </div>

      {page.length === 0 ? (
        <p className="m-0 py-6 text-center text-[12px] text-white/35">
          거른 조건에 맞는 체결이 없습니다.
        </p>
      ) : (
        <div className="relative">
          <div
            className="no-scrollbar max-h-[540px] overflow-auto"
            onScroll={(e) => {
              const el = e.currentTarget
              if (el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_END)
                setShown((n) => (rest > 0 ? n + PAGE : n))
            }}
          >
            {/**
             * **바깥 열은 색인의 것이다** (Q14 ③). 기본 화면이 접힌 색인이라
             * 열 이름도 색인에 맞춘다 — 체결 열 이름 밑에 계획명이 서지 않게.
             * 펼친 체결은 안쪽 표가 자기 열 이름을 갖는다.
             */}
            <table className="w-full min-w-[860px] border-collapse">
              <colgroup>
                <col style={{ width: 170 }} />
                {/* 결과가 종목 «바로 옆» — 무엇 + 얼마가 한 덩어리로 읽힌다 (Q14 ⑤) */}
                <col style={{ width: 110 }} />
                <col style={{ width: 230 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 56 }} />
                {/* 버튼은 줄 내용의 끝에 — 남는 폭은 표 오른쪽 끝으로 (Q14 ③) */}
                <col style={{ width: 160 }} />
                <col />
              </colgroup>
              {/* 머리줄은 «따라온다» — 훑는 동안 열 이름이 사라지지 않게 */}
              <thead className="bg-bg-input sticky top-0 z-10">
                <tr className="text-fg-tertiary h-8 text-[11px]">
                  <Th>종목</Th>
                  <Th right>손익 합계</Th>
                  <Th pad>계획</Th>
                  <Th>기간</Th>
                  <Th right>체결</Th>
                  <Th />
                  <Th />
                </tr>
              </thead>
              {page.map((g) => {
                const open = isOpen(g)
                const snap = snaps.has(g.key)
                return (
                  <tbody key={g.key}>
                    <GroupHead
                      g={g}
                      open={open}
                      snap={snap}
                      onToggle={() =>
                        setToggled((t) => ({ ...t, [g.key]: !open }))
                      }
                      onSnap={() =>
                        setSnaps((s) => {
                          const n = new Set(s)
                          if (n.has(g.key)) n.delete(g.key)
                          else n.add(g.key)
                          return n
                        })
                      }
                    />
                    {snap && (
                      /* 연 계획은 머리줄부터 끝까지 «한 면»이다 (Q14 ④ 폐쇄성) */
                      <tr
                        className={`bg-bg-surface ${open ? '' : 'border-border-subtle border-b'}`}
                      >
                        <td colSpan={COLS} className="py-3 pr-3 pl-6">
                          <SnapshotLayer s={g.snapshot} />
                        </td>
                      </tr>
                    )}
                    {open && (
                      <tr className="bg-bg-surface border-border-subtle border-b">
                        <td colSpan={COLS} className="pt-1 pr-3 pb-3 pl-6">
                          <Fills rows={g.rows} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                )
              })}
            </table>
          </div>
          {/* 아래가 더 있다는 표시 — 바 대신 흐림 하나 */}
          {rest > 0 && (
            <div className="from-bg-input pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t to-transparent" />
          )}
        </div>
      )}
    </Panel>
  )
}

/**
 * 색인 한 줄 = 계획 하나. **스크롤해도 따라온다** (Q13 ⑥) — 펼친 체결을
 * 내려가는 동안 어느 계획인지 사라지지 않게. 표 머리줄(`h-8`) 바로 아래에 붙는다.
 *
 * ▸ 는 체결을 여닫고, 「스냅샷」은 스냅샷을 연다 — **한 자리에 두 일을 두지 않는다.**
 */
function GroupHead({
  g,
  open,
  snap,
  onToggle,
  onSnap,
}: {
  g: PlanGroup
  open: boolean
  snap: boolean
  onToggle: () => void
  onSnap: () => void
}) {
  const none = isNoneGroup(g)
  /**
   * **접힌 줄은 동등한 목록의 한 줄이다** (Q14 ④ 유사성) — 배경 없이 얇은 선만.
   * 연 줄만 면이 된다. 따라오는(sticky) 것도 연 줄뿐이라 불투명 배경은 거기에만 든다.
   */
  const raised = open || snap
  const cell = raised
    ? 'bg-bg-surface sticky top-8 z-[5] py-2 pr-3'
    : 'border-border-subtle border-b py-2 pr-3'
  const pass = g.rows[0] ? gatePassed(g.rows[0].rec) : false

  return (
    <tr className={raised ? '' : 'transition hover:bg-white/3'}>
      {/* 종목이 맨 앞 — 한 열로 서야 세로로 훑힌다 (Q13 ④) */}
      <td className={`${cell} pl-1`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-1.5 text-left"
        >
          {/* 10px 글자 ▾ 는 방향이 안 읽혔다 — 아이콘으로 키운다 */}
          <ChevronDown
            size={16}
            strokeWidth={2.25}
            aria-hidden
            className="text-fg-secondary shrink-0"
          />
          <span className="text-fg-primary truncate text-[13px] font-bold">
            {g.stockName}
          </span>
        </button>
      </td>
      {g.sells === 0 ? (
        /**
         * 매도가 없는 줄 — **0 으로 적지 않는다.** 본전으로 읽힌다 (Q13 ④).
         * ⚠️ 승계 대상(「→ 계획 B 로 승계」)은 체결 목록만으로는 모른다.
         */
        <td className={`${cell} text-fg-tertiary text-right text-[11px]`}>
          매도 없음
        </td>
      ) : (
        <td
          className={`${cell} t-num text-right text-[16px] font-medium ${toneOf(g.realized)}`}
          title="이 줄 매도들의 손익 합 — 펼치면 매도가 따로 섭니다"
        >
          {won(g.realized)}
        </td>
      )}
      <td className={`${cell} pl-6`}>
        {none ? (
          <span className="text-fg-tertiary text-[12px]">계획에 없음</span>
        ) : (
          <span className="flex items-baseline gap-1.5 truncate">
            <span
              className={`t-num text-[11px] ${pass ? 'text-fg-secondary' : 'text-fg-tertiary'}`}
              title={pass ? '게이트 통과 — 트렌드 8/8' : '게이트 미달'}
            >
              {pass ? '◆' : '◇'}
            </span>
            <span className="text-fg-secondary truncate text-[12px]">
              {g.planTitle}
            </span>
          </span>
        )}
      </td>
      {/* 아카이브의 「언제」 */}
      <td className={`${cell} t-num text-fg-tertiary text-[11px]`}>
        {g.firstAt === g.lastAt
          ? day(g.firstAt)
          : `${day(g.firstAt)} ~ ${day(g.lastAt)}`}
      </td>
      <td className={`${cell} t-num text-fg-tertiary text-right text-[11px]`}>
        {g.rows.length}
      </td>
      <td className={`${cell} text-fg-tertiary text-[11px]`}>
        {!none && (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={onSnap}
              aria-pressed={snap}
              className={`rounded-sm px-1.5 py-0.5 transition ${
                snap
                  ? 'text-fg-primary bg-white/14'
                  : 'hover:text-fg-secondary hover:bg-white/8'
              }`}
            >
              스냅샷
            </button>
            {g.planId !== null && (
              <Link
                to="/stocks/$ticker/plan/$planId"
                params={{ ticker: g.stockCode, planId: String(g.planId) }}
                className="hover:text-fg-secondary rounded-sm px-1.5 py-0.5 transition hover:bg-white/8"
              >
                계획 보기 →
              </Link>
            )}
          </span>
        )}
      </td>
      <td className={cell} />
    </tr>
  )
}

/**
 * 펼친 체결 — **안쪽 표가 자기 열 이름을 갖는다** (Q14 ③). 들여 써서 「이 계획
 * 안」으로 읽히게 한다.
 */
function Fills({ rows }: { rows: FillRow[] }) {
  return (
    <table className="w-full border-collapse">
      <colgroup>
        <col style={{ width: 84 }} />
        <col style={{ width: 44 }} />
        <col style={{ width: 80 }} />
        <col style={{ width: 60 }} />
        {/* 사유 — 최장 23자에 맞춘다 (Q13 ④) */}
        <col style={{ width: 250 }} />
        <col style={{ width: 80 }} />
        <col style={{ width: 84 }} />
        <col style={{ width: 64 }} />
        <col style={{ width: 52 }} />
        <col />
      </colgroup>
      <thead>
        <tr className="text-fg-tertiary text-[11px]">
          <SubTh>체결일</SubTh>
          <SubTh>구분</SubTh>
          <SubTh right>가격</SubTh>
          <SubTh right>수량</SubTh>
          <SubTh>사유</SubTh>
          <SubTh right>수익률</SubTh>
          <SubTh right>손익</SubTh>
          <SubTh right>R배수</SubTh>
          <SubTh right>보유</SubTh>
          <SubTh />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fill key={row.rec.recordId} rec={row.rec} dim={!!row.dim} />
        ))}
      </tbody>
    </table>
  )
}

const SubTh = ({
  children,
  right,
}: {
  children?: React.ReactNode
  right?: boolean
}) => (
  <th
    className={`border-b border-white/8 py-1 pr-3 font-normal ${right ? 'text-right' : 'text-left'}`}
  >
    {children}
  </th>
)

function Fill({ rec, dim }: { rec: TradeRecord; dim: boolean }) {
  const d = rec.derived
  const sell = rec.side === 'SELL' && d
  const reason =
    rec.side === 'SELL'
      ? rec.sellReasons.map((k) => SELL_REASON_LABEL[k]).join(' · ')
      : rec.reason
  const td = 'py-1.5 pr-3'

  return (
    <tr
      className={`border-b border-white/5 transition hover:bg-white/3 ${
        dim ? 'opacity-35' : ''
      }`}
    >
      <td className={`${td} t-num text-fg-tertiary text-[11px]`}>
        {day(rec.filledAt)}
      </td>
      {/* 색을 뺐다 — 빨강 · 파랑은 결과만 진다 (Q14 ②) */}
      <td className={`${td} text-fg-tertiary text-[11px]`}>
        {sell || rec.side === 'SELL' ? '매도' : '매수'}
      </td>
      <td className={`${td} t-num text-fg-tertiary text-right text-[11px]`}>
        {rec.price.toLocaleString()}
      </td>
      <td className={`${td} t-num text-fg-tertiary text-right text-[11px]`}>
        {rec.quantity.toLocaleString()}
      </td>
      <td
        className={`${td} text-fg-tertiary max-w-0 truncate text-[11px]`}
        title={reason}
      >
        {reason}
      </td>
      {/* 매수 행은 오른쪽 네 칸이 빈다 — 빈 것이 정보다 */}
      {sell ? (
        <>
          <td
            className={`${td} t-num text-right text-[13px] font-medium ${toneOf(d.returnPct)}`}
          >
            {pct(d.returnPct, 2)}
          </td>
          <td
            className={`${td} t-num text-right text-[12px] ${toneOf(d.profit)}`}
          >
            {won(d.profit)}
          </td>
          <td
            className={`${td} t-num text-fg-secondary text-right text-[12px]`}
          >
            {d.rMultiple === null ? <Dash /> : `${d.rMultiple.toFixed(2)}R`}
          </td>
          <td className={`${td} t-num text-fg-tertiary text-right text-[11px]`}>
            {d.holdingDays}일
          </td>
        </>
      ) : (
        <>
          <td />
          <td />
          <td />
          <td />
        </>
      )}
      <td />
    </tr>
  )
}

/** 층 — 계획의 스냅샷 열 개가 여기서 열린다 */
function SnapshotLayer({ s }: { s: TradeSnapshot | null }) {
  if (!s)
    return (
      <p className="m-0 text-[11px] text-white/35">
        진입 시점 스냅샷이 없습니다 — 사후에 만들지 않습니다 (F4).
      </p>
    )

  return (
    <div className="flex flex-col gap-2 border-l-2 border-white/15 pl-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
        <Item k="판정일" v={s.date} />
        <Item k="레짐" v={REGIME_LABEL[s.regime]} />
        <Item k="진입 상태" v={s.entryState} />
        <Item k="트렌드" v={`${s.trendPassed}/8`} />
        <Item k="베이스" v={`${s.baseNo}번째`} />
        <Item k="VCP" v={s.vcp ? '잡힘' : '없음'} />
        <Item k="펀더멘털" v={`${s.fundamentalScore}/7`} />
        <Item k="훼손" v={`${s.damageScore}점`} />
        <Item k="진입 위치" v={`${s.entryPosition}%`} />
      </div>
      {s.trendFailed.length > 0 && (
        <p className="m-0 text-[11px] text-white/40">
          어긴 조건 — {s.trendFailed.join(' · ')}
        </p>
      )}
    </div>
  )
}

const Th = ({
  children,
  right,
  divide,
  pad,
}: {
  children?: React.ReactNode
  right?: boolean
  divide?: boolean
  /** 결과 열 뒤의 숨 — 숫자와 계획명이 붙어 읽히지 않게 */
  pad?: boolean
}) => (
  <th
    className={`border-b border-white/10 py-0 font-normal ${
      right ? 'pr-3 text-right' : 'pr-3 text-left'
    } ${divide ? 'border-l border-l-white/10 pl-3' : ''} ${pad ? 'pl-6' : ''}`}
  >
    {children}
  </th>
)

/**
 * 날짜 한 칸. **있는 날의 범위 밖으로는 못 간다** — 시작을 고르면 끝의 `min`
 * 이 따라 올라가므로 뒤집힌 구간이 만들어지지 않는다.
 */
function DayPick({
  value,
  min,
  max,
  onPick,
}: {
  value: string
  min: string
  max: string
  onPick: (v: string) => void
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onPick(e.target.value)}
      className="font-number rounded-sm border border-white/12 bg-white/6 px-2 py-1 text-[11px] text-white/75 [color-scheme:dark] outline-none focus:border-white/30"
    />
  )
}

/** 손잡이 한 벌. **수가 붙은 칸만 누를 값이 있다** */
function Group<T extends string>({
  label,
  value,
  items,
  onPick,
}: {
  label?: string
  value: T
  items: { key: T; label: string; n?: number }[]
  onPick: (k: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] text-white/30">{label}</span>}
      <div className="flex items-center gap-0.5 rounded-md bg-white/4 p-0.5">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onPick(it.key)}
            className={`rounded-sm px-2 py-1 text-[11px] transition ${
              value === it.key
                ? 'bg-white/14 text-white/90'
                : 'text-white/45 hover:bg-white/6'
            }`}
          >
            {it.label}
            {it.n !== undefined && (
              <span className="font-number ml-1 text-white/35">{it.n}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/** `2025-11-03` → `25.11.03` */
const day = (d: string) => d.slice(2).replaceAll('-', '.')

const Item = ({ k, v }: { k: string; v: string }) => (
  <span className="text-white/35">
    {k} <span className="font-number ml-0.5 text-white/75">{v}</span>
  </span>
)
