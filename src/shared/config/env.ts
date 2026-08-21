/**
 * 런타임 환경설정. API 베이스 URL 은 비워두면 same-origin(`/api/...`)으로
 * 동작하며, dev 에서는 Vite proxy 가 8080(stock-api)으로 포워딩한다.
 * 운영/스테이징은 `.env` 의 `VITE_API_BASE_URL` 로 절대 URL 을 지정한다.
 */
export const env = {
  /** 예: '' (proxy) 또는 'https://api.momentum.app' */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  /**
   * 실시간(SSE) 베이스 URL. stock-realtime 은 stock-api 와 다른 앱/포트일 수 있고
   * tick 경로(`/api/v1/stocks/{code}/realtime/tick`)가 stock-api 네임스페이스와
   * 겹쳐 단순 proxy 분기가 어렵다. 별도 포트로 띄울 경우 절대 URL 을 지정한다.
   * 비우면 apiBaseUrl(=proxy)과 동일하게 동작한다.
   */
  realtimeBaseUrl:
    import.meta.env.VITE_REALTIME_BASE_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    '',
} as const
