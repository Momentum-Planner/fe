/**
 * 차트가 처음 보여줄 «구간».
 *
 * 계획을 고르면 그 계획의 작성일이 정해진 자리에 서야 한다 — 왼쪽이 그날까지
 * 지나온 길, 오른쪽이 그 뒤에 실제로 어떻게 됐나.
 *
 * ⚠️ 봉 «개수»로만 잡으면 최근 계획은 가운데로 못 온다. 오른쪽에 남은 봉이 열몇
 *    개뿐이라 구간이 통째로 왼쪽으로 밀리고 앵커가 오른쪽 끝에 붙는다.
 *
 * ⚠️⚠️ 그렇다고 `max` 를 데이터 «밖»으로 주면 안 된다 — `stockChart` 의 X축은
 *    기본이 **ordinal** 이라 데이터가 있는 지점만 균등 간격으로 놓는다. 데이터가
 *    없는 시각을 범위로 주면 좌표 매핑이 깨져 **날짜 라벨이 뒤죽박죽 겹쳐 찍힌다**
 *    (「8월 10일 · 9월 14일 · 8월 24일」처럼 순서가 섞인다).
 *
 * 그래서 **범위는 데이터 안으로 두고, 모자란 오른쪽은 `overscroll` 로 늘린다.**
 * `overscroll` 은 ordinal 축이 알아서 다루는 «빈 여유»라 매핑이 안 깨진다.
 */

export type Window = {
  /** 축의 min — 항상 «데이터 안» */
  from: number
  /** 축의 max — 항상 «데이터 안» */
  to: number
  /**
   * 오른쪽에 더 필요한 «봉 수».
   *
   * ⚠️ `xAxis.overscroll` 은 **ESM 빌드에 없다**(`esm/highstock.src.js` 에 그 문자열이
   *    0회 나온다). 주든 안 주든 무시된다.
   * ⚠️ `max` 를 데이터 밖으로 늘리는 것도 안 된다 — ordinal 축은 데이터 구간에서만
   *    주말을 압축하고 빈 자리는 실제 시간대로 그려서 여유가 1.4배 과해진다.
   *
   * 그래서 **값이 빈 봉을 뒤에 붙인다.** ordinal 축은 「x 가 있는 점」을 세므로
   * 빈 봉도 한 칸을 차지하고, 값이 없으니 그려지지는 않는다.
   */
  padBars: number
}

/**
 * 앵커가 설 «자리». 1 이면 오른쪽 끝, 0.5 면 한가운데다.
 *
 * 기본이 **오른쪽 끝**인 이유 — 계획을 세울 때 사용자가 실제로 본 화면이 그것이다.
 * 그날 차트를 열면 그날이 마지막 봉이고, 오른쪽에는 아직 아무것도 없었다.
 * 뒤에 무슨 일이 있었는지를 같이 그리면 «그때는 몰랐던 것»이 판단에 섞인다.
 *
 * ⚠️ **이미 세운 계획을 «볼» 때는 2/3 에 선다** (Q12 · 2026-09-17). 계획 선을 스냅샷
 *    날짜부터 오른쪽으로 그리기로 하자(기간만), 오른쪽 끝에 서면 선이 봉 한두 칸
 *    폭으로 눌려 안 보였다. 보는 사람은 이미 «그 뒤»를 알고 있고, 계획 이후 실제로
 *    어떻게 됐는지가 선과 같이 읽혀야 계획을 고칠 수 있다. 세울 때는 여전히 1 이다.
 */
const ANCHOR_AT = 1
/** 이미 세운 계획을 볼 때 앵커 자리 */
export const VIEW_ANCHOR_AT = 2 / 3

/**
 * @param futureBars  앵커가 «마지막 봉»일 때만 오른쪽에 붙이는 빈 봉 수.
 *   새 계획은 스냅샷 날짜(≈ 오늘)부터 오른쪽으로 그려지므로(Q12 기간만) 그 자리가
 *   있어야 선과 면이 보인다. 과거 계획에는 안 붙는다 — 그 뒤에는 실제 봉이 있고,
 *   그걸 보여주면 «그때는 몰랐던 것»이 섞인다.
 */
export function viewWindow(
  times: number[],
  anchorTime: number,
  visibleBars: number,
  anchorAt = ANCHOR_AT,
  futureBars = 0,
): Window {
  if (times.length === 0)
    return { from: anchorTime, to: anchorTime + 86_400_000, padBars: 0 }

  const last = times.length - 1
  const found = times.findIndex((t) => t >= anchorTime)
  const anchor = found < 0 ? last : found
  const back = Math.round(visibleBars * anchorAt)

  let lo = anchor - back
  let hi = anchor + (visibleBars - back)

  // 오른쪽이 모자라면 그만큼 «빈 봉»을 붙인다. 축 범위는 그 빈 봉 끝까지 간다
  let padBars = 0
  if (hi > last) {
    padBars = hi - last
    hi = last
  }
  if (anchor === last) padBars = Math.max(padBars, futureBars)
  if (lo < 0) lo = 0
  // 왼쪽이 모자라면 그냥 첫 봉에서 시작한다. 데이터 이전은 «없는» 것이지
  // 비어 있는 것이 아니라, 여유를 만들어 주면 거짓이 된다
  const from = times[lo]
  const to = times[hi]
  // `lo` · `hi` 를 위에서 범위 안으로 눌렀으므로 여기 오면 둘 다 있다.
  // 그래도 «타입이 그것을 모르므로» 한 번 가른다 — 빈 배열은 위에서 이미 빠졌다
  if (from === undefined || to === undefined)
    return { from: anchor, to: anchor, padBars: 0 }
  return { from, to, padBars }
}
