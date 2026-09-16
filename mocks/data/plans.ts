import type {
  PlanCreate,
  PlanDetail,
  PlanListItem,
  PlanSnapshot,
  StopCandidate,
} from '@/entities/plan'

/**
 * 계획 목 데이터.
 *
 * ⚠️ **백엔드에 TradePlan API 가 없다.** 이 파일이 유일한 구현이고,
 *    화면 설계는 여기 값을 띄워 놓고 판단한다.
 *
 * 값을 손으로 박되 **파생은 손으로 안 박는다** — 최저손절가·위험노출·체결률은
 * 아래에서 계산한다. 모델 노트가 「둘 다 저장하면 어긋날 경로가 생긴다」고
 * 한 자리라, 목에서부터 어긋나면 화면이 거짓말을 배운다.
 */

/** 계좌총액. 계획이 등록 시점 값을 «얼려» 간다 — 위험노출의 분모다 (F7). */
const ACCOUNT_TOTAL = 80_000_000
/** 그중 «현금». 나머지는 평가액이다 — 살 수 있는지는 이 값이 정한다 (④-1-3) */
const ACCOUNT_CASH = 21_500_000
/**
 * 손절폭 상한의 근거 — min(평균수익 4.72% ÷ 손익비 목표 2, 10%) = 2.36%.
 * ⑦이 내놓는 값이라 사용자마다 다르고, 표본이 모자라면 null 이 되어 10% 가 상한이다.
 *
 * 💀 **⑦ 이 이 값을 읽어 판정한다** (2026-09-12). 여기 박혀 있는 4.72% 는
 * *「사용자가 승인한 값」* 이고, ⑦ 이 지금 내는 평균 수익은 그와 다르다 —
 * **그 어긋남이 ⑧ 이 diff 를 낼 자리**다. 그래서 export 한다.
 *
 * ⚠️ Q9 남은 미결 *「평균 수익이 두 목에서 다르다 … 한쪽이 다른 쪽을 읽어야
 *    맞다」* 는 **아직 그대로다.** ⑧ 을 만들 때 이 상수가 거래 기록에서
 *    계산되도록 바꾼다. 지금은 «어긋나 있는 것이 화면에 보이는» 쪽이 낫다.
 */
export const STOP_LIMIT_BASIS = { avgWin: 4.72, targetRR: 2 }

/** 손절 구간 한 벌을 만든다. v1 은 비중 100 · 순번 1 하나뿐이다. */
const singleStop = (
  stopPrice: number,
  opts: {
    raiseAtR?: number | null
    trail50?: boolean
    backstop?: boolean
  } = {},
) => ({
  bands: [{ order: 1, stopPrice, weight: 100 }],
  raiseAtR: opts.raiseAtR ?? null,
  trail50: opts.trail50 ?? false,
  backstop: opts.backstop ?? false,
})

/**
 * 스크리닝 스냅샷 — **종목 × 일자로 쌓인 행 하나**다 (DailyScreeningResult).
 *
 * 💀 처음엔 계획마다 손으로 박았다가, 화면에 띄우고서 틀린 걸 알았다 —
 * 삼성전자 계획 둘이 **같은 `dailyScreeningResultId` 를 가리키는데 진입 상태가
 * 달랐다**(돌파 / 눌림). 같은 행을 가리키면 값이 같아야 한다.
 *
 * 갈린 것은 종목의 판정이 아니라 **내가 어디서 들어갈지**였다 —
 * 「오늘 돌파 상태인 종목에, 눌림까지 오면 66,000 에 들어간다」가 계획 B 다.
 * 그러니 「돌파 / 눌림」은 계획의 «진입가 선택»이지 스냅샷의 값이 아니다.
 */
const SNAPSHOTS = {
  90124: {
    dailyScreeningResultId: 90124,
    date: '2026-08-23',
    entryState: 'BREAKOUT',
    fundamentalScore: 5,
    damageScore: 0,
    entryPosition: 1.8,
    regime: 'start',
    damageAt: '2026-08-24 14:32',
    trendPassed: 8,
    trendFailed: [],
  },
  90455: {
    dailyScreeningResultId: 90455,
    date: '2026-09-08',
    entryState: 'BREAKOUT',
    fundamentalScore: 4,
    damageScore: 0,
    entryPosition: 0.4,
    regime: 'prep',
    damageAt: '2026-09-08 15:20',
    trendPassed: 8,
    trendFailed: [],
  },
  87310: {
    dailyScreeningResultId: 87310,
    date: '2026-06-01',
    entryState: 'PULLBACK',
    fundamentalScore: 3,
    damageScore: 0,
    entryPosition: -4.1,
    regime: 'prep',
    damageAt: '2026-06-01 15:30',
    trendPassed: 7,
    trendFailed: ['200일선 상승'],
  },
  88790: {
    dailyScreeningResultId: 88790,
    date: '2026-07-11',
    entryState: 'BREAKOUT',
    fundamentalScore: 6,
    damageScore: 1,
    entryPosition: 2.2,
    regime: 'start',
    damageAt: '2026-07-11 13:05',
    trendPassed: 8,
    trendFailed: [],
  },
  90440: {
    dailyScreeningResultId: 90440,
    date: '2026-09-07',
    entryState: 'BREAKOUT',
    fundamentalScore: 5,
    damageScore: 0,
    entryPosition: 9.6,
    regime: 'start',
    damageAt: '2026-09-07 15:30',
    trendPassed: 8,
    trendFailed: [],
  },
  /**
   * ── 진입 불가 셋 ──────────────────────────────────────────────
   * **관문 뱃지의 오른쪽 절반은 못 살 때만 레짐이 된다** (`entryGate`).
   * 그래서 `BLOCKED` 이 한 건도 없으면 「진입 불가 · …」 세 칸을 화면에서
   * 영영 못 본다 — 목이 화면의 절반을 안 그리고 있었다 (2026-09-16).
   *
   * ⚠️ 레짐을 사유로 쓰는 것은 **지금의 규칙**이다. 진입 불가의 «사유 넷»이
   *    실리면 오른쪽 절반이 그쪽으로 옮겨 갈 수 있다 (CLAUDE.md 미정).
   */
  91010: {
    dailyScreeningResultId: 91010,
    date: '2026-08-29',
    entryState: 'BLOCKED',
    fundamentalScore: 5,
    damageScore: 1,
    entryPosition: 2.4,
    regime: 'fail',
    damageAt: '2026-08-29 13:05',
    trendPassed: 8,
    trendFailed: [],
  },
  91020: {
    dailyScreeningResultId: 91020,
    date: '2026-08-12',
    entryState: 'BLOCKED',
    fundamentalScore: 4,
    damageScore: 2,
    entryPosition: -8.2,
    regime: 'drop',
    damageAt: '2026-08-12 10:22',
    trendPassed: 6,
    trendFailed: ['50일선 > 150·200일선', '진입 가능 · 50일선 위'],
  },
  91030: {
    dailyScreeningResultId: 91030,
    date: '2026-09-01',
    entryState: 'BLOCKED',
    fundamentalScore: 2,
    damageScore: 1,
    entryPosition: -6.4,
    regime: 'none',
    damageAt: '2026-09-01 11:48',
    trendPassed: 6,
    trendFailed: ['200일선 상승', 'RS 70 이상'],
  },
} satisfies Record<number, PlanSnapshot>

type Seed = Omit<
  PlanDetail,
  | 'stopPrice'
  | 'quantity'
  | 'riskAfter'
  | 'fillRate'
  | 'accountTotal'
  // 계좌 값과 상한 근거는 사용자에 하나다 — 계획마다 박으면 어긋난다
  | 'accountCash'
  | 'stopLimitBasis'
  // 머리줄용 둘은 스냅샷에서 «꺼내» 온다 — 손으로 또 박으면 어긋날 자리가 생긴다
  | 'entryState'
  | 'fundamentalScore'
  // riskBefore 는 plannedPosition 에 이미 있다. 목록용은 거기서 꺼낸다
  | 'riskBefore'
  // 후보 선은 진입가·손절가·상한에서 «만들어» 진다. 손으로 박지 않는다
  | 'stopCandidates'
> & { filled: number }

const SEEDS: Seed[] = [
  // ── SK하이닉스 사슬 ──  7 ✕폐기   8 실행완료 ──→ 1 실행중 ──┬─→ 6 매도(대기)
  {
    planId: 7,
    title: '1차 베이스 돌파',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'CLOSED',
    writtenAt: '2026-06-02',
    entryPrice: 890_000,
    initialStopWidth: null,
    previousPlanId: null,
    plannedStop: singleStop(842_000),
    plannedPosition: { quantity: 20, riskBefore: 0, riskAfter: 0 },
    snapshot: SNAPSHOTS[87310],
    closeReason: '진입가에 안 왔다. 다음 베이스를 기다린다',
    memo: '',
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  },
  {
    planId: 8,
    title: '2차 베이스 진입',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'DONE',
    writtenAt: '2026-07-14',
    entryPrice: 962_000,
    initialStopWidth: 41_000,
    // 사슬의 시작. 이어받은 것이 없다
    previousPlanId: null,
    plannedStop: singleStop(962_000, { raiseAtR: 2 }),
    plannedPosition: { quantity: 10, riskBefore: 0, riskAfter: 0 },
    snapshot: SNAPSHOTS[88790],
    closeReason: null,
    memo: '추가매수로 판단이 승계됐다. 물량은 종목에 남는다',
    recordCount: 1,
    filled: 10,
    stopLimit: 2.36,
    records: [
      {
        recordId: 81,
        filledAt: '2026-07-15 09:12',
        side: 'BUY',
        price: 963_500,
        quantity: 10,
      },
    ],
  },
  {
    planId: 1,
    title: '추가매수 — 신고가 돌파',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'RUNNING',
    writtenAt: '2026-08-24',
    entryPrice: 1_120_000,
    // 실행될 때 1R 이 박혔다 — 1,120,000 − 1,036,000
    initialStopWidth: 84_000,
    // 추가매수로 12번을 «이어받았다». 12번은 그때 실행 완료로 닫혔다
    previousPlanId: 12,
    // 2R 에서 본전으로 올라갔다. 1R 은 «안» 따라 움직인다
    plannedStop: singleStop(1_120_000, { raiseAtR: 2, trail50: true }),
    plannedPosition: { quantity: 15, riskBefore: 0.9, riskAfter: 0 },
    snapshot: SNAPSHOTS[90124],
    closeReason: null,
    memo: '3주 베이스 상단 돌파. 거래량 평균의 2.1배.',
    recordCount: 2,
    filled: 15,
    stopLimit: 2.36,
    records: [
      {
        recordId: 91,
        filledAt: '2026-08-25 09:04',
        side: 'BUY',
        price: 1_121_000,
        quantity: 10,
      },
      {
        recordId: 92,
        filledAt: '2026-08-25 10:41',
        side: 'BUY',
        price: 1_122_000,
        quantity: 5,
      },
    ],
  },
  // 같은 종목에 시나리오 둘. 하나만 실현되므로 위험노출을 «합치지 않는다»
  {
    planId: 2,
    title: '돌파 진입 68,200',
    stockCode: '005930',
    stockName: '삼성전자',
    status: 'PLANNED',
    writtenAt: '2026-09-08',
    entryPrice: 68_200,
    previousPlanId: null,
    initialStopWidth: null,
    plannedStop: singleStop(64_100, { raiseAtR: 2 }),
    plannedPosition: { quantity: 400, riskBefore: 1.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[90455],
    closeReason: null,
    memo: '돌파로 갈 때. 피봇 68,000 위 0.4%.',
    recordCount: 0,
    stopLimit: 2.36,
    records: [],
    filled: 0,
  },
  {
    planId: 3,
    title: '눌림 대기 66,000',
    stockCode: '005930',
    stockName: '삼성전자',
    status: 'PLANNED',
    writtenAt: '2026-09-08',
    entryPrice: 66_000,
    previousPlanId: null,
    initialStopWidth: null,
    plannedStop: singleStop(62_300, { trail50: true }),
    plannedPosition: { quantity: 500, riskBefore: 1.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[90455],
    closeReason: null,
    memo: '눌림으로 올 때. 50일선 근처까지 기다린다.',
    recordCount: 0,
    stopLimit: 2.36,
    records: [],
    filled: 0,
  },
  {
    planId: 4,
    title: '2차 베이스 돌파',
    stockCode: '035720',
    stockName: '카카오',
    status: 'DONE',
    writtenAt: '2026-07-14',
    entryPrice: 55_000,
    previousPlanId: null,
    initialStopWidth: 3_300,
    plannedStop: singleStop(58_000, { raiseAtR: 2, backstop: true }),
    plannedPosition: { quantity: 300, riskBefore: 0.4, riskAfter: 0 },
    snapshot: SNAPSHOTS[88790],
    closeReason: null,
    memo: '전량 청산. 스톱이 58,000 에서 걸렸다.',
    recordCount: 3,
    stopLimit: 2.36,
    records: [],
    filled: 300,
  },
  {
    planId: 5,
    title: '조기 진입 시도',
    stockCode: '041510',
    stockName: '에스엠',
    status: 'CLOSED',
    writtenAt: '2026-09-01',
    entryPrice: 92_000,
    previousPlanId: null,
    initialStopWidth: null,
    plannedStop: singleStop(86_500),
    plannedPosition: { quantity: 180, riskBefore: 2.2, riskAfter: 0 },
    snapshot: SNAPSHOTS[91030],
    closeReason: '진입 상한을 넘겨 버려서 안 들어갔다',
    memo: '',
    recordCount: 0,
    stopLimit: 2.36,
    records: [],
    filled: 0,
  },
  {
    planId: 10,
    title: '3주 눌림 추가매수',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'DONE',
    writtenAt: '2026-07-28',
    entryPrice: 1_010_000,
    initialStopWidth: 24_000,
    previousPlanId: 8,
    plannedStop: singleStop(986_000, { raiseAtR: 2, trail50: true }),
    plannedPosition: { quantity: 8, riskBefore: 0.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[88790],
    closeReason: null,
    memo: '50일선 눌림에서 8주. 스톱은 본전으로 올렸다',
    recordCount: 1,
    filled: 8,
    stopLimit: 2.36,
    records: [
      {
        recordId: 100,
        filledAt: '2026-07-28 09:31',
        side: 'BUY',
        price: 1_011_500,
        quantity: 8,
      },
    ],
  },
  {
    planId: 11,
    title: '4주 베이스 돌파',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'DONE',
    writtenAt: '2026-08-11',
    entryPrice: 1_048_000,
    initialStopWidth: 24_000,
    previousPlanId: 10,
    plannedStop: singleStop(1_024_000, { raiseAtR: 2, trail50: true }),
    plannedPosition: { quantity: 6, riskBefore: 0.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[88790],
    closeReason: null,
    memo: '거래량 1.8배. 6주 추가',
    recordCount: 1,
    filled: 6,
    stopLimit: 2.36,
    records: [
      {
        recordId: 110,
        filledAt: '2026-08-11 09:31',
        side: 'BUY',
        price: 1_049_000,
        quantity: 6,
      },
    ],
  },
  {
    planId: 12,
    title: '신고가 눌림 추가',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'DONE',
    writtenAt: '2026-08-18',
    entryPrice: 1_082_000,
    initialStopWidth: 24_000,
    previousPlanId: 11,
    plannedStop: singleStop(1_058_000, { raiseAtR: 2, trail50: true }),
    plannedPosition: { quantity: 5, riskBefore: 0.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[88790],
    closeReason: null,
    memo: '5주. 여기서 판단을 다음 계획으로 넘겼다',
    recordCount: 1,
    filled: 5,
    stopLimit: 2.36,
    records: [
      {
        recordId: 120,
        filledAt: '2026-08-18 09:31',
        side: 'BUY',
        price: 1_083_000,
        quantity: 5,
      },
    ],
  },
  // 사슬 «중간»에서 떨어져 나간 갈래 — 세웠다가 안 가기로 한 길
  {
    planId: 13,
    title: '눌림에서 추가',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'CLOSED',
    writtenAt: '2026-08-12',
    entryPrice: 1_070_000,
    initialStopWidth: null,
    previousPlanId: 11,
    plannedStop: singleStop(1_024_000),
    plannedPosition: { quantity: 10, riskBefore: 0.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[91020],
    closeReason: '눌림이 안 와서 이 자리는 버렸다',
    memo: '',
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  },
  // 실행 중 계획 «밑»으로 떨어진 갈래 — 세웠다가 안 가기로 한 길
  {
    planId: 14,
    title: '3차 돌파 대기',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'CLOSED',
    writtenAt: '2026-08-29',
    entryPrice: 1_210_000,
    initialStopWidth: null,
    previousPlanId: 1,
    plannedStop: singleStop(1_180_000),
    plannedPosition: { quantity: 15, riskBefore: 0.9, riskAfter: 0 },
    snapshot: SNAPSHOTS[91010],
    closeReason: '거래량이 안 실려서 이 돌파는 안 따라간다',
    memo: '',
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  },
  /**
   * 실행 중 계획에서 갈라지는 대기 둘 — «하나만» 실현된다 (④-3).
   * 두 자리 중 어디가 오느냐가 다를 뿐 둘 다 «사는» 계획이다.
   *
   * ⚠️ **「매도 계획」이 없다.** 파는 일은 계획 «안»에 있다 — 스톱가격과
   *    스톱 갱신 규칙 셋이 그것이다 (`PlanSide` 주석 참고).
   */
  {
    planId: 9,
    title: '추가매수 — 2차 돌파',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'PLANNED',
    writtenAt: '2026-09-08',
    entryPrice: 1_180_000,
    initialStopWidth: null,
    previousPlanId: 1,
    plannedStop: singleStop(1_120_000, { raiseAtR: 2, trail50: true }),
    plannedPosition: { quantity: 6, riskBefore: 0.9, riskAfter: 0 },
    snapshot: SNAPSHOTS[90455],
    closeReason: null,
    memo: '1,180,000 을 거래량 실어 넘으면 6주 더. 손절은 본전 그대로 둔다',
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  },
  {
    planId: 6,
    title: '눌림 진입 — 20일선',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    status: 'PLANNED',
    writtenAt: '2026-09-07',
    entryPrice: 1_120_000,
    // 같은 실행 중 계획에서 갈라진 «다른 시나리오» — 하나만 실현된다
    previousPlanId: 1,
    initialStopWidth: null,
    plannedStop: singleStop(1_090_000, { trail50: true }),
    /**
     * ⚠️ `riskBefore` 는 **지금 포지션의 값**이라 같은 시점의 갈래끼리 «같아야»
     *    한다. 1.6 으로 박혀 있던 것을 실행 중(계획 1)의 0.9 로 맞췄다 —
     *    둘이 다르면 ④-3 의 「시나리오는 하나만 실현된다」가 화면에서 깨진다
     *    (2026-09-11, 테스트가 잡았다).
     */
    plannedPosition: { quantity: 8, riskBefore: 0.9, riskAfter: 0 },
    snapshot: SNAPSHOTS[90440],
    closeReason: null,
    memo: '20일선까지 눌리면 여기서 더 산다. 안 오면 안 산다.',
    recordCount: 0,
    stopLimit: 2.36,
    records: [],
    filled: 0,
  },
]

/**
 * 손절가 후보 선 (④-1-1-2) — **서비스가 하나를 정해 주지 않는다.**
 *
 * 진입가 «바로 아래»의 선들을 가격 내림차순으로 늘어놓는다. 어느 선이 진입가에
 * 가장 가까운지가 바로 보여야 좁은 손절폭을 고를 수 있기 때문이다.
 * 상한을 넘는 선은 «지우지 않고» 넘었다고 표시만 한다.
 *
 * **넷으로 추렸다** — 10일선 · 20일선 · 최근 베이스 저항선 · 50일선.
 *
 * ```text
 * 10일선 · 20일선     짧은 이동평균.  깨지면 판다 (쟁거 · 미너비니)
 * 최근 베이스 저항선   뚫고 올라온 선.  돌파 뒤에는 «지지»로 돌아선다
 * 50일선             훼손 판정이 보는 선이자 트레일링이 따라가는 선 (⑤-3 · ③-3)
 * ```
 *
 * ⚠️ **최종미지 ④-1-1-2 의 목록에서 둘이 빠졌다** — 21일선(쟁거)과 평균수익률 선.
 *    21일선은 20일선과 거의 겹쳐 «고를 것이 없고», 평균수익률 선은 ⑦의 통계가
 *    쌓여야 자리가 정해지는데 그건 백스톱 규칙(③-3)이 이미 들고 있다.
 *
 * ⚠️ 목이라 진입가에서 비율로 만든다. 실제로는 차트에서 온다 —
 *    이동평균선 셋은 `DailyCandle`, 저항선은 `StockBase.highestResistance` 다.
 */
function stopCandidates(s: Seed): StopCandidate[] {
  const chosen = Math.min(...s.plannedStop.bands.map((b) => b.stopPrice))
  const lines: [string, number][] = [
    ['10일선', 0.014],
    ['20일선', 0.024],
    ['최근 베이스 저항선', 0.041],
    ['50일선', 0.079],
  ]
  const out = lines.map(([label, r]) => {
    const price = Math.round(s.entryPrice * (1 - r))
    return {
      label,
      price,
      width: +(r * 100).toFixed(2),
      overLimit: r * 100 > s.stopLimit,
      chosen: false,
    }
  })

  /**
   * 고른 값이 «후보 중 하나가 아닐» 때 한 줄을 더 끼운다.
   *
   * 이름이 둘로 갈리는 이유 — ④-1-1-2 가 *「차트값이 상한을 넘으면 선을 버리고
   * 백분율로 대체한다」* 고 하기 때문이다. 그러면 그 값은 «어느 선»도 아니다.
   *
   * ```text
   * 직접 넣은 값     선이 아닌 자리를 사용자가 찍었다.  상한 안쪽
   * 스톱 하한 N%    선이 전부 상한을 넘어서 «버리고» 백분율로 계산한 자리
   * ```
   *
   * ⚠️ 이름을 「고른 값 / 상한 대체」→「상한으로 자름」(2026-09-11)
   *    →「스톱 하한 N%」(2026-09-16)로 옮겨 왔다. 「상한 대체」는 무엇이 무엇을
   *    대체했는지가 안 읽혔고, 「상한으로 자름」은 **자르지도 않았다** —
   *    스톱가격이 얼마나 아래까지 갈 수 있는지의 «하한»이라 그렇게 부른다.
   *
   * ⚠️ **숫자를 박지 않는다.** 상한은 `min(평균수익 ÷ 손익비, 10%)` 라
   *    사용자마다 다르다. 10% 는 그 둘 중 «딱딱한 쪽»일 뿐이다.
   */
  const width = +(((s.entryPrice - chosen) / s.entryPrice) * 100).toFixed(2)
  const hit = out.find((c) => c.price === chosen)
  if (hit) hit.chosen = true
  else
    out.push({
      label:
        width <= s.stopLimit ? '직접 넣은 값' : `스톱 하한 ${s.stopLimit}%`,
      price: chosen,
      width,
      overLimit: false,
      chosen: true,
    })
  return out.sort((a, b) => b.price - a.price)
}

/** 최저손절가 — 구간들에서 «골라낸다». 저장 필드가 아니다 */
const lowestStop = (s: Seed) =>
  Math.min(...s.plannedStop.bands.map((b) => b.stopPrice))

/**
 * 이 계획 «자체»가 거는 몫. 구간마다 재서 더한다.
 *
 * **부호를 안 지운다** — 손절가가 진입가 «위»면 음수다. 절댓값을 씌우면
 * 확정 이익이 위험처럼 보인다.
 */
function ownRisk(s: Seed): number {
  const qty = s.plannedPosition.quantity
  const risk = s.plannedStop.bands.reduce((sum, b) => {
    const share = Math.round((qty * b.weight) / 100)
    return sum + (s.entryPrice - b.stopPrice) * share
  }, 0)
  return (risk / ACCOUNT_TOTAL) * 100
}

/**
 * 실행 «후» 위험노출 — 지금 걸린 것 «위에» 이번 것을 얹은 값이다.
 *
 * 💀 처음엔 이 계획 몫만 계산했다. 문서의 사다리가 `1.8% → 3.2%` 로
 * 기존 위에 더한 값인데(④-1), 몫만 재니 **삼성전자 두 갈래가 2.05%·2.31% 로 떠서
 * 상한 안쪽처럼 보였다.** 실제로는 기존 1.6% 위에 얹혀 «둘 다 2.5% 를 넘긴다».
 * 화면이 상한 초과를 못 잡고 있었다.
 *
 * ⚠️ 시나리오끼리는 여전히 «안» 더한다 — 하나만 실현된다 (④-3).
 */
function riskAfter(s: Seed): number {
  // 위험노출에 음수가 없다 — 0 이 바닥이다. 화면과 «같은 규칙»이어야 한다
  return +Math.max(0, s.plannedPosition.riskBefore + ownRisk(s)).toFixed(2)
}

/** 씨앗 하나 → 파생까지 채운 계획 하나. 수정이 들어와도 «같은 식»으로 다시 만든다 */
function build(s: Seed): PlanDetail {
  const { filled, ...rest } = s
  const quantity = s.plannedPosition.quantity
  return {
    ...rest,
    accountTotal: ACCOUNT_TOTAL,
    accountCash: ACCOUNT_CASH,
    stopLimitBasis: STOP_LIMIT_BASIS,
    stopPrice: lowestStop(s),
    quantity,
    riskAfter: riskAfter(s),
    fillRate: quantity === 0 ? 0 : +(filled / quantity).toFixed(2),
    entryState: s.snapshot.entryState,
    fundamentalScore: s.snapshot.fundamentalScore,
    riskBefore: s.plannedPosition.riskBefore,
    stopCandidates: stopCandidates(s),
    plannedPosition: { ...s.plannedPosition, riskAfter: riskAfter(s) },
  }
}

export const PLANS: PlanDetail[] = SEEDS.map(build)

/**
 * 계획 하나를 «고친다» (PATCH).
 *
 * 씨앗을 고치고 **파생을 다시 만든다** — 위험노출·최저손절가·후보 선을 손으로
 * 덮어쓰면 저장 전 미리보기와 저장 후 값이 어긋난다. 어긋나면 사용자는
 * 「내가 잘못 넣었나」를 먼저 의심하게 된다.
 *
 * ⚠️ 스냅샷은 «안 고친다». 계획 시점에 동결된 값이고 사후에 못 만든다 (F4).
 */
export function patchPlan(
  planId: number,
  patch: {
    title?: string
    entryPrice?: number
    stopPrice?: number
    quantity?: number
    memo?: string
    raiseAtR?: number | null
    trail50?: boolean
    backstop?: boolean
  },
): PlanDetail | null {
  // ⚠️ `findIndex` + `SEEDS[i]` 로 꺼내면 «인덱스가 유효한지»와 «값이 있는지»가
  //    따로 놀아 `noUncheckedIndexedAccess` 가 걸린다. 값을 먼저 찾는다
  const s = SEEDS.find((x) => x.planId === planId)
  if (!s) return null
  const i = SEEDS.indexOf(s)

  const next: Seed = {
    ...s,
    title: patch.title ?? s.title,
    entryPrice: patch.entryPrice ?? s.entryPrice,
    memo: patch.memo ?? s.memo,
    plannedStop: {
      ...s.plannedStop,
      // v1 은 구간이 하나다 — 비중 100 · 순번 1 (④-1-2)
      bands:
        patch.stopPrice != null
          ? [{ order: 1, stopPrice: patch.stopPrice, weight: 100 }]
          : s.plannedStop.bands,
      raiseAtR:
        patch.raiseAtR !== undefined ? patch.raiseAtR : s.plannedStop.raiseAtR,
      trail50: patch.trail50 ?? s.plannedStop.trail50,
      backstop: patch.backstop ?? s.plannedStop.backstop,
    },
    plannedPosition: {
      ...s.plannedPosition,
      quantity: patch.quantity ?? s.plannedPosition.quantity,
    },
  }
  SEEDS[i] = next

  const built = build(next)
  const j = PLANS.findIndex((p) => p.planId === planId)
  if (j >= 0) PLANS[j] = built
  return built
}

/**
 * 계획을 «세운다» (POST · Q8).
 *
 * **서버가 찍는 것과 사용자가 넣는 것을 여기서 가른다** —
 * 계좌 값은 등록 시점 것을 얼리고(F7), 스냅샷은 `snapshotDate` 로 찾아 붙인다.
 * 사후에 못 만드는 값이라 입력으로 받지 않는다 (F4).
 *
 * ⚠️ 목에는 스냅샷이 손으로 박은 네 개뿐이라 **날짜로 못 찾으면 종목의 아무 것을
 *    쓴다.** 실제로는 `DailyScreeningResult` 조회다.
 */
export function createPlan(body: PlanCreate): PlanDetail | 'no-cash' {
  /**
   * **기록상 현금보다 큰 매수는 막는다** (④-1-3 · ⑥).
   *
   * 💀 화면만 막고 있었다. *「살 돈이 있는지를 증권사 앱에 미루지 않는다」* 인데
   * 화면은 우회할 수 있다 — 돈이 없는 것인지 기록이 낡은 것인지는 구분할 수
   * 없지만, 어느 쪽이든 그대로 저장하면 **계좌가 틀어지고 모든 종목의 위험노출이
   * 동시에 과소평가된다.** 위험노출 2.5% 초과를 경고만 하는 것과 다르다 —
   * 그건 판단의 문제고 이건 **기록이 사실과 어긋나는** 문제다 (2026-09-11).
   *
   * ⚠️ 계획마다 «따로» 잰다. 대기 계획들의 필요 현금을 합치지 않는다 —
   *    시나리오는 하나만 실현된다 (④-3).
   */
  if (body.entryPrice * body.quantity > ACCOUNT_CASH) return 'no-cash'

  const siblings = SEEDS.filter((x) => x.stockCode === body.stockCode)
  /**
   * **스냅샷은 서버가 붙인다.** 계획은 근거 날짜를 안 받는다 — 계획은 자율적으로
   * 세우고, 그 시점의 «최신 판정»이 따라 붙는다 (F4 — 사후에 못 만든다).
   *
   * ⚠️ 목의 `SNAPSHOTS` 는 종목을 안 들어서 같은 종목 계획에서 거꾸로 찾는다.
   *    실제로는 `DailyScreeningResult` 를 «종목 × 최신 일자»로 한 행 읽는다.
   */
  const latest = [...siblings].sort((a, b) =>
    b.snapshot.date.localeCompare(a.snapshot.date),
  )[0]
  const snapshot = latest?.snapshot ?? SNAPSHOTS[90124]

  const seed: Seed = {
    planId: Math.max(0, ...SEEDS.map((x) => x.planId)) + 1,
    title: body.title,
    stockCode: body.stockCode,
    // 종목명은 계획이 정하는 값이 아니다 — 같은 종목의 계획에서 받아 온다
    stockName: latest?.stockName ?? body.stockCode,
    // 세운 계획은 «대기»로 난다. 실행 중으로 만드는 것은 체결이다 (⑥)
    status: 'PLANNED',
    writtenAt: new Date().toISOString().slice(0, 10),
    entryPrice: body.entryPrice,
    // 1R 은 «실행될 때» 박힌다. 대기면 아직 없다 (③-2-1)
    initialStopWidth: null,
    previousPlanId: body.previousPlanId,
    plannedStop: singleStop(body.stopPrice, {
      raiseAtR: body.raiseAtR,
      trail50: body.trail50,
      backstop: body.backstop,
    }),
    plannedPosition: {
      quantity: body.quantity,
      // 실행 «전» 위험노출은 지금 포지션 것이다 — 같은 종목의 실행 중 계획이 든다
      riskBefore:
        SEEDS.find(
          (x) => x.stockCode === body.stockCode && x.status === 'RUNNING',
        )?.plannedPosition.riskBefore ?? 0,
      riskAfter: 0,
    },
    snapshot,
    closeReason: null,
    memo: body.memo,
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  }
  SEEDS.push(seed)
  const built = build(seed)
  PLANS.push(built)
  return built
}

/**
 * 계획을 «폐기»한다 (Q8) — 안 가기로 한 것이다.
 *
 * **삭제와 뜻이 다르고 문턱은 같다.** 행이 남고 ⑦가 폐기 비율로 «센다».
 * 사유가 필수인 것도 그래서다 — 판단에는 이유가 있다.
 *
 * ⚠️ 스냅샷은 안 건드린다. 이미 찍힌 것이다.
 */
export function closePlan(
  planId: number,
  closeReason: string,
): 'not-found' | 'conflict' | PlanDetail {
  const s = SEEDS.find((x) => x.planId === planId)
  if (!s) return 'not-found'
  // 삭제와 «같은 문턱»이다 — 체결이 붙었으면 「안 갔다」고 닫는 것이 거짓이 된다
  if (s.status !== 'PLANNED' || s.records.length > 0 || s.filled > 0)
    return 'conflict'

  const next: Seed = { ...s, status: 'CLOSED', closeReason }
  SEEDS[SEEDS.indexOf(s)] = next
  const built = build(next)
  const j = PLANS.findIndex((p) => p.planId === planId)
  if (j >= 0) PLANS[j] = built
  return built
}

/**
 * 계획을 «삭제»한다 (Q8) — 애초에 없어야 했던 것이다.
 *
 * **대기 + 체결 0건만 지운다.** 체결이 붙었으면 실제로 돈이 움직였고
 * `TradeRecord` 가 `planId` 로 그것을 가리킨다 — 없던 일이 될 수 없다.
 * 폐기한 것도 못 지운다: 그건 «판단»이라 ⑦의 재료다.
 *
 * 반환값이 세 갈래인 것은 화면이 **못 지우는 이유를 말해야** 해서다.
 */
export function deletePlan(planId: number): 'ok' | 'not-found' | 'conflict' {
  const s = SEEDS.find((x) => x.planId === planId)
  if (!s) return 'not-found'
  if (s.status !== 'PLANNED' || s.records.length > 0 || s.filled > 0)
    return 'conflict'

  SEEDS.splice(SEEDS.indexOf(s), 1)
  const j = PLANS.findIndex((p) => p.planId === planId)
  if (j >= 0) PLANS.splice(j, 1)
  return 'ok'
}

/**
 * 계획을 세울 때 «계획이 아닌 데서» 오는 값들 (2026-09-11).
 *
 * **계획이 하나도 없는 종목에서도 나온다** — 첫 계획이 여기에 기댄다.
 * 후보 선을 «마지막 종가»에서 잡는 것이 실제로도 더 맞다 — 이동평균선과
 * 저항선은 종목의 값이지 진입가의 함수가 아니다.
 */
export function planDefaults(stockCode: string, lastClose: number) {
  const running = SEEDS.find(
    (s) => s.stockCode === stockCode && s.status === 'RUNNING',
  )
  const base = lastClose > 0 ? lastClose : 100_000
  const lines: [string, number][] = [
    ['10일선', 0.014],
    ['20일선', 0.024],
    ['최근 베이스 저항선', 0.041],
    ['50일선', 0.079],
  ]
  return {
    accountTotal: ACCOUNT_TOTAL,
    accountCash: ACCOUNT_CASH,
    riskBefore: running?.plannedPosition.riskBefore ?? 0,
    stopLimit: 2.36,
    stopLimitBasis: STOP_LIMIT_BASIS,
    stopCandidates: lines.map(([label, r]) => ({
      label,
      price: Math.round(base * (1 - r)),
      width: +(r * 100).toFixed(2),
      overLimit: r * 100 > 2.36,
      chosen: false,
    })),
  }
}

/** 목록은 싱글이 가진 것 중 «줄 세우는 데 필요한 것»만 남긴 것이다. */
export const toListItem = (p: PlanDetail): PlanListItem => ({
  planId: p.planId,
  stockCode: p.stockCode,
  stockName: p.stockName,
  title: p.title,
  status: p.status,
  writtenAt: p.writtenAt,
  entryPrice: p.entryPrice,
  stopPrice: p.stopPrice,
  quantity: p.quantity,
  riskBefore: p.plannedPosition.riskBefore,
  riskAfter: p.riskAfter,
  fillRate: p.fillRate,
  recordCount: p.recordCount,
  previousPlanId: p.previousPlanId,
  entryState: p.snapshot.entryState,
  fundamentalScore: p.snapshot.fundamentalScore,
})
