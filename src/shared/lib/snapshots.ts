export type Regime = 'start' | 'prep' | 'fail' | 'drop' | 'none'

/**
 * 진입 상태 (②) — 살 수 있는 셋과 못 사는 하나.
 * ⚠️ 진입 불가의 «사유 넷»은 아직 안 실렸다 (「눌림 생성 실패」 등).
 */
export type EntryState = 'EARLY' | 'BREAKOUT' | 'PULLBACK' | 'BLOCKED'

/**
 * 하루치 스크리닝 판정 — `DailyScreeningResult` 한 행 (⑤-2).
 *
 * **종목 × 일자로 쌓인다. 덮어쓰지 않는다.** 그래서 계획이 이 행을
 * `dailyScreeningResultId` 로 «참조»할 수 있다 — 복사하지 않아도 그날 값이
 * 나중에 안 변한다 (F4).
 *
 * ⚠️ 여기 두는 이유 — 이 행은 **종목 축**(전 사용자 공용)인데 계획도 종목도 쓴다.
 *    FSD 에서 같은 층의 슬라이스끼리는 서로 못 부르므로 `shared` 가 제자리다.
 *    `Regime` 이 이미 같은 이유로 여기 있다.
 */
export interface DailyScreening {
  dailyScreeningResultId: number
  /** 판정이 난 날 (LocalDate) */
  date: string
  entryState: EntryState
  /** 펀더멘털 점수 0~7 (①-2) */
  fundamentalScore: number
  /** 훼손 점수 0~2. ⚠️ 이 값만 «장중 실시간»으로 찍힌다 (⑤-3) */
  damageScore: number
  /** 그 훼손 점수를 찍은 시각. 날짜가 다른 값에만 날짜를 붙인다 */
  damageAt: string
  /** 진입 위치 % — 피봇 대비 */
  entryPosition: number
  regime: Regime
  /** 트렌드 템플릿 8조건 중 통과 개수 */
  trendPassed: number
  /** 어긋난 조건의 «이름». 정상(8/8)이면 빈 배열이라 한 줄로 끝난다 */
  trendFailed: string[]
  /**
   * 트렌드 템플릿의 **원값** (Q12). 요약(`trendPassed`)은 볼 이유가 없었고,
   * 볼 이유는 그 요약을 만든 값에 있다.
   *
   * ⚠️ 백엔드 `DailyScreeningResult` 가 이 값을 쌓는지 아직 모른다 —
   *    안 쌓으면 그날 값은 사후에 못 되살린다 (F4).
   */
  trend: TrendRaw
  /** 펀더멘털의 **원값** — 점수(0~7) 대신 세 분기 증가율 (Q12) */
  fundamentals: FundamentalsRaw
}

/** 트렌드 템플릿 8조건이 재는 원값. 1·2·4 는 선의 순서, 3 은 기울기, 5·6·7 은 숫자다 */
export interface TrendRaw {
  close: number
  ma50: number
  ma150: number
  ma200: number
  /** 200일선이 몇 달째 오르고 있나 (조건 3) */
  ma200RisingMonths: number
  /** 52주 저점 대비 % (조건 5) */
  fromLow52: number
  /** 52주 고점 대비 % — 고점 아래면 음수 (조건 6) */
  fromHigh52: number
  /** RS 백분위 (조건 7) */
  rs: number
  /** RS 추세가 몇 주째 오르고 있나. 내리고 있으면 음수 */
  rsTrendWeeks: number
}

/** 한 분기 — 전년 같은 분기 대비 증가율 % */
export interface FundamentalQuarter {
  /** 예: 26.1Q */
  label: string
  epsGrowth: number
  revenueGrowth: number
  /** 마진율 % */
  margin: number
}

export interface FundamentalsRaw {
  /** 이 값의 근거 공시일 (LocalDate). 잠정 실적은 안 쓴다 (④-0) */
  disclosedAt: string
  /** 오래된 것 → 최근. 세 분기 관측 창 (①-2) */
  quarters: FundamentalQuarter[]
}
/**
 * 트렌드 템플릿 8조건 (①-1 게이트). **이름이 여기 있는 이유** — 스크리닝 목이
 * 들고 있던 배열인데 ⑦ 의 「트렌드 8조건 표」가 같은 이름을 세로로 훑는다.
 * 종목 축의 값이고 두 슬라이스가 같이 쓰므로 `shared` 가 제자리다.
 *
 * ⚠️ **순서가 의미다** — `trendFailed` 에 담기는 문자열이 이 배열의 원소다.
 */
export const TREND_CONDITIONS = [
  '150·200일선 위',
  '150일선 > 200일선',
  '200일선 상승',
  '50일선 > 150·200일선',
  '52주 저점 +25%',
  '52주 고점 −25% 이내',
  'RS 70 이상',
  '진입 가능 · 50일선 위',
] as const

export type Judgment = 'buy' | 'sell' | 'hold'

export const REGIME_LABEL: Record<Regime, string> = {
  start: '돌파성공',
  prep: '돌파준비',
  fail: '돌파실패',
  drop: '하방이탈',
  none: '방향미정',
}

/** 진입 상태 (②) — 조기 / 돌파 / 눌림 + 진입 불가. 두 페이지가 같이 쓴다 */
export const ENTRY_STATE_LABEL: Record<EntryState, string> = {
  EARLY: '조기',
  BREAKOUT: '돌파',
  PULLBACK: '눌림',
  BLOCKED: '진입 불가',
}

/**
 * **진입 관문** — 레짐과 진입 상태를 «한 뱃지»로 섞은 것 (2026-09-16).
 *
 * ```text
 * 진입 가능:조기        진입 불가:돌파실패
 * 진입 가능:돌파        진입 불가:하방이탈
 * 진입 가능:눌림        진입 불가:방향미정
 * ```
 *
 * 💀 뱃지 둘을 나란히 뒀었다 — 「돌파성공」(레짐) 옆에 「돌파」(진입 상태).
 *    **겹치는 것은 단어가 아니라 축이었다.** 같은 말이 두 번 나오면 하나가
 *    다른 하나의 줄임말로 읽히고, 뱃지가 둘이면 서로 중심점을 깎는다 (교재 4장).
 *
 * 섞으면 **읽는 순서가 판단 순서와 같아진다** — 「살 수 있나」가 먼저 오고
 * 「어떤 진입인가 / 왜 못 사나」가 뒤에 온다.
 *
 * ⚠️ **색은 축을 «하나»만 진다** — 가능이냐 아니냐. 여섯 가지에 여섯 색을
 *    주면 색 자체가 외워야 할 것이 된다. 세부는 «글자»가 진다
 *    (교재 9장 — 데이터 차원 하나마다 시각 변수 하나).
 *
 * ⚠️ 지금은 «화면에서» 섞는다. 백엔드가 한 필드로 내려 주면 이 함수가 그 값을
 *    그대로 받는 자리가 된다.
 * ⚠️ 진입 가능일 때 **레짐이 화면에서 빠진다.** 못 살 때만 사유로 나온다.
 */
/** 관문 여섯의 그림 이름 — 가능 셋은 진입 상태, 불가 셋은 레짐에서 온다 */
export type GateGlyph =
  | 'EARLY'
  | 'BREAKOUT'
  | 'PULLBACK'
  | 'fail'
  | 'drop'
  | 'none'

export interface EntryGate {
  ok: boolean
  glyph: GateGlyph
  /** 「진입 가능」 · 「진입 불가」 */
  head: string
  /** 살 수 있으면 어떤 진입인지, 못 사면 왜 못 사는지 */
  detail: string
}

export const entryGate = (entryState: EntryState, regime: Regime): EntryGate =>
  entryState === 'BLOCKED'
    ? {
        ok: false,
        // 불가인데 레짐이 돌파성공 · 준비면 이유가 레짐에 없다 — 방향미정으로 그린다
        glyph: regime === 'fail' || regime === 'drop' ? regime : 'none',
        head: '진입 불가',
        detail: REGIME_LABEL[regime],
      }
    : {
        ok: true,
        glyph: entryState,
        head: '진입 가능',
        detail: ENTRY_STATE_LABEL[entryState],
      }

/** 관문 뱃지 색 — 가능은 이 앱의 «상승» 빨강, 불가는 죽인다 */
export const GATE_COLOR = {
  ok: '#FF3636',
  no: 'rgba(255,255,255,0.65)',
} as const

export const GATE_BG = {
  ok: 'linear-gradient(180deg, rgba(255,54,54,0.22), rgba(255,54,124,0.14))',
  no: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
} as const

export const JUDGMENT_LABEL: Record<Judgment, string> = {
  buy: '매수',
  sell: '매도',
  hold: '관망',
}

export const REGIMES: Regime[] = ['start', 'prep', 'fail', 'drop', 'none']
export const JUDGMENTS: Judgment[] = ['buy', 'sell', 'hold']

// ─────────────── 백엔드 enum ↔ FE 키 매핑 ───────────────
// 백엔드: StockRegime / SnapshotJudgment (com.momentum.domain)

export type ServerRegime =
  | 'BREAKOUT_SUCCESS'
  | 'BREAKOUT_READY'
  | 'BREAKOUT_FAILED'
  | 'DOWNSIDE_BREAK'
  | 'DIRECTION_UNDETERMINED'
  | 'UNKNOWN'

export type ServerJudgment = 'BUY' | 'SELL' | 'WATCH'

const REGIME_FROM_SERVER: Record<ServerRegime, Regime> = {
  BREAKOUT_SUCCESS: 'start',
  BREAKOUT_READY: 'prep',
  BREAKOUT_FAILED: 'fail',
  DOWNSIDE_BREAK: 'drop',
  DIRECTION_UNDETERMINED: 'none',
  UNKNOWN: 'none',
}

const REGIME_TO_SERVER: Record<Regime, ServerRegime> = {
  start: 'BREAKOUT_SUCCESS',
  prep: 'BREAKOUT_READY',
  fail: 'BREAKOUT_FAILED',
  drop: 'DOWNSIDE_BREAK',
  none: 'DIRECTION_UNDETERMINED',
}

const JUDGMENT_FROM_SERVER: Record<ServerJudgment, Judgment> = {
  BUY: 'buy',
  SELL: 'sell',
  WATCH: 'hold',
}

const JUDGMENT_TO_SERVER: Record<Judgment, ServerJudgment> = {
  buy: 'BUY',
  sell: 'SELL',
  hold: 'WATCH',
}

export const fromServerRegime = (r: ServerRegime): Regime =>
  REGIME_FROM_SERVER[r]
export const toServerRegime = (r: Regime): ServerRegime => REGIME_TO_SERVER[r]
export const fromServerJudgment = (j: ServerJudgment): Judgment =>
  JUDGMENT_FROM_SERVER[j]
export const toServerJudgment = (j: Judgment): ServerJudgment =>
  JUDGMENT_TO_SERVER[j]

/** Regime pill text/border color. */
export const REGIME_COLOR: Record<Regime, string> = {
  start: '#FF3636',
  prep: '#F46B1A',
  fail: '#34ADE4',
  drop: '#7B6CFF',
  none: 'rgba(255,255,255,0.7)',
}

/** Regime pill gradient background. */
export const REGIME_BG: Record<Regime, string> = {
  start: 'linear-gradient(180deg, rgba(255,54,54,0.22), rgba(255,54,124,0.14))',
  prep: 'linear-gradient(180deg, rgba(244,107,26,0.22), rgba(255,160,80,0.14))',
  fail: 'linear-gradient(180deg, rgba(52,173,228,0.22), rgba(54,108,255,0.14))',
  drop: 'linear-gradient(180deg, rgba(123,108,255,0.22), rgba(180,108,255,0.14))',
  none: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
}

/** Judgment pill (매수/매도/관망) — traffic-light colors. */
export const JUDGMENT_STYLE: Record<
  Judgment,
  { text: string; bg: string; border: string }
> = {
  buy: { text: '#FF6678', bg: 'rgba(255,54,54,0.15)', border: '#FF3636' },
  sell: { text: '#34ADE4', bg: 'rgba(52,173,228,0.15)', border: '#34ADE4' },
  hold: {
    text: 'rgba(255,255,255,0.7)',
    bg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.35)',
  },
}

export type Snapshot = {
  stock: string
  regime: Regime
  judgment: Judgment
  date: string
  price: string
  memo: string
}

/** Dummy snapshot records (shared by 내 스냅샷 목록 + 종목 상세 지난 스냅샷). */
export const allSnapshots: Snapshot[] = [
  {
    stock: 'SK하이닉스',
    regime: 'start',
    judgment: 'buy',
    date: '2026.03.12. 13:00',
    price: '₩1,100,000',
    memo: '베이스 돌파를 거래량 동반으로 확인하고 분할 매수 시작. 추세 초입으로 판단.',
  },
  {
    stock: '삼성전자',
    regime: 'fail',
    judgment: 'sell',
    date: '2026.03.12. 14:30',
    price: '₩78,400',
    memo: '저항선 돌파 실패에 거래량도 부족. 비중 줄여 리스크 관리했음.',
  },
  {
    stock: '현대자동차',
    regime: 'prep',
    judgment: 'hold',
    date: '2026.03.12. 15:01',
    price: '₩221,500',
    memo: '박스권 상단 눌림목 구간. 돌파 확인 전까지는 관망 유지.',
  },
  {
    stock: 'SK하이닉스',
    regime: 'start',
    judgment: 'buy',
    date: '2026.02.20. 10:14',
    price: '₩980,000',
    memo: '눌림 후 재차 베이스 상단 안착. 모멘텀 살아있어 추가 매수.',
  },
  {
    stock: 'LG화학',
    regime: 'drop',
    judgment: 'sell',
    date: '2026.02.14. 09:42',
    price: '₩342,000',
    memo: '지지선 이탈로 손절 라인 터치. 추세 훼손 판단해 비중 축소.',
  },
  {
    stock: '삼성생명',
    regime: 'none',
    judgment: 'hold',
    date: '2026.01.28. 11:20',
    price: '₩94,200',
    memo: '방향성 불분명한 횡보 구간. 추세 확인될 때까지 대기.',
  },
  {
    stock: '현대자동차',
    regime: 'start',
    judgment: 'buy',
    date: '2026.01.15. 14:55',
    price: '₩228,000',
    memo: '저항 돌파 후 지지로 전환되는 흐름 확인. 초기 진입.',
  },
  {
    stock: '삼성전자',
    regime: 'fail',
    judgment: 'sell',
    date: '2026.01.08. 13:45',
    price: '₩81,200',
    memo: '돌파 시도 무산되며 윗꼬리 길게 발생. 단기 차익 실현.',
  },
  {
    stock: 'LG화학',
    regime: 'prep',
    judgment: 'hold',
    date: '2025.12.22. 10:30',
    price: '₩365,500',
    memo: '베이스 다지는 중, 거래량 수축 관찰. 돌파 신호 기다리는 중.',
  },
  {
    stock: 'SK하이닉스',
    regime: 'fail',
    judgment: 'sell',
    date: '2025.12.21. 14:00',
    price: '₩870,000',
    memo: '전고점 저항에서 막힘. 단기 과열 부담으로 일부 정리.',
  },
  {
    stock: 'SK하이닉스',
    regime: 'prep',
    judgment: 'hold',
    date: '2025.11.15. 10:30',
    price: '₩812,000',
    memo: '베이스 형성 초기 단계. 방향 확인 위해 관망 유지.',
  },
]

export const snapshotsByStock = (stock: string): Snapshot[] =>
  allSnapshots.filter((s) => s.stock === stock)
