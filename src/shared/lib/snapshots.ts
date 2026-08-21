export type Regime = 'start' | 'prep' | 'fail' | 'drop' | 'none'
export type Judgment = 'buy' | 'sell' | 'hold'

export const REGIME_LABEL: Record<Regime, string> = {
  start: '돌파성공',
  prep: '돌파준비',
  fail: '돌파실패',
  drop: '하방이탈',
  none: '방향미정',
}

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
