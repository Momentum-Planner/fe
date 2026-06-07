import { env } from '@/shared/config'
import { getAccessToken, setAccessToken } from './tokenStore'

/** 백엔드 공통 응답 래퍼 (ApiResponse<T>). */
export type ApiResult = 'SUCCESS' | 'FAIL'

export interface ApiMeta {
  result: ApiResult
  errorCode: string | null
  message: string | null
}

export interface ApiResponse<T> {
  meta: ApiMeta
  data: T
}

/** API 호출 실패. HTTP 상태 + 백엔드 errorCode 를 함께 들고 있다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─────────────────────────── 401 자동 refresh ───────────────────────────
// entities/auth 가 refresh 구현을 주입한다(레이어 역전 방지). 동시에 여러 요청이
// 401 을 받아도 refresh 는 한 번만 수행하도록 single-flight 로 묶는다.
type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null
let inFlightRefresh: Promise<string | null> | null = null

export function setRefreshHandler(fn: RefreshHandler | null): void {
  refreshHandler = fn
}

function runRefresh(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null)
  if (!inFlightRefresh) {
    inFlightRefresh = refreshHandler().finally(() => {
      inFlightRefresh = null
    })
  }
  return inFlightRefresh
}

// ─────────────────────────── CSRF ───────────────────────────
const CSRF_COOKIE = 'csrfToken'
const CSRF_HEADER = 'X-CSRF-Token'
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name + '=([^;]*)'),
  )
  return match ? decodeURIComponent(match[1]) : null
}

// ─────────────────────────── 요청 ───────────────────────────
export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: string
  body?: unknown
  searchParams?: Record<string, QueryValue>
  signal?: AbortSignal
  /** refresh/login 등 자체 호출에서 401 재시도를 끄기 위한 플래그. */
  skipAuthRefresh?: boolean
  /** 내부 재시도 표시(외부에서 사용 금지). */
  _retried?: boolean
}

function buildUrl(
  path: string,
  searchParams?: RequestOptions['searchParams'],
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
  return `${env.apiBaseUrl}${path}${query}`
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text()
  // 서버 응답이 항상 ApiResponse 형태라는 보장이 없으므로 Partial 로 받아 방어한다.
  let json: Partial<ApiResponse<unknown>> | null = null
  if (text) {
    try {
      json = JSON.parse(text) as Partial<ApiResponse<unknown>>
    } catch {
      // JSON 이 아닌 응답 (예외 케이스)
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.meta?.errorCode ?? null,
      json?.meta?.message ?? (res.statusText || '요청에 실패했습니다.'),
    )
  }

  if (json && json.meta) {
    if (json.meta.result === 'FAIL') {
      throw new ApiError(
        res.status,
        json.meta.errorCode,
        json.meta.message ?? '요청에 실패했습니다.',
      )
    }
    return json.data as T
  }

  // ApiResponse 래퍼가 아니거나 빈 바디
  return (json as T) ?? (undefined as T)
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = (opts.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = { Accept: 'application/json' }

  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  if (UNSAFE_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE)
    if (csrf) headers[CSRF_HEADER] = csrf
  }

  const res = await fetch(buildUrl(path, opts.searchParams), {
    method,
    headers,
    body,
    credentials: 'include',
    signal: opts.signal,
  })

  // accessToken 만료(401) → refresh 후 1회 재시도
  if (res.status === 401 && !opts.skipAuthRefresh && !opts._retried) {
    const newToken = await runRefresh()
    if (newToken) {
      setAccessToken(newToken)
      return request<T>(path, { ...opts, _retried: true })
    }
  }

  return parse<T>(res)
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
