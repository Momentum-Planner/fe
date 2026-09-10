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
 * 앵커가 설 «자리». 0.5 면 한가운데, 0.67 이면 오른쪽에서 1/3 지점이다.
 *
 * 기본을 2/3 로 둔 이유 — 계획을 세운 근거는 «그날까지의 모양»에 있다(베이스 · 수축 ·
 * 이평선). 그것이 넓게 보여야 「왜 여기서 사려 했나」가 읽힌다. 그 뒤는 결과라
 * 3분의 1이면 충분하다.
 */
const ANCHOR_AT = 2 / 3

export function viewWindow(
  times: number[],
  anchorTime: number,
  visibleBars: number,
  anchorAt = ANCHOR_AT,
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
  if (lo < 0) lo = 0
  // 왼쪽이 모자라면 그냥 첫 봉에서 시작한다. 데이터 이전은 «없는» 것이지
  // 비어 있는 것이 아니라, 여유를 만들어 주면 거짓이 된다
  return { from: times[lo], to: times[hi], padBars }
}
