import { api } from '@/shared/api'
import type { DailyScreening } from '@/shared/lib/snapshots'

/**
 * 하루치 스크리닝 판정 목록 (⑤-2 의 `DailyScreeningResult`).
 *
 * **종목 × 일자로 쌓이는 행**을 기간으로 끊어 온다. 계획의 「근거 날짜」가
 * 이 목록에서 고르는 값이다 — ④ 가 *「스냅샷 날짜는 직전 영업일이 기본이고,
 * 사용자가 고를 수 있다. 며칠 전 판정을 보고 세운 계획이면 그 날짜를 찍어야
 * 근거가 사실과 맞는다」* 라서, **고를 수 있는 날이 무엇인지**를 화면이 알아야 한다.
 *
 * ⚠️ **백엔드에 없다.** msw 목이 유일한 구현이다 — 계획 API 와 같은 처지다.
 */
export interface ScreeningListResponse {
  results: DailyScreening[]
}

export const screeningApi = {
  /** 기간을 안 주면 목이 최근 구간을 준다 */
  getList: (stockCode: string, range?: { from?: string; to?: string }) =>
    api.get<ScreeningListResponse>(
      `/api/v1/stocks/${stockCode}/screening`,
      range ? { searchParams: { from: range.from, to: range.to } } : undefined,
    ),
}
