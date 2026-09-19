import { useMemo, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  usePlanDefaults,
  usePlanList,
  useStockPosition,
  useUpdatePlan,
} from '@/entities/plan'
import { useStockSearch } from '@/entities/search'
import { useCreateRecord } from '@/entities/tradeRecord'
import type { TradeSide } from '@/entities/tradeRecord'
import { PlanPickList } from './PlanPicker'
import type { Pick } from './PlanPicker'

/**
 * 새 체결 — **[[Q15]] 가 정한 폼 그대로**다.
 *
 * ```text
 * 종목 (머리줄)                       고칠 수 없는 값이라 입력칸 모양을 걷는다
 * ① 어느 계획을 실행했나  [체결일] [매수|매도] — 사슬        후보를 가르는 입력이 후보 위에
 * ② 체결                체결가 | 수량 + 그 칸이 만든 숫자   패널 없이 «원인 옆»
 *                       왜 샀나(선택) / 왜 팔았나(여럿)
 * [기록]
 * ```
 *
 * - 순차 공개 — 계획을 골라야 ② 가 열린다. 안 열린 뒤쪽은 제목만 흐리게 (Q15 5)
 * - ✕ 는 칸을 벗어날 때, 결과값은 치는 동안 따라 움직인다 (Q11 F)
 * - 구분·체결일을 바꿔 고른 계획이 빠지면 그 자리에서 말한다
 */
const today = () => new Date().toISOString().slice(0, 10)
const won = (n: number) => n.toLocaleString('ko-KR')
const signed = (n: number, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}`

/**
 * 마디에서 열 때 미리 고를 것 (Q22) — 종목 · 계획 · 구분. 계획에 적은 가격 · 수량이
 * 칸에 먼저 들어간다. 위 「+ 체결 기록」 에서 열면 비어 있다.
 */
export interface FillStart {
  stock: { code: string; name: string }
  /** 「NONE」 — 계획 없이 체결 (거래 계획 검색의 빈 판에서 연다) */
  planId: number | 'NONE'
  /**
   * 대기 카드는 매수로 정해진다. **실행 중 카드는 비워 둔다** (Q23 · 10장 E) — 추가 매수일 수도
   * 있어 확신이 없다. 매도로 미리 눌러 두면 매수를 적다가 못 보고 반대로 기록된다.
   */
  side?: TradeSide
  price: number
  quantity: number
}

export function NewFillForm({
  onClose,
  start,
}: {
  onClose: () => void
  start?: FillStart
}) {
  const [stock, setStock] = useState<{ code: string; name: string } | null>(
    start?.stock ?? null,
  )
  const [q, setQ] = useState('')
  const [side, setSide] = useState<TradeSide | null>(
    start ? (start.side ?? null) : 'BUY',
  )
  const [date, setDate] = useState(today())
  const [pick, setPick] = useState<Pick>(start?.planId ?? null)
  const [released, setReleased] = useState<string | null>(null)
  const [opened, setOpened] = useState(!!start)
  const [price, setPrice] = useState(start?.price ?? 0)
  const [qty, setQty] = useState(start?.quantity ?? 0)
  /** 칸을 벗어날 때 확정된 값 — ✕ 는 이것으로만 판정한다 */
  const [seen, setSeen] = useState({
    price: start?.price ?? 0,
    qty: start?.quantity ?? 0,
  })
  const [memo, setMemo] = useState('')

  const { data: found = [] } = useStockSearch(q.trim().length >= 1 ? q : '')
  const { data: defaults } = usePlanDefaults(stock?.code)
  const { data: position } = useStockPosition(stock?.code)
  const { data: plans = [] } = usePlanList({})
  const create = useCreateRecord()

  const plan =
    typeof pick === 'number' ? plans.find((p) => p.planId === pick) : undefined
  const update = useUpdatePlan(plan?.planId ?? 0)
  const held = position?.quantity ?? 0
  const avg = position?.avgPrice ?? 0
  const cash = defaults?.accountCash ?? 0
  const total = defaults?.accountTotal ?? 0
  const buy = side === 'BUY'
  const after = buy ? held + qty : held - qty

  const m = useMemo(() => {
    if (!plan || price <= 0) return null
    const planR = plan.entryPrice - plan.stopPrice
    const realR = price - plan.stopPrice
    return {
      planR,
      realR,
      gapPct: ((price - plan.entryPrice) / plan.entryPrice) * 100,
      risk: total > 0 ? ((realR * qty) / total) * 100 : 0,
      rMultiple: planR > 0 && avg > 0 ? (price - avg) / planR : null,
    }
  }, [plan, price, qty, total, avg])

  const filled = seen.price > 0 && seen.qty > 0
  /**
   * 같은 계획에서 수량만 더 산다 — 계획 수량을 넘으면 **계획을 고치는 쪽**을 권한다 (Q22).
   * 다른 베이스에서 한 번 더 사는 것은 새 계획(대기)을 세우고 그 마디에 붙인다.
   */
  const planFilled = plan ? Math.round(plan.fillRate * plan.quantity) : 0
  const over =
    buy && plan?.status === 'RUNNING' && seen.qty > 0
      ? planFilled + seen.qty - plan.quantity
      : 0
  const cashBlock = buy && filled && seen.price * seen.qty > cash
  const holdBlock = !buy && seen.qty > held
  const ready =
    !!stock && !!side && pick !== null && filled && !cashBlock && !holdBlock
  // 무엇을 해야 기록되는지로 말한다 — 「~을 골라야 기록할 수 있습니다」 (사용자 표현)
  const why = !stock
    ? '종목을 골라야 기록할 수 있습니다'
    : !side
      ? '매수 · 매도를 골라야 기록할 수 있습니다'
      : pick === null
        ? '계획을 골라야 기록할 수 있습니다 — 없으면 「계획에 없음」'
        : !filled
          ? '체결가와 수량을 넣어야 기록할 수 있습니다'
          : // 막힌 이유를 그대로 — 「막힌 칸이 있다」 는 어느 칸인지 위로 찾게 했다 (Q23 · 10장 F)
            holdBlock
            ? `수량이 보유 ${held}주보다 많다`
            : cashBlock
              ? `필요 현금 ${won(seen.price * seen.qty)}원이 기록상 현금 ${won(cash)}원보다 크다`
              : '막힌 칸이 있다'

  /** 구분·체결일이 바뀌면 고른 마디가 후보에서 빠질 수 있다 */
  const head = (next: { side?: TradeSide; date?: string }, what: string) => {
    const nextSide = next.side ?? side ?? 'BUY'
    const nextDate = next.date ?? date
    if (next.side) setSide(next.side)
    if (next.date) setDate(next.date)
    if (typeof pick !== 'number' || !stock) return
    const p = plans.find((x) => x.planId === pick)
    if (!p) return
    const stillOk =
      p.status !== 'CLOSED' &&
      p.status !== 'DONE' &&
      !(nextSide === 'SELL' && p.status === 'PLANNED') &&
      p.writtenAt < nextDate
    if (stillOk) return
    setPick(null)
    setReleased(
      `${what}을 바꿔 고른 「${p.title}」이 후보에서 빠졌다 — 다시 고른다`,
    )
  }

  return (
    <section className="bg-bg-surface ring-border-default flex flex-col gap-4 rounded-lg px-4 py-4 ring-1 sm:px-5">
      <header className="flex items-center gap-2">
        <span className="text-[14px] font-bold whitespace-nowrap text-white">
          체결 기록
        </span>
        {/* 좁으면 안내 한 줄은 감춘다 — 제목이 두 줄로 꺾였다 */}
        <span className="hidden truncate text-[11px] text-white/40 sm:inline">
          체결 하나가 한 줄이다 — 분할 매도면 여러 번 넣는다
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-[11px] whitespace-nowrap text-white/35 hover:text-white/70"
        >
          닫기
        </button>
      </header>

      {/* 종목 — 고르고 나면 머리줄 글자가 된다 */}
      {stock ? (
        // 좁으면 보유 · 평단 · 현금 은 둘째 줄로 — 종목 이름이 「HD현대일렉트 / 릭」 으로 꺾였다
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[16px] font-bold whitespace-nowrap text-white">
            {stock.name}
          </span>
          <span className="font-number text-[11px] text-white/40">
            {stock.code}
          </span>
          <span className="font-number order-last w-full text-[11px] text-white/50 sm:order-none sm:ml-auto sm:w-auto">
            보유 {held}주 · 평단 {won(avg)} · 현금 {won(cash)}
          </span>
          <button
            type="button"
            onClick={() => {
              setStock(null)
              setPick(null)
              setOpened(false)
            }}
            className="ml-auto text-[11px] whitespace-nowrap text-white/35 hover:text-white/70 sm:ml-0"
          >
            바꾸기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-white/50">종목</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름이나 코드"
            aria-label="종목"
            className="bg-bg-input w-72 rounded-md px-2 py-1.5 text-[13px] text-white outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/30"
          />
          {found.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {found.slice(0, 8).map((s) => (
                <button
                  key={s.stockCode}
                  type="button"
                  onClick={() => {
                    setStock({ code: s.stockCode, name: s.stockName })
                    setQ('')
                  }}
                  className="rounded-md bg-white/[0.06] px-2 py-1 text-[12px] text-white/80 hover:bg-white/[0.12]"
                >
                  {s.stockName}{' '}
                  <span className="font-number text-[10px] text-white/40">
                    {s.stockCode}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/**
       * 날짜 · 구분 한 줄 → 계획 줄 목록 → 체결 (Q23 · 체결 폼 다시 짜기 가).
       * 번호 붙은 상자를 걷고 작은 제목만 — 440px 칸에서 상자 안 상자가 무거웠다.
       */}
      {stock && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="체결일"
              value={date}
              onChange={(e) => head({ date: e.target.value }, '체결일')}
              className="bg-bg-input font-number w-[140px] rounded-md px-2 py-1.5 text-[13px] text-white [color-scheme:dark] outline-none focus:ring-1 focus:ring-white/30"
            />
            <div className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-white/15">
              {(['BUY', 'SELL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => head({ side: s }, '구분')}
                  className={cn(
                    'px-4 py-1.5 text-[13px] whitespace-nowrap',
                    side === s
                      ? 'bg-white/15 font-bold text-white'
                      : 'text-white/50 hover:text-white/80',
                  )}
                >
                  {s === 'BUY' ? '매수' : '매도'}
                </button>
              ))}
            </div>
            {!side && (
              <span className="text-warning text-[12px]">
                매수 · 매도를 골라야 기록할 수 있습니다
              </span>
            )}
          </div>
          {released && (
            <div className="text-warning text-[11px]">⚠ {released}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-white/85">
              어느 계획
            </span>
            <PlanPickList
              fill={{
                stockCode: stock.code,
                side: side ?? 'BUY',
                filledAt: date,
              }}
              pick={pick}
              onPick={(p) => {
                setPick(p)
                setReleased(null)
                setOpened(true)
              }}
            />
          </div>
        </div>
      )}

      {/* ② 체결 — 숫자는 그 숫자를 만든 칸 밑에 */}
      {stock && opened && side && (
        <div className="border-t border-white/[0.06] pt-3">
          <div className="mb-2 text-[12px] font-bold text-white/85">체결</div>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="flex flex-col gap-1">
              <NumField
                label="체결가"
                unit="원"
                value={price}
                onChange={setPrice}
                onBlur={() => setSeen((v) => ({ ...v, price }))}
              />
              {plan && m && buy && (
                <div className="font-number flex flex-col gap-0.5 text-[11px] text-white/55">
                  <span>
                    진입 예상가 {won(plan.entryPrice)} 대비{' '}
                    <span className="text-white/85">{signed(m.gapPct)}%</span>
                  </span>
                  {/* 체결가가 스톱 아래면 손절폭이 «음수»다 — 숫자로 그리지 않는다 */}
                  {m.realR > 0 ? (
                    <span>
                      손절폭 {won(m.planR)} →{' '}
                      <span className="text-white/85">{won(m.realR)}</span>
                      <span className="text-white/35">
                        {' '}
                        · 1R 은 {won(m.planR)} 그대로
                      </span>
                    </span>
                  ) : (
                    <span className="text-warning">
                      ⚠ 체결가가 스톱가격 {won(plan.stopPrice)} 아래다 — 이
                      계획이 맞는지 다시 본다
                    </span>
                  )}
                </div>
              )}
              {plan && m && !buy && m.rMultiple !== null && (
                <div className="flex items-baseline gap-2">
                  <span className="t-stat text-[20px] text-white">
                    {signed(m.rMultiple, 2)}R
                  </span>
                  <span className="text-[11px] text-white/45">
                    이 계획의 1R {won(m.planR)} 기준
                  </span>
                </div>
              )}
              {pick === 'NONE' && (
                <span className="text-[11px] text-white/45">
                  맞댈 계획이 없다 · R배수가 안 생긴다
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <NumField
                label="수량"
                unit="주"
                value={qty}
                block={cashBlock || holdBlock}
                onChange={setQty}
                onBlur={() => setSeen((v) => ({ ...v, qty }))}
              />
              {plan && m && buy && qty > 0 && m.realR > 0 && (
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      't-stat text-[20px]',
                      m.risk > 2.5 ? 'text-warning' : 'text-white',
                    )}
                  >
                    {m.risk.toFixed(2)}%
                  </span>
                  <span className="text-[11px] text-white/45">위험노출</span>
                </div>
              )}
              {qty > 0 && (
                <span className="font-number text-[11px] text-white/55">
                  보유 {held} →{' '}
                  <span className="text-white/85">{Math.max(after, 0)}주</span>
                  {buy && price > 0 && !cashBlock && (
                    <span className="text-white/35">
                      {' '}
                      · 필요 현금 {won(price * qty)}
                    </span>
                  )}
                </span>
              )}
              {plan && m && buy && m.realR > 0 && m.risk > 2.5 && (
                <span className="text-warning text-[11px]">
                  ⚠ 2.5% 초과 — 막지는 않는다
                </span>
              )}
              {cashBlock && (
                <span className="text-brand-red text-[11px]">
                  ✕ 기록상 현금 {won(cash)}원보다 크다 — 입금이나 보정을 먼저
                  한다
                </span>
              )}
              {holdBlock && (
                <span className="text-brand-red text-[11px]">
                  ✕ 보유 {held}주보다 많이 판다
                </span>
              )}
              {over > 0 && plan && (
                <span className="text-warning text-[11px]">
                  ⚠ 계획 수량 {plan.quantity}주를 {over}주 넘는다 — 수량만 더
                  사는 거라면 계획을 고친다
                </span>
              )}
            </div>
          </div>

          {/**
           * 사유는 **메모 하나** — 매수든 매도든 선택 (Q23 · 10장 C, 사용자 「굳이? 그냥 메모로만」).
           * 매도 사유 칩(필수)을 뺐다. 폼에 필수 표시가 남지 않아 「선택」 한 단어로 규칙이 선다.
           */}
          <label className="mt-3 flex flex-col gap-1">
            <span className="flex items-baseline gap-1.5 text-[11px] text-white/50">
              메모
              <span className="text-[10px] text-white/30">선택</span>
            </span>
            <input
              aria-label="메모"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={buy ? '왜 샀나' : '왜 팔았나'}
              className="bg-bg-input rounded-md px-2 py-1 text-[12px] text-white outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/30"
            />
          </label>
        </div>
      )}

      {/* 안 열린 뒤쪽 — 제목만 흐리게 (Q15 5) */}
      {stock && (!opened || !side) && (
        <div className="flex flex-col text-[12px] text-white/30">
          <div className="flex items-baseline gap-2 border-t border-white/[0.06] py-2.5">
            <span className="font-bold">체결</span>
            <span className="text-[11px]">체결가 · 수량 · 메모</span>
            <span className="ml-auto text-[11px]">
              {opened
                ? '매수 · 매도를 골라야 열립니다'
                : '계획을 골라야 열립니다'}
            </span>
          </div>
        </div>
      )}

      {/**
       * 누르기 직전 되읽는 한 줄 (Q23 · 8장 ④ 실행 전) — 구분 · 계획을 잘못 고른 실수를 잡는다.
       * 「원래 계획이 닫힌다」 는 넣지 않는다 (Q22 — 사용자 「보여 주지 마세요」).
       */}
      {stock && opened && side && ready && (
        <div className="t-num border-t border-white/[0.06] pt-3 text-[12px] text-white/80">
          {stock.name}{' '}
          <b className="font-medium text-white">{buy ? '매수' : '매도'}</b>{' '}
          {won(qty)}주 × {won(price)} ·{' '}
          {plan ? `「${plan.title}」 에` : '계획에 없음'} ·{' '}
          {date.slice(5).replace('-', '.')}
        </div>
      )}
      {stock && opened && (
        <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
          <button
            type="button"
            disabled={!ready || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  stockCode: stock.code,
                  side: side ?? 'BUY',
                  price,
                  quantity: qty,
                  filledAt: date,
                  planId: pick === 'NONE' ? null : (pick as number),
                  sellReasons: [],
                  reason: memo,
                },
                { onSuccess: onClose },
              )
            }
            className={cn(
              'rounded-md px-5 py-1.5 text-[12px] font-bold whitespace-nowrap',
              !ready || create.isPending
                ? 'bg-white/[0.06] text-white/25'
                : 'text-fg-inverse bg-white hover:bg-white/90',
            )}
          >
            {create.isPending ? '기록 중…' : '기록'}
          </button>
          {over > 0 && plan && ready && (
            <button
              type="button"
              disabled={update.isPending || create.isPending}
              onClick={() =>
                update.mutate(
                  { quantity: plan.quantity + over },
                  {
                    onSuccess: () =>
                      create.mutate(
                        {
                          stockCode: stock.code,
                          side: 'BUY',
                          price,
                          quantity: qty,
                          filledAt: date,
                          planId: plan.planId,
                          sellReasons: [],
                          reason: memo,
                        },
                        { onSuccess: onClose },
                      ),
                  },
                )
              }
              className="rounded-md px-3 py-1.5 text-[12px] whitespace-nowrap text-white/85 ring-1 ring-white/25 hover:bg-white/[0.06]"
            >
              {plan.quantity + over}주로 고쳐 기록
            </button>
          )}
          {/* 글자를 줄인다 — 계좌 총액 안내 줄은 뺐다 (사용자 「텍스트 양 좀 줄이고」) */}
          {!ready && <span className="text-[11px] text-white/40">{why}</span>}
          {create.isError && (
            <span className="text-brand-red text-[11px]">
              기록 못 함 — 다시 누른다
            </span>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * 숫자 칸 — **소수점 뒤는 버리고, 버렸다고 알린다** (Q23 · 10장 D).
 * 💀 숫자 아닌 글자를 다 지우던 때는 증권사 화면에서 복사한 `201,500.00` 이 `20,150,000` 이 됐다(100배).
 * 코스피 가격 · 수량은 정수라 `.` 뒤는 복사할 때 딸려 온 것이다.
 */
export const parseWhole = (raw: string) => {
  const [int = '', frac] = raw.split('.')
  return {
    n: Number(int.replace(/[^0-9]/g, '')) || 0,
    cut: frac !== undefined && /[0-9]/.test(frac),
  }
}

function NumField({
  label,
  value,
  unit,
  onChange,
  onBlur,
  block,
}: {
  label: string
  value: number
  unit: string
  onChange: (n: number) => void
  onBlur: () => void
  block?: boolean
}) {
  const [cut, setCut] = useState(false)
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] text-white/50">{label}</span>
      <span className="relative">
        <input
          aria-label={label}
          value={value ? won(value) : ''}
          inputMode="numeric"
          onChange={(e) => {
            const r = parseWhole(e.target.value)
            setCut(r.cut)
            onChange(r.n)
          }}
          onBlur={onBlur}
          className={cn(
            'bg-bg-input font-number w-full rounded-md px-2 py-1 pr-6 text-right text-[13px] text-white outline-none focus:ring-1 focus:ring-white/30',
            block && 'ring-brand-red/50 ring-1',
          )}
        />
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-white/35">
          {unit}
        </span>
      </span>
      {cut && (
        <span className="text-warning text-[11px]">
          소수점 뒤는 버렸다 — {won(value)}
          {unit}
        </span>
      )}
    </label>
  )
}
