import { api } from '@/shared/api'
import { toLocalDateTime } from '@/shared/lib/datetime'
import type {
  BaseStageInsight,
  EpsInsight,
  FrogInPanInsight,
  MomentumInsight,
  MovingAverageInsight,
  RegimeInsight,
  RsInsight,
  VolumeInsight,
} from '../model/types'

/** 모든 인사이트는 `at`(LocalDateTime) 시점 기준. 기본은 현재 시각. */
function insight<T>(stockCode: string, kind: string, at?: string) {
  return api.get<T>(`/api/v1/stocks/${stockCode}/insight/${kind}`, {
    searchParams: { at: at ?? toLocalDateTime() },
  })
}

export const insightApi = {
  baseStage: (code: string, at?: string) =>
    insight<BaseStageInsight | null>(code, 'base-stage', at),
  regime: (code: string, at?: string) =>
    insight<RegimeInsight>(code, 'regime', at),
  movingAverage: (code: string, at?: string) =>
    insight<MovingAverageInsight>(code, 'moving-average', at),
  momentum: (code: string, at?: string) =>
    insight<MomentumInsight>(code, 'momentum', at),
  volume: (code: string, at?: string) =>
    insight<VolumeInsight>(code, 'volume', at),
  fip: (code: string, at?: string) =>
    insight<FrogInPanInsight>(code, 'fip', at),
  rs: (code: string, at?: string) => insight<RsInsight>(code, 'rs', at),
  eps: (code: string, at?: string) => insight<EpsInsight>(code, 'eps', at),
}
