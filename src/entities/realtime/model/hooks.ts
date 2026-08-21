import { useEffect, useState } from 'react'
import { realtimeApi } from '../api/realtimeApi'
import type { RealtimeRankingItem, RealtimeRegime } from './types'

/**
 * 종목 실시간 체결가(tick) 구독. 최신 가격을 반환한다.
 * 백엔드 stock-realtime 이 가동/도달 가능할 때만 값이 들어온다.
 */
export function useTickPrice(
  stockCode: string | null | undefined,
  enabled = true,
): number | null {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled || !stockCode) return
    const sub = realtimeApi.subscribeTick(stockCode, (tick) =>
      setPrice(tick.currentPrice),
    )
    return () => sub.close()
  }, [stockCode, enabled])

  return price
}

/**
 * 레짐별 실시간 랭킹(ranking-update) 구독. 최신 스냅샷 배열을 반환한다.
 * 이벤트가 오기 전에는 null 이므로, 초기 데이터는 REST(useBreakoutRanking)로 채운다.
 */
export function useRankingStream(
  regime: RealtimeRegime,
  enabled = true,
): RealtimeRankingItem[] | null {
  const [items, setItems] = useState<RealtimeRankingItem[] | null>(null)

  useEffect(() => {
    if (!enabled) return
    setItems(null)
    const sub = realtimeApi.subscribeRanking(regime, setItems)
    return () => sub.close()
  }, [regime, enabled])

  return items
}
