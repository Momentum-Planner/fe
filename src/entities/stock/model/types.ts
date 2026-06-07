import type { ServerRegime } from '@/shared/lib/snapshots'

// ─────────────── 차트 (StockChartV1Dto) ───────────────

export type MovingAveragePeriod = 'MA_50' | 'MA_150' | 'MA_200'

export interface DailyCandle {
  tradeDate: string // LocalDate
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
  volume: number
}

export interface DailyCandleResponse {
  candles: DailyCandle[]
}

export interface MovingAverageItem {
  tradeDate: string
  price: number
}

export interface MovingAverageResponse {
  period: MovingAveragePeriod
  dataPoints: MovingAverageItem[]
}

export interface BaseItem {
  startDate: string
  endDate: string
  supportPrice: number
  resistancePrice: number
}

export interface BaseListResponse {
  bases: BaseItem[]
}

// ─────────────── 인사이트 (StockInsightV1Dto) ───────────────

export interface RegimeInsight {
  regime: ServerRegime
  currentPrice: number
  supportLine: number
  resistanceLine: number
  changeRateFromReferenceLine: number
}

export interface MovingAverageInsight {
  currentPrice: number
  ma50: number
  ma150: number
  ma200: number
  isAboveMa50: boolean
  isMa50AboveMa150: boolean
  isMa150AboveMa200: boolean
}

export interface BaseStageInsight {
  stageLevel: number
}

export interface MomentumInsight {
  yearAgoPrice: number
  yearAgoDate: string
  currentPrice: number
  currentDate: string
  yearlyPriceChangeRate: number
  percentileRank: number
}

export interface FrogInPanInsight {
  yearlyUpDays: number
  yearlyDownDays: number
  fipScore: number
  percentileRank: number
}

export interface VolumeInsight {
  baselineAvgVolume: number
  currentVolume: number
  volumeToBaselineRatio: number
  percentileRank: number
}

export interface RsInsight {
  rsValue: number
  percentileRank: number
}

export interface QuarterlyEpsItem {
  quarter: string
  eps: number
}

export interface EpsInsight {
  quarterlyEps: QuarterlyEpsItem[]
  changeRateYoY: number
  percentileRank: number
}

// ─────────────── 관심 종목 (StockLikeV1Dto) ───────────────

export interface LikeStockItem {
  stockCode: string
  stockName: string
}

export interface LikeStockResponse {
  stocks: LikeStockItem[]
}
