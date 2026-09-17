/**
 * ⑦ 거래 통계 — **여섯 블록이 쓰는 값을 전부 여기서 낸다.**
 *
 * ```text
 * ① 최대 수익 · 최대 손실 + 그 거래의 스냅샷      문서가 못 박은 자리
 * ② 워터폴                                    ← 기간 선택기를 겸한다
 * ③ 요약 지표   승률 · 손익비 · 기대값 · 평균     ← 선택에 반응한다
 * ④ 종형 곡선   R배수 분포 + 벽(−1R)
 * ⑤ 그룹별 성과 34행 × 3열  +  트렌드 8조건 표 (별도)
 * ⑥ 거래 기록 목록                              ← 선택에 안 걸린다. 늘 전체
 * ```
 *
 * 💀 **서버가 접어 준 통계를 안 쓰고 체결 목록에서 직접 낸다.** ② 의 막대를
 * 누르면 ③④⑤ 가 «그 기간으로» 다시 서는데, 접힌 값을 받아서는 다시 못 가른다.
 * *「필터를 걸수록 흐려지는 칸이 늘어난다」* 가 성립하려면 원자료가 손에
 * 있어야 한다.
 *
 * **세는 단위는 매도 기록 하나다** (⑥). 100주를 50/50 으로 팔면 두 건이다 —
 * 묶으면 손절이 숨는다.
 */

import type { TradeRecord, TradeRecordDerived } from '@/entities/tradeRecord'

/** 매도 기록 — `derived` 가 반드시 있다. 세는 단위이자 모든 블록의 원자다 */
export type Closed = TradeRecord & { derived: TradeRecordDerived }

export const isClosed = (r: TradeRecord): r is Closed =>
  r.side === 'SELL' && r.derived !== null

/** `YYYY-MM` */
export const monthOf = (d: string) => d.slice(0, 7)

/**
 * 기간 선택. **`null` 이 기본이고 그것이 「전체 기간」이다** —
 * *「기본 전체 기간. 아무 선택 없음」* (⑦ ② 선택 동작).
 */
export interface Period {
  /** `YYYY-MM` 포함 */
  from: string
  /** `YYYY-MM` 포함 */
  to: string
}

export const inPeriod = (r: Closed, p: Period | null) =>
  !p || (monthOf(r.filledAt) >= p.from && monthOf(r.filledAt) <= p.to)

// ─────────────── 표본 경계 ───────────────

/**
 * **표본 경계가 위에서 아래로 깊어진다.** 기간을 좁힐수록 아래부터 꺼진다.
 *
 * ```text
 * 워터폴 · 최대 둘 · 거래 기록   1건~   사실이라 항상 나온다
 * 요약 지표                    5건~   값을 흐리게 + 「표본 N건」
 *   └ 벽 왼쪽 · 자본 감소       1건~   «세는» 것이라 평균과 문턱이 다르다
 * 그룹별 성과                  1건~   **표는 늘 선다.** 칸이 «행마다» 비워진다
 * ```
 *
 * 💀 **그룹별 성과의 15건 문턱을 없앴다** (2026-09-13). 표를 통째로 숨기면
 * *「무엇이 모자라서 못 보는가」* 를 표 자체로 확인할 길이 사라진다 — 어느
 * 축의 어느 칸에 몇 건이 있는지가 이미 **건수 열에 적혀 있고**, 5건 아래 칸은
 * 값이 «비어» 있으므로 숨기지 않아도 거짓말을 하지 않는다. 기간을 좁혀
 * 넉 건이 남아도 그 넷이 어디 있는지는 볼 수 있어야 한다.
 *
 * ⚠️ **검증 대상이다** — 책에 근거가 없어 낮춰 잡은 값이라 화면에 박지 않고
 *    여기 하나에 둔다.
 *
 * ⚠️ **`shape`(10건) 가 빠졌다** — 분포의 «모양»을 읽던 자리가 종형 곡선이었고,
 *    그 블록이 요약 지표로 접혔다 (2026-09-13). 모양을 묻는 것은 보유 종목
 *    화면 하나로 갔다 (F1 · Q9).
 */
export const MIN = { fact: 1, avg: 5 } as const

// ─────────────── ② 워터폴 ───────────────

/**
 * 달 하나. **막대 끝이 곧 그때까지의 누적이다** (24장 ①).
 *
 * `base` 에서 시작해 `gain` 만큼 위로(적색), `loss` 만큼 아래로(청색) 간 자리가
 * `cum` 이다. 24장의 *「각 막대는 이전 막대가 끝난 지점에서 시작한다」* 를
 * 그대로 값으로 옮긴 것이다.
 */
export interface MonthFlow {
  /** `YYYY-MM` */
  month: string
  /** 이전 달까지의 누적 — 이 달 막대의 시작점 */
  base: number
  /** 이 달 수익의 합 (양수) */
  gain: number
  /** 이 달 손실의 합 (음수) */
  loss: number
  /** `gain + loss` */
  net: number
  /** `base + net` */
  cum: number
  /** 그 달의 매도 건수 */
  n: number
}

/**
 * 월별 손익 흐름.
 *
 * **금액이라야 누적이 쌓인다.** 수익률은 3% + 5% ≠ 8% 라 막대 끝이 누적을
 * 뜻하지 못한다 — 워터폴은 막대 끝이 곧 누적이어야 성립한다.
 *
 * **빈 달을 지우지 않는다.** 거래가 없던 달도 행이 선다 — *「0건인 주를 지우지
 * 않고 흰색으로 남긴 것과 같다」* (20장 ④). 지우면 가로축이 거짓 간격이 된다.
 *
 * **분할 매도는 같은 달에 수익 막대와 손실 막대를 둘 다 세운다.** 묶어서 순증
 * 하나로 만들지 않는다 — 24장이 확보와 손실을 따로 그린 것과 같은 이유.
 */
export function monthlyFlow(closed: Closed[]): MonthFlow[] {
  if (closed.length === 0) return []

  const months = closed.map((r) => monthOf(r.filledAt)).sort()
  const out: MonthFlow[] = []
  let cum = 0

  for (const month of monthRange(months[0]!, months[months.length - 1]!)) {
    const rows = closed.filter((r) => monthOf(r.filledAt) === month)
    const gain = sum(rows.map((r) => Math.max(0, r.derived.profit)))
    const loss = sum(rows.map((r) => Math.min(0, r.derived.profit)))
    const base = cum
    cum = base + gain + loss
    out.push({ month, base, gain, loss, net: gain + loss, cum, n: rows.length })
  }
  return out
}

/** `2025-06` ~ `2026-06` 을 «빠짐없이» 편다 */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = []
  let [y, m] = from.split('-').map(Number) as [number, number]
  for (let guard = 0; guard < 600; guard++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push(key)
    if (key >= to) break
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

// ─────────────── ③ 요약 지표 ───────────────

/**
 * 넷. **5건부터 나온다** — 그 아래는 값을 흐리게 두고 「표본 N건」을 붙인다.
 *
 * ⚠️ **흐림은 여기서만 쓴다.** ⑤ 는 히트맵이 걸려 있어 흐리게 하면 한 행에
 *    연한 것이 두 종류가 된다 — 표본이 모자라 연한 것과 값이 0에 가까워 옅은 것.
 */
export interface Summary {
  n: number
  wins: number
  losses: number
  /** 0~1 */
  winRate: number
  /** 이긴 거래의 평균 수익률 % */
  avgWin: number
  /** 진 거래의 평균 수익률 % (음수) */
  avgLoss: number
  /** 손익비 = 평균수익 ÷ |평균손실|. 진 거래가 없으면 `null` */
  payoff: number | null
  /** 기대값 (원) — 매도 한 건이 평균 얼마를 남겼나 */
  expectancy: number
  /** 평균 수익률 % */
  avgReturn: number
}

export function summarize(closed: Closed[]): Summary {
  const rets = closed.map((r) => r.derived.returnPct)
  const wins = rets.filter((v) => v > 0)
  const losses = rets.filter((v) => v <= 0)
  const avgLoss = losses.length ? mean(losses) : 0

  return {
    n: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? wins.length / closed.length : 0,
    avgWin: wins.length ? mean(wins) : 0,
    avgLoss,
    payoff:
      losses.length && avgLoss !== 0 ? mean(wins) / Math.abs(avgLoss) : null,
    expectancy: closed.length ? mean(closed.map((r) => r.derived.profit)) : 0,
    avgReturn: closed.length ? mean(rets) : 0,
  }
}

// ─────────────── 벽(−1R) ───────────────

/**
 * **벽 왼쪽에 무엇이 있는가** (F1).
 *
 * 💀 **종형 곡선(히스토그램)을 여기 두지 않는다** (2026-09-13). 분포의
 * «모양»을 묻는 것은 보유 중인 종목이고 (F1 · Q9), 끝난 거래를 모아 놓은
 * ⑦ 이 묻는 것은 **몇 건이 벽을 넘었나**다 — 그것은 «세는» 값이라 막대가
 * 필요 없고 요약 지표의 한 칸으로 선다.
 *
 * 💀 **계획 없는 매매는 이 셈에 없다.** 1R 이 없어 벽 자체가 안 선다.
 * *「제외」라고 쓰면 지운 것처럼 읽힌다* — **「계획 없는 매매 N건은 1R이
 * 없어 이 셈에 없다」** 로 적으면 «어디에 있는지»가 드러나고, 워터폴에는
 * 올라가 있으므로 **건수가 다른 이유**도 그 한 줄이 설명한다.
 */
export interface WallStat {
  /** R 축에 오르는 건수 (계획 있음) */
  planned: number
  /** 1R 이 없어 못 오르는 건수 */
  unplanned: number
  /** 벽(−1R) «왼쪽» — 계획한 손절폭보다 크게 잃었다. **1건부터 사실이다** */
  wallBreaks: number
  /**
   * **R 배수의 평균** — R 축에 오른 것 전부. 없으면 `null`.
   *
   * 💀 *「1R 을 몇 번 걸어 몇 R 을 벌었나」* 다. 수익률(%)과 달리 **자기가 건
   * 위험으로 나눈 값**이라 계획마다 손절폭이 달라도 같은 자로 잰다 —
   * 이 값이 0 위에 있는 동안은 손절폭을 키워도 시스템이 버틴다.
   */
  avgR: number | null
}

export function wallStat(closed: Closed[]): WallStat {
  const rs = closed
    .map((r) => r.derived.rMultiple)
    .filter((v): v is number => v !== null)
  const broke = rs.filter((v) => v < -1)

  return {
    planned: rs.length,
    unplanned: closed.length - rs.length,
    wallBreaks: broke.length,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
  }
}

// ─────────────── 위험 관리 ───────────────

/**
 * **위험은 성과와 «다른 질문»이다.**
 *
 * 승률·손익비·기대값은 *「벌었나」* 를 묻고, 이 넷은 *「무엇을 걸고 벌었나」*
 * 를 묻는다. 같은 +60만이라도 계좌의 0.8%를 걸어 낸 것과 8%를 걸어 낸 것은
 * **다음 거래에서 살아남는 확률이 다르다** — ⑧ 이 네 값을 재계산할 때
 * 손절폭 상한·포지션 크기가 이 줄에서 나온다.
 *
 * ⚠️ **막지 않는다** (non-goal). 2.5% 초과는 «셈»으로 적힐 뿐이고,
 *    화면이 거래를 못 하게 하지 않는다.
 */
export interface RiskStat {
  /** 평균 위험노출 % — 한 건에 계좌의 몇 %를 걸었나 (③-2) */
  avgRiskPct: number | null
  /** 가장 크게 건 한 건 */
  maxRiskPct: number | null
  /** 2.5% 초과 — **경고 구간.** 막지 않고 세기만 한다 */
  overCount: number
  /**
   * 위험노출을 «못 낸» 건수. CSV 로 들어와 손절가가 없는 행이다.
   * **0 으로 채우지 않는다** — 없는 것과 0 은 다르다 (8장 ①).
   */
  unknownRisk: number
  /** 고점 대비 최대 낙폭 (원, 양수). 실현 손익 곡선에서 잰다 */
  maxDrawdown: number
  /** 그 바닥에 닿은 날 */
  maxDrawdownAt: string | null
  /** 지금 고점에서 얼마나 내려와 있나 (원, 양수) */
  currentDrawdown: number
  /** 최대 연속 손실 건수 */
  lossStreak: number
  /** 지금 몇 건째 연속 손실인가 */
  currentStreak: number
}

export function riskStat(closed: Closed[]): RiskStat {
  const risks = closed
    .map((r) => r.derived.riskPct)
    .filter((v): v is number => v !== null)

  const ordered = [...closed].sort((a, b) =>
    a.filledAt.localeCompare(b.filledAt),
  )

  // 실현 손익 곡선의 고점 대비 낙폭. **사실이라 1건부터 유효하다**
  let cum = 0
  let peak = 0
  let maxDd = 0
  let maxDdAt: string | null = null
  let streak = 0
  let maxStreak = 0

  for (const r of ordered) {
    cum += r.derived.profit
    peak = Math.max(peak, cum)
    const dd = peak - cum
    if (dd > maxDd) {
      maxDd = dd
      maxDdAt = r.filledAt
    }
    streak = r.derived.profit <= 0 ? streak + 1 : 0
    maxStreak = Math.max(maxStreak, streak)
  }

  return {
    avgRiskPct: risks.length
      ? risks.reduce((a, b) => a + b, 0) / risks.length
      : null,
    maxRiskPct: risks.length ? Math.max(...risks) : null,
    overCount: risks.filter((v) => v > 2.5).length,
    unknownRisk: closed.length - risks.length,
    maxDrawdown: maxDd,
    maxDrawdownAt: maxDdAt,
    currentDrawdown: peak - cum,
    lossStreak: maxStreak,
    currentStreak: streak,
  }
}

// ─────────────── 계획 유무 ───────────────

/**
 * 계획 유무 — **둘이다.**
 *
 * ⚠️ **그룹별 성과(축 여덟 · 22행 × 3열)를 통째로 뺐다** (2026-09-13).
 *    *「이건 구현 세부사항에 가깝다」* — 무엇을 축으로 삼을지(훼손 0~2냐 0~5냐 ·
 *    베이스를 몇으로 묶냐 · 계획 상태를 넣냐)가 아직 안 정해졌는데 화면이
 *    먼저 서 있었다. **⑧ 피드백이 어떤 값을 되돌려 줄지 정해진 뒤에** 다시
 *    세운다. 지운 코드는 이 파일의 옛 판(`aggregate.withgroups.ts`)과
 *    `GroupHeatmap.tsx` 에 있다.
 *
 * 남은 것은 이 둘뿐이다 — **거래 기록의 `계획` 칸**이 쓴다.
 */
export type PlanClass = 'YES' | 'NONE'

export const PLAN_CLASS_LABEL: Record<PlanClass, string> = {
  YES: '계획 있음',
  NONE: '계획 없음',
}

export const planClassOf = (r: TradeRecord): PlanClass =>
  r.planId === null ? 'NONE' : 'YES'

// ─────────────── ⑥ 목록 ───────────────

/**
 * 체결 한 행. **행은 여전히 체결 하나다** — 묶음은 그 위에 «제목»으로 선다.
 *
 * `dim` 은 체결일 범위 «밖»인데 같은 묶음이라 따라 나온 행이다 (Q13 ⑤).
 */
export interface FillRow {
  rec: TradeRecord
  planClass: PlanClass
  dim?: boolean
}

export function recordRows(records: TradeRecord[]): FillRow[] {
  return [...records]
    .sort(
      (a, b) => b.filledAt.localeCompare(a.filledAt) || b.recordId - a.recordId,
    )
    .map((rec) => ({ rec, planClass: planClassOf(rec) }))
}

/**
 * 계획 묶음 — **묶음 하나가 «판단» 하나다** (Q13 ②).
 *
 * 💀 **매수 → 매도 왕복이 아니다.** 불타기는 새 계획을 세워 이전 계획을
 * 승계시키고 매도는 `실행 중` 계획에 붙는다 (④-2 · ⑥). 그래서 매수만 있는
 * 계획도, 산 것보다 판 것이 많은 계획도 선다 — **수량 합계를 적지 않는다.**
 *
 * 💀 **09-14 에 되돌린 것은 「한 줄로 접기」였다.** 이번엔 계획이 제목이고
 * 체결 행이 그대로 선다 — 필터 옆의 수와 행 수가 그대로 맞는다.
 *
 * 계획 없는 체결은 끈이 없어 **매도 하나가 한 줄**이다 (`groupRows`).
 */
export interface PlanGroup {
  /** `P{planId}` · `N{recordId}` */
  key: string
  planId: number | null
  planTitle: string | null
  stockCode: string
  stockName: string
  /** **시간 오름차순** — 이야기 순서대로 읽힌다 */
  rows: FillRow[]
  /** 머리줄의 기간 — 아카이브에서 「언제」를 답한다 */
  firstAt: string
  lastAt: string
  sells: number
  /** 매도 행 손익의 합. 매도 행은 따로 서므로 분할 매도를 숨기지 않는다 */
  realized: number
  /**
   * 매도들을 수량으로 가중한 수익률 % — Σ손익 ÷ Σ(진입 평단 × 수량).
   * 매도가 없으면 `null` (Q14 ⑥)
   */
  returnPct: number | null
}

/** 계획 없는 줄의 키 머리. 한 줄이 매도 하나다 */
export const NONE_PREFIX = 'N'

export const isNoneGroup = (g: Pick<PlanGroup, 'planId'>) => g.planId === null

const minusDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const makeGroup = (key: string, list: FillRow[]): PlanGroup => {
  const asc = [...list].sort(
    (a, b) =>
      a.rec.filledAt.localeCompare(b.rec.filledAt) ||
      a.rec.recordId - b.rec.recordId,
  )
  const first = asc[0]!.rec
  const closed = asc.map((r) => r.rec).filter(isClosed)
  const realized = closed.reduce((a, r) => a + r.derived.profit, 0)
  const cost = closed.reduce((a, r) => a + r.derived.entryPrice * r.quantity, 0)
  return {
    key,
    planId: first.planId,
    planTitle: first.planTitle,
    stockCode: first.stockCode,
    stockName: first.stockName,
    rows: asc,
    firstAt: first.filledAt,
    lastAt: asc[asc.length - 1]!.rec.filledAt,
    sells: closed.length,
    realized,
    returnPct: cost > 0 ? (realized / cost) * 100 : null,
  }
}

/**
 * 색인의 줄을 만든다 (Q14 — 아카이브).
 *
 * ```text
 * 계획 있음   계획 하나가 한 줄
 * 계획 없음   «매도 하나»가 한 줄 + 그 매도의 매수(보유일수로 거슬러 찾는다)
 *            짝이 없는 매수는 자기 줄 — 결과가 없어 순위 맨 끝에 선다
 * ```
 *
 * 💀 **계획 없음을 한 묶음으로 두지 않는다** (Q14). 손익 순으로 세우면 열두
 * 매도가 합계 하나로 뭉쳐, 계획 없이 크게 잃은 거래가 순위에 안 드러난다.
 */
export function groupRows(rows: FillRow[]): PlanGroup[] {
  const by = new Map<string, FillRow[]>()
  const loose: FillRow[] = []
  for (const row of rows) {
    if (row.rec.planId === null) loose.push(row)
    else {
      const key = `P${row.rec.planId}`
      by.set(key, [...(by.get(key) ?? []), row])
    }
  }

  const used = new Set<number>()
  for (const sell of loose.filter((r) => isClosed(r.rec))) {
    const d = sell.rec.derived!
    const buyDay = minusDays(sell.rec.filledAt, d.holdingDays)
    const buy = loose.find(
      (r) =>
        r.rec.side === 'BUY' &&
        !used.has(r.rec.recordId) &&
        r.rec.stockCode === sell.rec.stockCode &&
        r.rec.filledAt === buyDay,
    )
    if (buy) used.add(buy.rec.recordId)
    by.set(`${NONE_PREFIX}${sell.rec.recordId}`, buy ? [buy, sell] : [sell])
  }
  for (const r of loose)
    if (r.rec.side === 'BUY' && !used.has(r.rec.recordId))
      by.set(`${NONE_PREFIX}${r.rec.recordId}`, [r])

  return sortGroups(
    [...by].map(([key, list]) => makeGroup(key, list)),
    'PROFIT',
  )
}

/**
 * 색인의 순서 — **손익 합계(원)** (Q14).
 *
 * 💀 **수익률(%)이 아니다.** % 는 「판단이 맞았나」를, 원은 「계좌에 얼마나
 * 영향을 줬나」를 말한다. 위젯으로 둘을 나란히 보고 사용자가 원을 골랐다.
 *
 * 매도가 없는 줄은 결과가 없어 **방향과 무관하게 맨 끝**이다.
 */
export type ListOrder = 'PROFIT' | 'LOSS'

export function sortGroups(groups: PlanGroup[], order: ListOrder): PlanGroup[] {
  const sign = order === 'PROFIT' ? 1 : -1
  return [...groups].sort(
    (a, b) =>
      Number(a.sells === 0) - Number(b.sells === 0) ||
      sign * (b.realized - a.realized) ||
      b.lastAt.localeCompare(a.lastAt),
  )
}

/**
 * 목록 필터. **머리줄의 셈이 그대로 손잡이가 된다** (2026-09-14).
 *
 * 💀 **구분(매수/매도)을 뺐다** (Q13 ⑤). 「매도만」을 누르면 묶음마다 매수
 * 행이 빠져 이야기가 끊긴다 — 브라우징과 부딪히는 유일한 손잡이였다.
 *
 * 💀 **게이트(트렌드 8/8)도 뺐다** (Q14 ⑦). 줄에서 ◆/◇ 를 걷은 뒤 거르기만
 * 남으면 걸린 줄이 왜 남았는지 안 보였다. 「게이트를 지킨 거래가 나았나」는
 * 목록에서 찾을 질문이 아니라 통계의 질문이다.
 */
export interface ListFilter {
  plan: 'ALL' | PlanClass
  /**
   * 체결일 `YYYY-MM-DD` 포함. 빈 문자열이 「끝 없음」이다.
   *
   * 💀 **워터폴의 기간과 «따로» 논다** (2026-09-15) — 저쪽은 「접기」, 여기는
   * 「찾기」다.
   *
   * 💀 **범위에 걸친 묶음은 «통째로» 나온다** (Q13 ⑤). 범위 밖 행은 흐리게
   * 따라온다 — 4월 매도만 남고 3월 매수가 사라지면 거래의 앞이 없다.
   */
  from: string
  to: string
  /** 종목 이름 · 코드 찾기 (Q13 ⑤ — 종목은 늘어나는 값이라 선택지로 못 늘어놓는다) */
  q: string
}

export const LIST_FILTER_ALL: ListFilter = {
  plan: 'ALL',
  from: '',
  to: '',
  q: '',
}

/** 아무것도 안 걸렸나. **값으로 견준다** — 같은 값의 다른 객체가 온다 */
export const isAllFilter = (f: ListFilter) =>
  f.plan === 'ALL' && !f.from && !f.to && !f.q.trim()

const inDays = (r: TradeRecord, f: ListFilter) =>
  (!f.from || r.filledAt >= f.from) && (!f.to || r.filledAt <= f.to)

/** 계획 · 종목은 «행»의 성질이다. 계획 묶음 안에서는 갈리지 않는다 */
const matchRow = (row: FillRow, f: ListFilter) => {
  const q = f.q.trim().toLowerCase()
  return (
    (f.plan === 'ALL' || row.planClass === f.plan) &&
    (!q ||
      row.rec.stockName.toLowerCase().includes(q) ||
      row.rec.stockCode.startsWith(q))
  )
}

/**
 * 묶음에 필터를 건다.
 *
 * ```text
 * 계획 · 종목          행을 거른다 — 계획 묶음은 통째로 남거나 통째로 빠진다
 *                      (계획에 없음은 종목이 섞여 있어 행 단위로 갈린다)
 * 체결일               범위 안의 행이 하나라도 있으면 묶음이 남는다. 밖은 dim
 * ```
 */
export function filterGroups(groups: PlanGroup[], f: ListFilter): PlanGroup[] {
  const out: PlanGroup[] = []
  for (const g of groups) {
    const rows = g.rows.filter((r) => matchRow(r, f))
    if (!rows.some((r) => inDays(r.rec, f))) continue
    out.push({
      ...g,
      rows: rows.map((r) => ({ ...r, dim: !inDays(r.rec, f) })),
    })
  }
  return out
}

/** 보이는 행 가운데 범위 «안»의 것 — 흐린 앞뒤는 셈에 안 든다 */
export const liveRows = (groups: PlanGroup[]): FillRow[] =>
  groups.flatMap((g) => g.rows.filter((r) => !r.dim))

/** 체결일의 양 끝 — 날짜 칸의 `min` · `max` 가 된다 */
export const dateBounds = (rows: FillRow[]) => {
  const days = rows.map((r) => r.rec.filledAt).sort()
  return { min: days[0] ?? '', max: days[days.length - 1] ?? '' }
}

// ─────────────── 잔돌 ───────────────

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)
