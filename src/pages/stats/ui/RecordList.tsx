/**
 * 거래 기록 — **거래 기록 원자료만.** A·B·C 스냅샷은 한 칸도 들어가지 않는다.
 *
 * ```text
 * 계획  체결일  구분  가격  수량  사유 │ 수익률  손익금액  R배수  보유일수
 *  ↑                                    ↑ 매도 행에만 채워진다
 * ```
 *
 * 💀 **머리줄의 셈이 그대로 손잡이가 됐다** (2026-09-14). 「계획 있음 34 /
 * 없음 12」를 읽고 나면 다음 손이 하는 일은 **그 12건을 보는 것**이다.
 * 숫자를 읽는 자리와 고르는 자리를 따로 두면 같은 축이 화면에 두 번 선다.
 *
 * 💀 **한 행이 체결 하나다 — 「건당」이다.** 계획으로 묶으니 세는 단위가
 * 화면에서 두 개가 됐다 — 위의 요약은 「매도 하나가 한 건」인데 목록은 「계획
 * 하나가 한 줄」이라 「계획 없음 12건」을 목록에서 세려면 줄이 아니라 줄 «안»을
 * 세어야 했다. 계획은 지워지지 않고 **줄마다 다시 선다.**
 *
 * 💀 **`계획` 칸은 2값이다** — 계획명 + 게이트 배지 / 「계획에 없음」. 통계 축이
 * 둘인데 목록이 하나면 「계획 없음 12건」을 목록에서 찾을 수 없다. 배지는
 * 형태(아이콘) 한 칸이다 — 색은 이미 수익률에 팔렸다.
 *
 * 💀 **매수 행은 오른쪽 네 칸이 빈다.** 20장 ④ 가 0건인 주를 지우지 않고
 * 흰색으로 남긴 것과 같다 — **빈 것이 「아직 안 팔았다」는 정보다.**
 *
 * 💀 **스냅샷 열 개는 행에 없다. 누르면 층으로** (8장 ④ — 툴팁 → 세부 창 →
 * 별개 화면).
 *
 * ⚠️ **위쪽 기간 선택에 안 걸린다.** 24장의 액션 필터도 워터폴과 스파크바에만
 *    걸었다. 여기 필터는 목록 «자기» 것이고, **날짜도 따로 둔다** —
 *    성질이 「접기」가 아니라 **「찾기」**다.
 */

import { useEffect, useMemo, useState } from 'react'
import { SELL_REASON_LABEL } from '@/entities/tradeRecord'
import type { TradeRecord } from '@/entities/tradeRecord'
import { REGIME_LABEL } from '@/shared/lib/snapshots'
import {
  LIST_FILTER_ALL,
  dateBounds,
  filterRows,
  gatePassed,
  isAllFilter,
  listStat,
} from '../model/aggregate'
import type { FillRow, ListFilter, PlanClass } from '../model/aggregate'
import { Dash, Panel, pct, toneOf, won } from './parts'

/**
 * 한 번에 «더» 세우는 행 수. **여든 줄을 한꺼번에 펴지 않는다.**
 *
 * 💀 **버튼을 지웠다** (2026-09-15). 표가 이미 자기 스크롤을 가지고 있어서
 * 「더 보기」 바는 **내려가는 손을 한 번 멈추게 할 뿐**이었다 — 끝에 닿으면
 * 알아서 이어 붙인다. 바가 없어진 자리는 **아래쪽 흐림**이 대신 말한다.
 */
const PAGE = 30
/** 바닥에서 이만큼 남았을 때 미리 이어 붙인다 — 빈 칸을 보이지 않으려고 */
const NEAR_END = 120

export function RecordList({ rows }: { rows: FillRow[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const [shown, setShown] = useState(PAGE)
  const [filter, setFilter] = useState<ListFilter>(LIST_FILTER_ALL)

  const shownRows = useMemo(() => filterRows(rows, filter), [rows, filter])
  const stat = useMemo(() => listStat(shownRows), [shownRows])
  /** 손잡이에 붙는 수는 **거르기 «전»** 것이다 — 무엇이 있는지가 보여야 한다 */
  const all = useMemo(() => listStat(rows), [rows])
  const bounds = useMemo(() => dateBounds(rows), [rows])

  // 거르거나 목록이 갈리면 «처음»으로 돌아간다
  useEffect(() => setShown(PAGE), [rows, filter])

  const rest = shownRows.length - shown
  const on = !isAllFilter(filter)

  return (
    <Panel
      title="거래 기록"
      desc="한 행이 체결 하나 — 위쪽 기간 선택에 걸리지 않습니다"
      right={
        <span className="font-number text-[11px] text-white/40">
          체결 {rows.length}건
        </span>
      }
    >
      {/* 손잡이 — 숫자를 «누를 수» 있다 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/**
         * 날짜는 **위쪽 워터폴과 따로 논다** — 워터폴의 기간은 「통계를 어느
         * 구간으로 접을까」이고 여기는 「그날 무엇을 샀더라」를 찾는 것이다.
         * 앞은 «달»이면 충분하고 뒤는 «날»이라야 한다.
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
          label="구분"
          value={filter.side}
          onPick={(side) => setFilter((f) => ({ ...f, side }))}
          items={[
            { key: 'ALL', label: '전체', n: all.fills },
            { key: 'BUY', label: '매수', n: all.buys },
            { key: 'SELL', label: '매도', n: all.sells },
          ]}
        />
        <Group
          label="계획"
          value={filter.plan}
          onPick={(plan) => setFilter((f) => ({ ...f, plan }))}
          items={[
            { key: 'ALL', label: '전체' },
            { key: 'YES' as PlanClass, label: '있음', n: all.planned },
            { key: 'NONE' as PlanClass, label: '없음', n: all.unplanned },
          ]}
        />
        <Group
          label="게이트"
          value={filter.gate}
          onPick={(gate) => setFilter((f) => ({ ...f, gate }))}
          items={[
            { key: 'ALL', label: '전체' },
            { key: 'PASS', label: '◆ 통과', n: all.gatePass },
            { key: 'SHORT', label: '◇ 미달', n: all.sells - all.gatePass },
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

      {/**
       * 지금 «보고 있는 것»의 셈. 손잡이 옆의 수는 거르기 전이고, 이 줄은
       * 거른 뒤다 — 둘이 같은 수면 아무것도 안 걸린 것이다.
       */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-y border-white/8 py-2.5 text-[11px]">
        <Sum k="보고 있는 것" v={`${shownRows.length}건`} />
        <Sum
          k="실현 손익"
          v={won(stat.realized)}
          tone={toneOf(stat.realized)}
        />
        <Sum k="승 / 패" v={`${stat.wins} / ${stat.losses}`} />
        <span className="ml-auto text-white/25">
          셈의 단위는 매도입니다 — 위의 요약과 같은 수입니다
        </span>
      </div>

      {shownRows.length === 0 ? (
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
                setShown((n) => (n < shownRows.length ? n + PAGE : n))
            }}
          >
            <table className="w-full min-w-[900px] border-collapse">
              <colgroup>
                <col style={{ width: 210 }} />
                <col style={{ width: 96 }} />
                <col style={{ width: 56 }} />
                <col style={{ width: 86 }} />
                <col style={{ width: 62 }} />
                <col />
                <col style={{ width: 84 }} />
                <col style={{ width: 84 }} />
                <col style={{ width: 68 }} />
                <col style={{ width: 72 }} />
              </colgroup>
              {/* 머리줄은 «따라온다» — 마흔 줄을 훑는 동안 열 이름이 사라지지 않게 */}
              <thead className="bg-bg-input sticky top-0 z-10">
                <tr className="text-[11px] text-white/30">
                  <Th>계획</Th>
                  <Th>체결일</Th>
                  <Th>구분</Th>
                  <Th right>가격</Th>
                  <Th right>수량</Th>
                  <Th>사유</Th>
                  <Th right divide>
                    수익률
                  </Th>
                  <Th right>손익금액</Th>
                  <Th right>R배수</Th>
                  <Th right>보유</Th>
                </tr>
              </thead>
              <tbody>
                {shownRows.slice(0, shown).map(({ rec, planClass }) => (
                  <Fill
                    key={rec.recordId}
                    rec={rec}
                    planClass={planClass}
                    open={open === rec.recordId}
                    onToggle={() =>
                      setOpen(open === rec.recordId ? null : rec.recordId)
                    }
                  />
                ))}
              </tbody>
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

const Th = ({
  children,
  right,
  divide,
}: {
  children: React.ReactNode
  right?: boolean
  divide?: boolean
}) => (
  <th
    className={`border-b border-white/10 py-2 font-normal ${
      right ? 'pr-3 text-right' : 'pr-3 text-left'
    } ${divide ? 'border-l border-l-white/10 pl-3' : ''}`}
  >
    {children}
  </th>
)

const Sum = ({ k, v, tone }: { k: string; v: string; tone?: string }) => (
  <span className="flex items-baseline gap-1.5">
    <span className="text-white/35">{k}</span>
    <span className={`font-number text-[13px] ${tone ?? 'text-white/85'}`}>
      {v}
    </span>
  </span>
)

/**
 * 날짜 한 칸. **있는 날의 범위 밖으로는 못 간다** — `min`/`max` 를 체결일의
 * 양 끝으로 묶어 두면 빈 화면이 나올 길이 하나 줄어든다. 시작을 고르면
 * 끝의 `min` 이 따라 올라가므로 **뒤집힌 구간이 만들어지지 않는다.**
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
  label: string
  value: T
  items: { key: T; label: string; n?: number }[]
  onPick: (k: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-white/30">{label}</span>
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

function Fill({
  rec,
  planClass,
  open,
  onToggle,
}: {
  rec: TradeRecord
  planClass: PlanClass
  open: boolean
  onToggle: () => void
}) {
  const d = rec.derived
  const sell = rec.side === 'SELL' && d
  const buy = rec.side === 'BUY'

  return (
    <>
      <tr
        className={`border-b border-white/5 transition ${
          open ? 'bg-white/5' : 'hover:bg-white/3'
        }`}
      >
        <td className="py-1.5 pr-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-baseline gap-1.5 text-left"
          >
            {planClass === 'NONE' ? (
              <span className="text-[12px] text-white/40">계획에 없음</span>
            ) : (
              <>
                <span
                  className={`font-number text-[11px] ${
                    gatePassed(rec) ? 'text-white/70' : 'text-white/35'
                  }`}
                >
                  {gatePassed(rec) ? '◆' : '◇'}
                </span>
                <span className="text-[12px] text-white/85">
                  {rec.planTitle}
                </span>
              </>
            )}
            <span className="truncate text-[11px] text-white/30">
              {rec.stockName}
            </span>
          </button>
        </td>
        <td className="font-number py-1.5 pr-3 text-[12px] text-white/55">
          {rec.filledAt}
        </td>
        <td className="py-1.5 pr-3">
          <span
            className={`rounded-xs px-1.5 py-0.5 text-[11px] ${
              buy
                ? 'bg-candle-up/12 text-candle-up'
                : 'bg-candle-down/12 text-candle-down'
            }`}
          >
            {buy ? '매수' : '매도'}
          </span>
        </td>
        <td className="font-number py-1.5 pr-3 text-right text-[12px] text-white/80">
          {rec.price.toLocaleString()}
        </td>
        <td className="font-number py-1.5 pr-3 text-right text-[12px] text-white/50">
          {rec.quantity.toLocaleString()}
        </td>
        <td
          className="max-w-0 truncate py-1.5 pr-3 text-[11px] text-white/40"
          title={
            rec.side === 'SELL'
              ? rec.sellReasons.map((k) => SELL_REASON_LABEL[k]).join(' · ')
              : rec.reason
          }
        >
          {rec.side === 'SELL'
            ? rec.sellReasons.map((k) => SELL_REASON_LABEL[k]).join(' · ')
            : rec.reason}
        </td>

        {/* 매수 행은 오른쪽 네 칸이 빈다 — 빈 것이 정보다 */}
        {sell ? (
          <>
            <td
              className={`font-number border-l border-white/10 py-1.5 pr-3 pl-3 text-right text-[12px] ${toneOf(d.returnPct)}`}
            >
              {pct(d.returnPct, 2)}
            </td>
            <td
              className={`font-number py-1.5 pr-3 text-right text-[12px] ${toneOf(d.profit)}`}
            >
              {won(d.profit)}
            </td>
            <td className="font-number py-1.5 pr-3 text-right text-[12px] text-white/70">
              {d.rMultiple === null ? <Dash /> : `${d.rMultiple.toFixed(2)}R`}
            </td>
            <td className="font-number py-1.5 text-right text-[12px] text-white/45">
              {d.holdingDays}일
            </td>
          </>
        ) : (
          <>
            <td className="border-l border-white/10" />
            <td />
            <td />
            <td />
          </>
        )}
      </tr>

      {open && (
        <tr className="border-b border-white/5 bg-white/5">
          <td colSpan={10} className="py-3 pr-3 pl-3">
            <SnapshotLayer rec={rec} />
          </td>
        </tr>
      )}
    </>
  )
}

/** 층 — 행에 없던 스냅샷 열 개가 여기서 열린다 */
function SnapshotLayer({ rec }: { rec: TradeRecord }) {
  const s = rec.snapshot
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
        <Item
          k="위험노출"
          v={rec.derived?.riskPct == null ? '—' : `${rec.derived.riskPct}%`}
        />
      </div>
      {s.trendFailed.length > 0 && (
        <p className="m-0 text-[11px] text-white/40">
          어긴 조건 — {s.trendFailed.join(' · ')}
        </p>
      )}
    </div>
  )
}

const Item = ({ k, v }: { k: string; v: string }) => (
  <span className="text-white/35">
    {k} <span className="font-number ml-0.5 text-white/75">{v}</span>
  </span>
)
