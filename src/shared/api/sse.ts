import { env } from '@/shared/config'

export interface SseSubscription {
  close: () => void
}

export interface SseOptions<T> {
  /** 수신할 SSE 이벤트 이름 (백엔드 emitter 의 event name). */
  event: string
  onMessage: (data: T) => void
  onError?: (err: Event) => void
  searchParams?: Record<string, string | number | boolean | null | undefined>
  /** apiBaseUrl 대신 realtimeBaseUrl 을 사용(실시간 전용 앱). 기본 true. */
  realtime?: boolean
}

function buildUrl(
  base: string,
  path: string,
  searchParams?: SseOptions<unknown>['searchParams'],
): string {
  let query = ''
  if (searchParams) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
    const qs = params.toString()
    if (qs) query = `?${qs}`
  }
  return `${base}${path}${query}`
}

/**
 * 타입이 지정된 SSE 구독. EventSource 는 GET + 쿠키(withCredentials)만 지원하며
 * 커스텀 헤더를 못 보내지만, 백엔드 실시간 엔드포인트는 permitAll 이라 무방하다.
 * 반환된 close() 로 리스너 해제 + 연결 종료한다.
 */
export function subscribeSse<T>(
  path: string,
  opts: SseOptions<T>,
): SseSubscription {
  const base = opts.realtime === false ? env.apiBaseUrl : env.realtimeBaseUrl
  const url = buildUrl(base, path, opts.searchParams)
  const es = new EventSource(url, { withCredentials: true })

  const handler = (e: MessageEvent<string>) => {
    try {
      opts.onMessage(JSON.parse(e.data) as T)
    } catch {
      // 파싱 불가 이벤트는 무시
    }
  }

  es.addEventListener(opts.event, handler as EventListener)
  if (opts.onError) es.onerror = opts.onError

  return {
    close: () => {
      es.removeEventListener(opts.event, handler as EventListener)
      es.close()
    },
  }
}
