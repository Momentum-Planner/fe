/**
 * 계획(TradePlan) 도메인 타입.
 *
 * ⚠️ **백엔드에 이 API 가 없다.** 도메인 모델링 노트 4절을 그대로 옮긴 것이고,
 *    msw 목이 유일한 구현이다. 실제 DTO 가 생기면 여기부터 대조한다.
 */

import type { Regime } from '@/shared/lib/snapshots'

/** 계획 상태 넷. 「얼마나 샀나」가 아니라 「아직 들고 있나」가 가른다. */
export type PlanStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'CLOSED'

/** 매수 계획과 매도 계획은 «같은 구조»다. 갈리는 것은 이 값과 사유뿐이다. */
export type PlanSide = 'BUY' | 'SELL'

/** 진입 상태 — 스냅샷(DailyScreeningResult)이 든다. 계획이 정하지 않는다. */
export type EntryState = 'EARLY' | 'BREAKOUT' | 'PULLBACK' | 'BLOCKED'

/**
 * ⚠️ `PLANNED` 의 라벨이 **「대기」**다. 「실행 전」이 아니다 (2026-09-09).
 *    최종미지·도메인 노트는 「실행 전」으로 쓰고 있다 — 옛 문서는 안 고쳤고
 *    CLAUDE.md 명칭에만 반영했다.
 */
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  PLANNED: '대기',
  RUNNING: '실행 중',
  DONE: '실행 완료',
  // 「미실행」이 아니다 — ④-2 의 전이가 «실행 전 · 실행 중 → 폐기» 라
  // 체결이 붙은 계획도 여기로 온다. 「미실행」이면 화면이 거짓말을 한다 (2026-09-10)
  CLOSED: '폐기',
}

export const ENTRY_STATE_LABEL: Record<EntryState, string> = {
  EARLY: '조기',
  BREAKOUT: '돌파',
  PULLBACK: '눌림',
  BLOCKED: '진입 불가',
}

/**
 * 손절 구간 하나. **v1 은 비중 100 · 순번 1 하나뿐이다** — 배분 UI 를 안 만든다.
 * 배열로 두는 이유는 「이 계획을 실행하면 어디에 얼마씩 걸리는지」를 나중에
 * 화면에서 보여줄 자리이기 때문이다.
 */
export interface PlannedStopBand {
  order: number
  stopPrice: number
  /** 비중 %. v1 은 항상 100 */
  weight: number
}

/**
 * 어디서 자르고 어떻게 올릴지. **한 값객체다** — 둘이 같은 판단이고 같이 바뀐다.
 * 이력이 아니라 「지금 걸린 한 벌」이라 규칙이 발동하면 덮어쓴다.
 */
export interface PlannedStop {
  bands: PlannedStopBand[]
  /** 스톱상향 임계 R. null 이면 끔 */
  raiseAtR: number | null
  /** 50일선 트레일링 */
  trail50: boolean
  /** 백스톱 */
  backstop: boolean
}

export interface PlannedPosition {
  quantity: number
  /** 실행 «전» 위험노출 % — 지금 포지션 기준 */
  riskBefore: number
  /** 실행 «후» 위험노출 % — 이 계획 단독 실행 기준. 시나리오끼리 합치지 않는다 */
  riskAfter: number
}

/**
 * 계획 시점의 종목 상태. 계획이 복사하지 않고 `dailyScreeningResultId` 로 참조한다 —
 * 그 행이 종목 × 일자로 «쌓이는» 행이라 그날 값이 나중에 안 변한다 (F4).
 */
export interface PlanSnapshot {
  dailyScreeningResultId: number
  /** 근거로 삼은 판정의 날짜 */
  date: string
  entryState: EntryState
  /** 펀더멘털 점수 0~7 */
  fundamentalScore: number
  /**
   * 훼손 점수 0~2.
   * ⚠️ **이 값만 출처가 다르다** — ⑤-3 가 «장중 실시간»으로 찍는다 (④-0).
   * 나머지 스냅샷 값은 전부 `date` 의 배치 한 행에서 온다.
   */
  damageScore: number
  /** 그 훼손 점수를 찍은 시각. 날짜가 다른 값에만 날짜를 붙인다 */
  damageAt: string
  /** 진입 위치 % — 피봇 대비 */
  entryPosition: number
  /** 레짐 (④-0). 종목 상세가 뱃지로 띄우던 그 값이다 */
  regime: Regime
  /** 트렌드 템플릿 8조건 중 통과 개수 */
  trendPassed: number
  /**
   * 어긋난 조건의 «이름». 8칸 도트를 안 쓰는 이유 —
   * 도트는 「세 번째 칸이 왜 비었나」를 다시 묻게 만든다. ①-1 게이트가 8/8 을
   * 요구하므로 계획이 선 종목은 대개 8/8 이고, **어긋난 것만 이름으로** 쓰면
   * 정상일 때는 한 줄로 끝난다.
   */
  trendFailed: string[]
}

/** 목록 한 줄. 싱글이 가진 것 중 «줄 세우는 데 필요한 것»만 남긴 것이다. */
export interface PlanListItem {
  planId: number
  stockCode: string
  stockName: string
  /**
   * 계획 이름. **사용자가 붙인다** — 값만 봐서는 어느 계획인지 못 가른다.
   * 같은 종목에 시나리오가 여럿이면 「돌파 68,200」과 「눌림 66,000」이
   * 숫자로만 갈리는데, 사슬에서는 그 숫자가 노드마다 달라 구분이 안 된다.
   *
   * ⚠️ 도메인 모델링 노트 4절에 없다 — 사슬을 읽으려고 여기서 늘렸다
   *    (previousPlanId 와 같은 이유).
   */
  title: string
  side: PlanSide
  status: PlanStatus
  /** 작성일 (LocalDate) */
  writtenAt: string
  entryPrice: number
  /** 최저손절가() — 파생이라 저장하지 않는다 */
  stopPrice: number
  quantity: number
  /** 이 계획 «전»의 위험노출 — 화살표의 출발점이다 */
  riskBefore: number
  /** 실행 «후» 위험노출. riskBefore 위에 이번 것을 얹은 값이다 (④-1) */
  riskAfter: number
  /** 체결률 = Σ체결수량 ÷ 계획수량. 파생 */
  fillRate: number
  /** 종목 머리줄이 쓴다 — 갈래의 «뿌리»에 계획 시점 종목 상태를 앉힌다 (F4) */
  entryState: EntryState
  fundamentalScore: number
  /** 사슬을 그리려면 목록에도 있어야 한다 */
  previousPlanId: number | null
}

/**
 * 손절가 후보 선 (④-1-1-2). **서비스가 하나를 정해 주지 않는다** — 늘어놓고 고르게 한다.
 * 상한(min(평균수익 ÷ 손익비, 10%))을 넘는 선은 «회색»으로 남긴다. 지우지 않는다.
 */
export interface StopCandidate {
  /** 베이스 하단 · 10일선 · 21일선 · 20일선 · 50일선 · 평균수익률 선 */
  label: string
  price: number
  /** 손절폭 % (진입가 대비) */
  width: number
  /** 상한을 넘어 못 고르는 선 */
  overLimit: boolean
  chosen: boolean
}

/** 이 계획에 붙은 체결 하나 (⑥). 체결 하나가 한 행이다. */
export interface PlanRecord {
  recordId: number
  /** 체결일시 */
  filledAt: string
  side: PlanSide
  price: number
  quantity: number
}

export interface PlanDetail extends PlanListItem {
  /**
   * 이 계획이 «이어받은» 계획. 추가매수로 새 계획이 서면 이전 것은 실행 완료로
   * 닫히는데, **물량이 나가서가 아니라 판단이 승계돼서**다 (④-2).
   * 그 승계가 도메인 사건이라 추론하지 않고 저장한다.
   *
   * ⚠️ 도메인 모델링 노트 4절에는 이 필드가 «없다» — 사슬을 그리려고 여기서 늘렸다.
   */
  previousPlanId: number | null
  /** 등록 시점 계좌총액. **이것만 복사한다** — 참조로는 그 시점을 못 되살린다 */
  accountTotal: number
  /**
   * 등록 시점 «현금». 계좌 총액 = 현금 + 평가액 이므로 총액만으로는 살 수 있는지
   * 알 수 없다. **기록상 현금보다 큰 매수는 막는다** — 살 돈이 있는지를 증권사 앱에
   * 미루지 않는다 (④-1-3).
   */
  accountCash: number
  /**
   * 이 계획의 1R. **실행될 때 박히고 그 뒤로 안 변한다** —
   * 손절가를 올려도 R배수의 분모는 이 값이다. 실행 전이면 null
   */
  initialStopWidth: number | null
  plannedStop: PlannedStop
  plannedPosition: PlannedPosition
  snapshot: PlanSnapshot
  closeReason: string | null
  memo: string
  /** 이 계획에 붙은 체결 건수 */
  recordCount: number
  /** 손절가를 «왜 거기» 뒀는지. 고른 선 하나가 아니라 후보 전부를 든다 */
  stopCandidates: StopCandidate[]
  records: PlanRecord[]
  /** 손절폭 상한 % — min(평균수익 ÷ 손익비, 10%) */
  stopLimit: number
  /**
   * 그 상한이 «어디서 나왔나».
   *
   * 숫자만 있으면 2.36% 가 하늘에서 떨어진 값으로 읽힌다 — 상한을 정하는 것은
   * 차트가 아니라 «내 평균 수익»이다(④-1-1-2). 통계가 없으면 `null` 이고 그때는
   * 10% 가 그대로 상한이다.
   */
  stopLimitBasis: { avgWin: number; targetRR: number } | null
}

export interface PlanListResponse {
  plans: PlanListItem[]
}

/** 목록 필터. 「오늘」과 「전체」는 같은 컬렉션의 «기간» 필터다 (Q3). */
export interface PlanListFilters {
  /** LocalDate */
  from?: string
  to?: string
  statuses?: PlanStatus[]
  stockCode?: string
}

/**
 * 종목 포지션 (③). 계획을 세우거나 고칠 때 «옆에 있어야» 하는 값이다 —
 * ④의 자료가 「스냅샷 + ③의 현재 손절가·위험노출·보유 수량 + 계좌 총액」이다.
 *
 * ⚠️ StockPosition API 도 백엔드에 없다.
 */
export interface StockPositionView {
  stockCode: string
  quantity: number
  avgPrice: number
  /** 지금 걸린 손절가 — 「실행 중」 계획의 PlannedStop 이 든 값이다 */
  stopPrice: number | null
  /** 지금 위험노출 % */
  riskExposure: number
}
