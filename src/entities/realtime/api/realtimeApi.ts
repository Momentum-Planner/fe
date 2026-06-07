import { subscribeSse } from '@/shared/api'
import type { SseSubscription } from '@/shared/api'
import type {
  RealtimeRankingItem,
  RealtimeRegime,
  TickEvent,
} from '../model/types'

const RANKING_PATH: Record<RealtimeRegime, string> = {
  success: '/api/v1/realtime/ranking/breakout-success/subscribe',
  ready: '/api/v1/realtime/ranking/breakout-ready/subscribe',
}

export const realtimeApi = {
  /** event: ranking-update, data: RealtimeRankingItem[] */
  subscribeRanking: (
    regime: RealtimeRegime,
    onUpdate: (items: RealtimeRankingItem[]) => void,
    onError?: (e: Event) => void,
  ): SseSubscription =>
    subscribeSse<RealtimeRankingItem[]>(RANKING_PATH[regime], {
      event: 'ranking-update',
      onMessage: onUpdate,
      onError,
    }),

  /** event: tick, data: TickEvent */
  subscribeTick: (
    stockCode: string,
    onTick: (tick: TickEvent) => void,
    onError?: (e: Event) => void,
  ): SseSubscription =>
    subscribeSse<TickEvent>(`/api/v1/stocks/${stockCode}/realtime/tick`, {
      event: 'tick',
      onMessage: onTick,
      onError,
    }),
}
