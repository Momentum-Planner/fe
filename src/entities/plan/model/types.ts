/**
 * 계획(TradePlan) 도메인 타입.
 *
 * ⚠️ **백엔드에 이 API 가 없다.** 도메인 모델링 노트 4절을 그대로 옮긴 것이고,
 *    msw 목이 유일한 구현이다. 실제 DTO 가 생기면 여기부터 대조한다.
 */

import type { DailyScreening } from '@/shared/lib/snapshots'

/** 계획 상태 넷. 「얼마나 샀나」가 아니라 「아직 들고 있나」가 가른다. */
export type PlanStatus = 'PLANNED' | 'RUNNING' | 'DONE' | 'CLOSED'

/**
 * 체결의 구분 (⑥). **거래 기록의 것이지 계획의 것이 아니다.**
 *
 * 💀 한때 `TradePlan` 에도 있었다. **「매도 계획」이라는 것은 없다** —
 * 명칭이 *「매도 = 그 계획을 «닫는» 것. 손절이든 익절이든 매도로 쓴다」* 이고,
 * ④-2 가 *「계획은 매수할 때 만들어진다. **살 때 파는 계획도 같이 만든다** —
 * 손절가를 정해야 계획이 성립한다」* 이다.
 *
 * 즉 **계획 하나가 진입과 스톱을 같이 든다.** 파는 일은 그 계획 «안»에 있다 —
 * 스톱가격과 스톱 갱신 규칙 셋이 그것이다. 계획을 매수용·매도용으로 가르면
 * 「살 때 파는 자리를 같이 정한다」가 무너진다.
 *
 * ⚠️ **최종미지 ④-2 · ④-3 을 뒤집는다** (2026-09-11). 거기는 「매도 계획에는
 *    실행 중이 없다」처럼 계획을 둘로 가르고 있다.
 */
export type PlanSide = 'BUY' | 'SELL'

/** 진입 상태 — 스냅샷(DailyScreeningResult)이 든다. 계획이 정하지 않는다. */
export type EntryState = 'EARLY' | 'BREAKOUT' | 'PULLBACK' | 'BLOCKED'

/**
 * ✔ `PLANNED` 의 라벨은 **「대기」**다. 옛 이름 「실행 전」을 2026-09-11 에
 *   문서·코드에서 전부 「대기」로 통일했다 — 「폐쇄 → 폐기」와 같은 날이다 (Q8).
 */
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  PLANNED: '대기',
  RUNNING: '실행 중',
  DONE: '실행 완료',
  // 「미실행」이 아니다 — ④-2 의 전이가 «대기 · 실행 중 → 폐기» 라
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
 * 스톱 상향 — **필수다. 넷 중 하나를 고른다** (Q12 · ③-3-1).
 *
 * ```text
 * R    2R · 3R · 직접 입력(R배수)   발동하면 스톱을 본전(매입가 + 수수료 + 세금)으로
 * AVG  백스톱 : 평균수익률          발동하면 스톱을 평균수익률 자리로
 * ```
 *
 * 💀 백스톱은 원래 따로 켜고 끄는 규칙이었다. 평균수익률을 스톱 상향의 발동 조건으로
 * 넣자 **발동 조건이 같은 규칙이 둘** 생겼고 옮기는 자리만 달랐다. 그래서 한 계획에는
 * 본전과 평균수익률 중 **한 방어선만** 건다.
 *
 * ⚠️ «끔»이 없다. 차트의 위쪽 면(+R)이 늘 이 값까지 칠해진다.
 */
export type StopRaise = { kind: 'R'; r: number } | { kind: 'AVG' }

/** 고르기 쉬운 R 둘. 나머지는 직접 넣는다 */
export const STOP_RAISE_PRESETS = [2, 3] as const

/**
 * 백스톱을 고를 수 있는 표본 수. 평균수익률이 표본 5건부터 나온다 (⑦ 표본 경계).
 * ⚠️ 5 는 책에 근거가 없다 — CLAUDE.md 「검증 대상」.
 */
export const AVG_STOP_MIN_SAMPLES = 5

export const stopRaiseLabel = (raise: StopRaise) =>
  raise.kind === 'AVG' ? '백스톱 : 평균수익률' : `${raise.r}R`

export const sameStopRaise = (a: StopRaise | null, b: StopRaise | null) =>
  a === b ||
  (a != null &&
    b != null &&
    a.kind === b.kind &&
    (a.kind === 'AVG' || (b.kind === 'R' && a.r === b.r)))

/**
 * 어디서 자르고 어떻게 올릴지. **한 값객체다** — 둘이 같은 판단이고 같이 바뀐다.
 * 이력이 아니라 「지금 걸린 한 벌」이라 규칙이 발동하면 덮어쓴다.
 */
export interface PlannedStop {
  bands: PlannedStopBand[]
  /** 스톱 상향. 필수 */
  raise: StopRaise
  /** 50일선 트레일링 */
  trail50: boolean
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
 *
 * **`DailyScreeningResult` 한 행 그대로다.** 따로 정의하면 둘이 어긋난다 —
 * 계획을 세울 때 날짜로 고른 행이 곧 이 값이 된다 (Q11 A).
 */
export type PlanSnapshot = DailyScreening

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
  /**
   * 이 계획에 붙은 체결 건수.
   *
   * 목록에도 있어야 하는 이유 — **사슬이 「치울 수 있나」를 스스로 답해야** 한다
   * (`canClose` · `canDelete`). 없으면 마디마다 상세를 불러야 버튼을 그린다.
   */
  recordCount: number
  /** 종목 머리줄이 쓴다 — 갈래의 «뿌리»에 계획 시점 종목 상태를 앉힌다 (F4) */
  entryState: EntryState
  fundamentalScore: number
  /** 사슬을 그리려면 목록에도 있어야 한다 */
  previousPlanId: number | null
  /**
   * 스톱 상향 — 사슬 마디에 올렸을 때 그 계획의 위쪽 면(+R)까지 그리려면 목록에도 있어야 한다 (Q12 브러싱).
   */
  raise: StopRaise
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
   * 손절가를 올려도 R배수의 분모는 이 값이다. 대기이면 null
   */
  initialStopWidth: number | null
  plannedStop: PlannedStop
  plannedPosition: PlannedPosition
  snapshot: PlanSnapshot
  closeReason: string | null
  memo: string
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

/**
 * 계획에서 «고칠 수 있는 것» — ④ 의 ㉡ 이다.
 *
 * ⚠️ 스냅샷은 여기 없다. 계획 시점에 동결된 값이고 **사후에 못 만든다** (F4).
 * ⚠️ 위험노출·1R·필요 현금도 없다. **입력이 아니라 결과»다** (④-1).
 */
export interface PlanPatch {
  /**
   * 계획 이름. **고칠 수 있다** — 사슬에서 마디를 가리키는 이름이고,
   * 세우고 나서야 「이게 무슨 계획이었지」가 분명해지는 일이 잦다.
   */
  title?: string
  entryPrice?: number
  /** v1 은 구간이 하나다 — 비중 100 · 순번 1 (④-1-2) */
  stopPrice?: number
  quantity?: number
  memo?: string
  /** 스톱 상향. 필수라 «끄는» 값이 없다 — 바꿀 수만 있다 */
  raise?: StopRaise
  trail50?: boolean
}

/**
 * 계획을 «세운다» (POST).
 *
 * ㉡ 입력값 + 종목 + 스냅샷 날짜다. **여기 없는 것은 서버가 찍는다** —
 * 계좌 총액·현금은 등록 시점 값을 얼리고(F7), 스냅샷은 `snapshotDate` 로
 * `DailyScreeningResult` 를 찾아 붙인다. 사후에 못 만드는 값이라 사용자가
 * 넣는 것이 아니다 (F4).
 */
export interface PlanCreate {
  stockCode: string
  /** 화면이 «자동으로» 붙인다 — 진입 상태 + 진입가 (Q11 A · `autoPlanTitle`) */
  title: string
  /**
   * 스냅샷 날짜 (LocalDate). **사용자가 고른다** (Q11 A · ④ 「사용자가 고를 수 있는
   * 스냅샷 날짜」). 서버는 이 날짜의 `DailyScreeningResult` 를 찾아 붙인다.
   *
   * ⚠️ 없으면 서버가 가장 최근 행을 붙인다 — 옛 폼이 날짜를 안 보내던 때의 길이다.
   *    Q11 폼이 들어가면 늘 보낸다.
   */
  snapshotDate?: string
  entryPrice: number
  /** v1 은 구간이 하나다 — 비중 100 · 순번 1 (④-1-2) */
  stopPrice: number
  quantity: number
  memo: string
  raise: StopRaise
  trail50: boolean
  /** 승계 — 추가매수로 이어 세우는 계획이면 이전 계획을 가리킨다 (④-2) */
  previousPlanId: number | null
}

/**
 * 계획을 «폐기»한다 (Q8).
 *
 * ⚠️ **`PlanPatch` 에 `status` 를 넣지 않는다.** 전이를 필드로 두면
 * `RUNNING` · `DONE` 까지 열리는데 그 둘은 **체결이 만드는 것**이고 사용자가
 * 누르는 것이 아니다 (⑥). 사용자가 직접 누르는 전이는 폐기 하나뿐이라
 * 동사 하나로 둔다.
 */
export interface PlanClose {
  /**
   * 사유. **필수다** — 폐기는 판단이고, 판단에는 이유가 있다.
   * 카테고리로 고르게 하지 않는다 (④-2).
   */
  closeReason: string
}

/**
 * 폐기와 삭제는 «다른 행위»인데 **문턱이 같다** (Q8).
 *
 * ```text
 * 폐기   안 가기로 했다 (판단)        남는다 · ⑦가 «센다» · 사유 필수
 * 삭제   애초에 없어야 했다 (정정)     사라진다 · ⑦가 «안 센다» · 사유 없음
 *
 * 둘 다   대기 + 체결 0건에서만 된다
 * ```
 *
 * **문턱이 같은 것이 결함이 아니다.** ③-2-3 이 현금에서 이미 이 모양을 만들어
 * 놨다 — *「보정을 입금·출금과 가른다. 둘 다 현금을 바꾸지만 뜻이 다르다 — 돈이
 * 들어온 것과 «잘못 적은 것»을 나중에 구분할 수 없으면, 기록이 자꾸 틀리는지
 * 실제로 입출금이 잦은지를 못 읽는다」*. 보정과 입출금도 조건이 아니라 **뜻**으로
 * 갈린다. 그래서 화면이 그 뜻을 물어야 한다.
 *
 * 체결이 붙었으면 실제로 돈이 움직였고 `TradeRecord` 가 `planId` 로 그것을
 * 가리킨다 — 지우는 것도, 「안 갔다」고 닫는 것도 거짓이 된다. 그 계획을 끝내는
 * 길은 **매도 계획**이고, 상태는 체결이 옮긴다 (⑥).
 *
 * ⚠️ **최종미지 ④-2 는 「대기 · 실행 중 → 폐기」로 적혀 있다.** 실행 중을
 *    닫는 길을 막는 것은 Q8 의 결정이고, 최종미지를 뒤집는 자리다.
 */
const untouched = (p: Pick<PlanDetail, 'status' | 'recordCount'>) =>
  p.status === 'PLANNED' && p.recordCount === 0

/** 폐기 — 안 가기로 했다. 행이 남고 ⑦가 센다 */
export const canClose = untouched
/** 삭제 — 애초에 없어야 했다. 행이 사라지고 ⑦가 안 센다 */
export const canDelete = untouched

/**
 * 계획을 세울 때 **계획이 아닌 데서 오는 값들** (2026-09-11).
 *
 * 💀 새 계획 칸이 이것들을 «이어받는 계획»에서 읽고 있었다. 그러면 **계획이
 * 하나도 없는 종목에서는 계획을 못 세운다** — 첫 계획이 제일 필요한 자리인데.
 *
 * 셋 다 원래 계획의 값이 아니다 —
 * ```text
 * 계좌 총액·현금   계좌가 든다. 사용자에 하나 (F7 · ③-2-3)
 * 손절폭 상한      ⑦ 통계가 내고 ⑧ 이 갱신한다 (④-1-1-2)
 * 손절가 후보 선    이동평균선·저항선이라 «종목»의 값이다 (④-1-1-2)
 * ```
 * 편해서 계획에서 읽었을 뿐이고, 그 편의가 첫 계획의 길을 막고 있었다.
 */
export interface PlanDefaults {
  accountTotal: number
  accountCash: number
  /** 지금 이 종목에 걸린 위험노출 — 새 계획의 «실행 전» 값이다 */
  riskBefore: number
  /** min(평균수익 ÷ 손익비 목표, 10%) */
  stopLimit: number
  /** 그 상한이 «어디서 나왔나». 통계가 없으면 null 이고 10% 가 상한이다 */
  stopLimitBasis: { avgWin: number; targetRR: number } | null
  stopCandidates: StopCandidate[]
  /**
   * 통계의 표본 수 — 매도 기록 하나가 한 건이다 (⑥).
   * `AVG_STOP_MIN_SAMPLES` 보다 적으면 「백스톱 : 평균수익률」을 못 고른다.
   */
  sampleCount: number
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
