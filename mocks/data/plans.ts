import type {
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
 */
const STOP_LIMIT_BASIS = { avgWin: 4.72, targetRR: 2 }

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
  90201: {
    dailyScreeningResultId: 90201,
    date: '2026-09-01',
    entryState: 'EARLY',
    fundamentalScore: 2,
    damageScore: 1,
    entryPosition: -6.4,
    regime: 'none',
    damageAt: '2026-09-01 11:48',
    trendPassed: 6,
    trendFailed: ['200일선 상승', 'RS 70 이상'],
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
  // ── SK하이닉스 사슬 ──  7 ✕폐쇄   8 실행완료 ──→ 1 실행중 ──┬─→ 6 매도(실행 전)
  {
    planId: 7,
    title: '1차 베이스 돌파',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    side: 'BUY',
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
    side: 'BUY',
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
    side: 'BUY',
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
    side: 'BUY',
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
    side: 'BUY',
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
    side: 'BUY',
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
    side: 'BUY',
    status: 'CLOSED',
    writtenAt: '2026-09-01',
    entryPrice: 92_000,
    previousPlanId: null,
    initialStopWidth: null,
    plannedStop: singleStop(86_500),
    plannedPosition: { quantity: 180, riskBefore: 2.2, riskAfter: 0 },
    snapshot: SNAPSHOTS[90201],
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
    side: 'BUY',
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
    side: 'BUY',
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
    side: 'BUY',
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
    title: '분할 익절 시도',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    side: 'SELL',
    status: 'CLOSED',
    writtenAt: '2026-08-12',
    entryPrice: 1_070_000,
    initialStopWidth: null,
    previousPlanId: 11,
    plannedStop: singleStop(1_024_000),
    plannedPosition: { quantity: 10, riskBefore: 0.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[88790],
    closeReason: '추세가 안 꺾여서 안 팔기로 했다',
    memo: '',
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  },
  // 실행 중 계획 «밑»으로 떨어진 갈래 — 세웠다가 안 가기로 한 길
  {
    planId: 14,
    title: '손절 앞당기기',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    side: 'SELL',
    status: 'CLOSED',
    writtenAt: '2026-08-29',
    entryPrice: 1_100_000,
    initialStopWidth: null,
    previousPlanId: 1,
    plannedStop: singleStop(1_120_000),
    plannedPosition: { quantity: 15, riskBefore: 0.9, riskAfter: 0 },
    snapshot: SNAPSHOTS[90455],
    closeReason: '스톱을 본전으로 올려서 이 계획이 필요 없어졌다',
    memo: '',
    recordCount: 0,
    filled: 0,
    stopLimit: 2.36,
    records: [],
  },
  // 실행 중 계획에서 갈라지는 대기 둘 — «하나만» 실현된다 (④-3).
  // 하나는 더 사는 길, 하나는 절반 파는 길이라 둘 다 열어 두고 장을 본다
  {
    planId: 9,
    title: '추가매수 — 2차 돌파',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    side: 'BUY',
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
  // 매도 계획. 매수와 «같은 구조»이고 실행 중이 없다 — 체결이 붙으면 바로 완료다
  {
    planId: 6,
    title: '절반 익절',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    side: 'SELL',
    status: 'PLANNED',
    writtenAt: '2026-09-07',
    entryPrice: 1_260_000,
    // 실행 중 계획이 든 물량을 파는 계획이다 — 사슬의 갈래
    previousPlanId: 1,
    initialStopWidth: null,
    plannedStop: singleStop(1_120_000, { trail50: true }),
    plannedPosition: { quantity: 8, riskBefore: 1.6, riskAfter: 0 },
    snapshot: SNAPSHOTS[90440],
    closeReason: null,
    memo: '절반 익절. 나머지는 트레일링에 맡긴다.',
    recordCount: 0,
    stopLimit: 2.36,
    records: [],
    filled: 0,
  },
]

/**
 * 손절가 후보 선 (④-1-1-2) — **서비스가 하나를 정해 주지 않는다.**
 *
 * 진입가 «바로 아래»의 선들을 가격 오름차순으로 늘어놓는다. 어느 선이 진입가에
 * 가장 가까운지가 바로 보여야 좁은 손절폭을 고를 수 있기 때문이다.
 * 상한을 넘는 선은 «지우지 않고» 넘었다고 표시만 한다.
 */
function stopCandidates(s: Seed): StopCandidate[] {
  const chosen = Math.min(...s.plannedStop.bands.map((b) => b.stopPrice))
  // 목이라 진입가에서 비율로 만든다. 실제로는 차트에서 온다
  const lines: [string, number][] = [
    ['21일선', 0.018],
    ['20일선', 0.024],
    ['베이스 하단', 0.06],
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
  // 실제로 고른 선을 끼워 넣는다 — 상한에 걸려 백분율로 «대체»된 경우도 있다
  const width = +(((s.entryPrice - chosen) / s.entryPrice) * 100).toFixed(2)
  const hit = out.find((c) => c.price === chosen)
  if (hit) hit.chosen = true
  else
    out.push({
      label: width <= s.stopLimit ? '고른 값' : '상한 대체',
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
  return +(s.plannedPosition.riskBefore + ownRisk(s)).toFixed(2)
}

export const PLANS: PlanDetail[] = SEEDS.map((s) => {
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
})

/** 목록은 싱글이 가진 것 중 «줄 세우는 데 필요한 것»만 남긴 것이다. */
export const toListItem = (p: PlanDetail): PlanListItem => ({
  planId: p.planId,
  stockCode: p.stockCode,
  stockName: p.stockName,
  title: p.title,
  side: p.side,
  status: p.status,
  writtenAt: p.writtenAt,
  entryPrice: p.entryPrice,
  stopPrice: p.stopPrice,
  quantity: p.quantity,
  riskBefore: p.plannedPosition.riskBefore,
  riskAfter: p.riskAfter,
  fillRate: p.fillRate,
  previousPlanId: p.previousPlanId,
  entryState: p.snapshot.entryState,
  fundamentalScore: p.snapshot.fundamentalScore,
})
