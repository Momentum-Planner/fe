/**
 * 거래 기록(TradeRecord) 도메인 타입 — ⑥ 이 넣고 ⑦ 이 읽는다.
 *
 * ⚠️ **백엔드에 이 API 가 없다.** 도메인 모델링 노트 5절과 최종미지 ⑥⑦ 을 옮긴
 *    것이고, msw 목이 유일한 구현이다. 실제 DTO 가 생기면 여기부터 대조한다.
 *
 * **체결 하나가 한 행이다.** 100주 사서 50/50 으로 팔면 행이 셋이다 —
 * *「묶어서 「+3.85% 한 건, 승률 100%」로 만들지 않는다 … 묶으면 손절을 숨기게
 * 된다」* (⑥). 그래서 세는 단위도 **매도 기록 하나**다.
 */

import type { EntryState, Regime } from '@/shared/lib/snapshots'

/** 체결 구분. 매수는 한 번, 매도는 분할이면 여러 번 */
export type TradeSide = 'BUY' | 'SELL'

/**
 * 매도 사유 (⑥). **한 체결에 여러 개** 고를 수 있다 — 손절가에 닿았는데
 * 추세도 훼손된 경우가 실제로 있다.
 */
export type SellReason =
  | 'STOP_HIT'
  | 'STOP_RAISED'
  | 'TREND_DAMAGE'
  | 'TAKE_PROFIT'
  | 'UNPLANNED'

export const SELL_REASON_LABEL: Record<SellReason, string> = {
  STOP_HIT: '손절가 도달',
  STOP_RAISED: '스톱가격 갱신',
  TREND_DAMAGE: '추세 훼손',
  TAKE_PROFIT: '익절',
  UNPLANNED: '계획에 없음',
}

export const SELL_REASONS: SellReason[] = [
  'STOP_HIT',
  'STOP_RAISED',
  'TREND_DAMAGE',
  'TAKE_PROFIT',
  'UNPLANNED',
]

/** 위험노출 구간 (③-2). 경계는 1% · 2.5% 다 */
export type RiskBand = 'UNDER_1' | 'MID' | 'OVER_25'

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  UNDER_1: '1% 미만',
  MID: '1~2.5%',
  OVER_25: '2.5% 초과',
}

export const RISK_BANDS: RiskBand[] = ['UNDER_1', 'MID', 'OVER_25']

export const riskBandOf = (riskPct: number): RiskBand =>
  riskPct < 1 ? 'UNDER_1' : riskPct <= 2.5 ? 'MID' : 'OVER_25'

/**
 * 진입 시점 스냅샷 (F4) — **사후에 못 만든다.**
 *
 * ⚠️ `PlanSnapshot` 보다 **둘이 많다** — `baseNo` · `vcp`. ⑦ 의 그룹별 성과가
 *    *「베이스 번호 · 트렌드 · VCP · 진입 상태」* 를 축으로 요구하는데
 *    `entities/plan` 의 `PlanSnapshot` 에는 그 둘이 없다. F4 의 목록
 *    (*「트렌드 템플릿 · 베이스 번호 · VCP · 레짐」*)이 이쪽과 맞으므로
 *    **`PlanSnapshot` 이 모자란 쪽**으로 본다. 계획 화면이 그 둘을 쓸 때 합친다.
 */
export interface TradeSnapshot {
  dailyScreeningResultId: number
  /** 근거로 삼은 판정의 날짜 */
  date: string
  entryState: EntryState
  regime: Regime
  /** 트렌드 템플릿 8조건 중 통과 개수 */
  trendPassed: number
  /**
   * 어긴 조건의 «이름». 8/8 이면 빈 배열이다.
   *
   * ⚠️ **⑦ 의 「트렌드 8조건 표」가 이것 없이는 안 선다** — 통과 «개수»만으로는
   *    *「어느 조건을 어기고 샀나」* 에 답할 수 없다. `DailyScreening` 이 이미
   *    같은 이름으로 들고 있던 것을 스냅샷에도 얼린다 (F4 — 사후에 못 만든다).
   */
  trendFailed: string[]
  /** 몇 번째 베이스인가 */
  baseNo: number
  /** VCP 가 잡혔나 */
  vcp: boolean
  /** 펀더멘털 점수 0~7 */
  fundamentalScore: number
  /** 훼손 점수 0~2 */
  damageScore: number
  /** 진입 위치 % — 피봇 대비. ⚠️ v1 은 «축이 아니다». 15건 뒤에 경계를 자른다 */
  entryPosition: number
}

/**
 * 저장하면서 계산되는 것 — **매도 행에만 생긴다** (모델 노트 5절: `0..1`).
 * 매수 행은 아직 결과가 없다.
 *
 * 저장하는 이유는 분모가 세 군데에 흩어져 있어서다 — 계좌 총액은 이 기록,
 * 최초 손절폭은 계획, 진입가는 매수 기록. 얼려두면 ⑦ 쿼리가 한 테이블로 끝난다.
 */
export interface TradeRecordDerived {
  /** 그 계획의 매수 평단 */
  entryPrice: number
  returnPct: number
  profit: number
  holdingDays: number
  /**
   * 실제 손익 ÷ **그 계획의 최초 손절폭**. 손절가가 갱신돼도 분모는 안 변한다.
   *
   * ⚠️ **계획이 없으면 `null` 이다** — 1R 이 없어 R 축에 올라오지 않는다.
   *    *「건수만 따로 적는다」* (⑦).
   */
  rMultiple: number | null
  /** (진입가 − 손절가) × 수량 ÷ 계좌 총액. 손절가가 없으면 null (CSV 업로드) */
  riskPct: number | null
  riskBand: RiskBand | null
}

/** 체결 한 건 */
export interface TradeRecord {
  recordId: number
  stockCode: string
  stockName: string
  side: TradeSide
  price: number
  quantity: number
  /** 체결일 (LocalDate) */
  filledAt: string
  /** 매도 사유 — 여럿. 매수 행은 빈 배열이고 `reason` 에 자유 서술이 든다 */
  sellReasons: SellReason[]
  /** 왜 샀는지 / 판 뒤의 한 줄. 자유 서술이라 분류하지 않는다 */
  reason: string
  /**
   * 어느 계획을 실행한 것인가. **`null` 이 「계획에 없음」이고 ⑦ 의 첫 분류축이다.**
   * 모델 노트가 말하는 이 서비스의 «유일한 실제 FK» 이고 nullable 이다.
   */
  planId: number | null
  planTitle: string | null
  /**
   * 등록 시점 계좌 총액 (F7). **계획 없는 거래도 받는다** —
   * *「잘못한 거래일수록 계좌를 몇 % 걸었는지를 봐야 한다」* (⑥).
   */
  accountTotal: number
  /** CSV 로 들어와 손절가가 없는 행. 위험노출을 «비운다» — 0 으로 채우지 않는다 */
  estimated: boolean
  derived: TradeRecordDerived | null
  snapshot: TradeSnapshot | null
}

// ─────────────── 통계 (⑦) ───────────────

/**
 * 그룹 한 칸. **`rs` 를 접지 않고 들고 온다** —
 * *「평균은 값들을 하나로 접으므로, 접힌 뒤에는 그 안의 모양이 남지 않는다」*
 * (디자인 3장 ③). 세 표식의 점 도표와 스파크바가 이 배열로 그려진다.
 */
export interface GroupCell {
  key: string
  label: string
  /** 매도 기록 건수. 1건부터 사실이다 */
  count: number
  /** 이긴 건수 · 진 건수. 확산형 누적 막대가 이 둘로 선다 */
  wins: number
  losses: number
  /** ⚠️ 5건 미만이면 `null` — 방향조차 말하지 않는다 (⑦ 표본 경계) */
  winRate: number | null
  avgReturn: number | null
  /**
   * 개별 매도의 **수익률 %** — 이것이 축이다.
   *
   * 💀 R 배수였다. 그런데 *「1R 은 그 계획의 최초 손절폭」* 이라 **계획마다
   * 다른 자**다 — 「−1R」이 어떤 거래에서는 1.2%, 다른 거래에서는 2.9%다.
   * 보유 중 화면은 R 을 써도 된다(지금 실행 중인 계획 하나의 고정값이고
   * 시점이 맞는다). **끝난 거래를 모아 놓은 축에서는 %가 맞다.**
   *
   * 그리고 %로 바꾸면 **계획 없는 매도도 같은 축에 올라온다** — R 축은
   * 1R 이 없어 그것들을 통째로 빼고 있었다.
   *
   * `broke` 는 그 거래가 «자기» 1R 을 넘겼는지다. 벽이 한 선으로 안 서므로
   * 점마다 들고 있어야 한다.
   */
  rets: { pct: number; broke: boolean }[]
  /** 그중 벽(−1R) 왼쪽. **1건부터 사실이다** */
  wallBreaks: number
}

/** 그룹 축 — ⑦ 이 요구한 아홉 */
export type GroupAxisKey =
  | 'plan'
  | 'baseNo'
  | 'trend'
  | 'vcp'
  | 'entryState'
  | 'damage'
  | 'riskBand'
  | 'regime'
  | 'sellReason'

export interface GroupAxis {
  key: GroupAxisKey
  label: string
  /** 이 축이 무엇을 가르는지 한 줄. 표의 머리줄이 이것을 쓴다 */
  desc: string
  cells: GroupCell[]
}

/** 정산표 ②③④ + 파생 셋. 전부 **5건부터** 나온다 */
export interface Settlement {
  winRate: number
  avgWin: number
  avgLoss: number
  /** 평균 보유 기간 — 수익 / 손실 «각각». 하나로 묶지 않는다 (정산표 ④) */
  holdWin: number
  holdLoss: number
  /** 손익비 = 평균수익 ÷ |평균손실| */
  payoff: number
  /** 기대값 (원) */
  expectancy: number
  /** 예측치 = R 배수의 평균 */
  predictor: number
}

/** 정산표 ⑤ — **평균이 아니라 최대**라서 1건도 사실이다 */
export interface MonthlyPeak {
  /** YYYY-MM */
  month: string
  best: number
  worst: number
  count: number
}

/** 자본 감소. **사실이라 1건도 유효하다** */
export interface CapitalCurve {
  /** 누적 R 과 그때까지의 고점. 고점 대비 음영이 이 둘 사이다 */
  points: { date: string; cumR: number; peakR: number }[]
  /** 고점 대비 최대로 밀린 폭 (R) */
  maxDrawdown: number
  /** 지금 고점에서 얼마나 내려와 있나 (R) */
  currentDrawdown: number
  longestLossStreak: number
}

/** 계획 있음 vs 없음 한 쌍. 조건 고정과 교차가 같은 모양을 쓴다 */
export interface PlanPair {
  label: string
  /** 무엇을 고정했는지 — 「트렌드 8/8 안에서」 */
  desc: string
  withPlan: GroupCell
  withoutPlan: GroupCell
}

export interface TradeStats {
  /** 매도 기록 건수 — 세는 단위다 (⑥) */
  closed: number
  /** 그중 R 축에 올라가는 것 (계획 있음) */
  planned: number
  /** R 축에 못 올라가는 건수. **지우지 않고 따로 적는다** (⑦) */
  unplanned: number
  /** 벽(−1R) 왼쪽 건수. 1건부터 사실이다 */
  wallBreaks: number

  /** ★ 첫 화면 맨 위 — 최대 수익 · 최대 손실. 그 거래의 스냅샷이 딸려 온다 */
  best: TradeRecord | null
  worst: TradeRecord | null

  /**
   * **1R 이 실제로 얼마였나.**
   *
   * 1R 은 *「그 계획의 최초 손절폭」* 이라 **계획마다 다른 값**이다.
   * %축에서 벽은 **선 하나로 안 선다** — 평균과 범위를 들고 «밴드»로 그린다
   * (3장 ⑥ — 참조선이 하나로 안 서면 밴드다).
   *
   * `returnPct ÷ rMultiple` 로 역산한다.
   */
  oneR: { avgPct: number; minPct: number; maxPct: number } | null

  /**
   * 전체를 한 칸으로 — **위의 띠와 아래 그룹 행이 같은 표식을 쓴다.**
   * *「같은 표식을 크기만 바꿔 개요와 세부에 재사용」* (디자인 3장 ⑧).
   */
  overall: GroupCell

  /** 5건부터 */
  settlement: Settlement | null
  /** 1건부터 */
  monthly: MonthlyPeak[]
  capital: CapitalCurve
  /** 15건부터 — 표본을 또 가르기 때문이다 */
  groups: GroupAxis[]
  controlled: PlanPair[]
  /** 교차 — 계획 유무 × 위험노출 구간. **계획 없는 매매가 어디 몰리는지** */
  cross: PlanPair[]

  /**
   * ④ 에 지금 박혀 있는 값. **판정의 기준이고, 없는 자리는 비어 있다** (8장 ①).
   * ⚠️ 정의는 아래 `StatTargets` 에 있다 — 파일 순서상 여기가 먼저다.
   */
  targets: StatTargets
  /** 지표별 분기 추이 — 「지금」 옆의 「계속」 (8장 ②) */
  trends: KpiTrends
}

export interface TradeListResponse {
  records: TradeRecord[]
}

/** 목록 필터. 통계는 **기본 누적 전체**이고 기간은 옵션이다 (⑦) */
export interface TradeListFilters {
  from?: string
  to?: string
  stockCode?: string
  /** 계획 유무로 가른다 */
  planned?: boolean
}

// ─────────────── 판정과 추이 (디자인 8장 ①②) ───────────────

/**
 * ⑦ 이 내는 지표 하나의 열쇠. **⑧ 이 가져가는 자리와 일대일**로 둔다 —
 * 화면의 행 하나가 이 열쇠 하나다 (8장: *「한 행 = KPI 하나」*).
 */
export type KpiKey =
  | 'winRate'
  | 'avgWin'
  | 'avgLoss'
  | 'payoff'
  | 'expectancy'
  | 'predictor'
  | 'holdWin'
  | 'holdLoss'
  | 'maxDrawdown'
  | 'currentDrawdown'
  | 'lossStreak'

/**
 * 판정 다섯 — **8장 ① 의 아이콘 다섯을 그대로 옮긴 것**이다.
 *
 * ```text
 * ON         설정과 맞는다
 * NEAR       근접
 * OFF        어긋난다 — ⑧ 이 diff 를 낼 자리
 * NO_TARGET  ④ 에 그 값이 없다      ← 판정 자체가 «성립하지 않는다»
 * PENDING    표본이 문턱 아래다      ← 판정을 «못 한다»
 * ```
 *
 * 💀 **뒤의 둘을 뭉치면 안 된다.** *「'타겟 없음'과 '데이터 없음'을 별도
 * 아이콘으로 둔 점이 중요하다. 둘 다 회색·빈 원인데 **없는 이유가 다르다.**
 * 타겟이 없으면 판정 자체가 성립하지 않고, 데이터가 없으면 판정을 못 한 것이다.
 * 이걸 뭉치면 「왜 회색인가」를 다시 물어야 한다」* (8장 ①).
 *
 * 이 화면에는 「없음」이 **세 종류**로 들어온다 — ⓐ 계획이 없어 1R 이 없는 것
 * ⓑ 표본이 5건 아래인 것 ⓒ `estimated` 라 손절가가 없는 것. ⓐ 는 판정이
 * 성립하지 않으므로 `NO_TARGET`, ⓑⓒ 는 판정을 못 하는 것이라 `PENDING` 이다.
 *
 * ⚠️ **색으로 좋고 나쁨을 말하지 않는다.** 이 서비스에서 빨강은 «상승»이고
 *    파랑은 «하락»이라(한국식), 8장의 🔴 미달 / 🔵 도달을 그대로 쓰면
 *    같은 화면에서 빨강이 두 뜻을 진다. 어긋남은 **노랑(경고)**이 지고,
 *    방향은 **원 안의 채움 위치**가 진다 (8장: *「중심부 위쪽이나 아래쪽에
 *    채워진 영역이 있는 원」*).
 */
export type VerdictState = 'ON' | 'NEAR' | 'OFF' | 'NO_TARGET' | 'PENDING'

export interface KpiVerdict {
  state: VerdictState
  /**
   * 설정 대비 방향과 세기. `+1` 이면 통계가 설정보다 크게 위, `−1` 이면 아래.
   * 판정이 안 되면 `null` — **0 으로 채우지 않는다.**
   */
  dir: number | null
}

/** ④ 에 지금 박혀 있는 값. **서비스가 정한 값이 아니라 사용자가 승인한 값**이다 */
export interface StatTarget {
  value: number
  /** 어디에 박혀 있나 — 「④-1 손절폭 상한의 근거」 */
  from: string
}

/**
 * 판정의 기준.
 *
 * 💀 **「값을 대신 정하지 않는다」(non-goal)와 어긋나지 않는다.** 이 값들은
 * 서비스가 제시하는 목표가 아니라 **사용자가 ④ 에 이미 박아 둔 값**이고,
 * 판정이 말하는 것은 *「좋다/나쁘다」* 가 아니라 *「네가 정한 값과 지금
 * 통계가 어긋났다 — ⑧ 이 고치자고 할 자리다」* 다.
 *
 * 없는 자리는 **비운다.** 최종미지 「아직 안 정한 것」이 그대로 ⚪ 로 나온다 —
 * 연속 손실 국면의 조정 절차 · 포지션 확대 절차가 아직 없다.
 */
export type StatTargets = Partial<Record<KpiKey, StatTarget>>

/** 추이 한 점. **표본이 모자란 기간은 `value` 가 `null` 이고 점을 안 찍는다** */
export interface TrendPoint {
  /** `2025-Q3` */
  period: string
  /** 그 기간의 매도 건수 */
  count: number
  value: number | null
}

/**
 * 지표별 추이 — **「지금」 옆에 「계속」을 붙인다** (8장 ②).
 *
 * *「아이콘은 '지금'을, 스파크라인은 '계속'을 맡는다 … 빨간 원 하나로는 대응
 * 여부를 정할 수 없고, 연속 몇 분기째인지를 알아야 정할 수 있다」* (8장 ②).
 *
 * ⚠️ **⑦ 의 항목 목록에 없는 것이다.** ⑦ 은 *「기본 누적 전체, 기간 필터는
 *    옵션」* 이라고만 했고 추이를 요구하지 않았다. 화면이 이것을 들이기로
 *    했으므로 최종미지 ⑦ 에 항목을 더해야 한다 (2026-09-12).
 *
 * 기간은 **분기**다. 월로 가르면 46건이 열두 조각이 되어 어느 점도 5건을
 * 못 넘긴다 — *「나눠서 비교하면 표본을 또 가른다」* (⑦).
 */
export type KpiTrends = Partial<Record<KpiKey, TrendPoint[]>>
