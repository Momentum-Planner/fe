/**
 * 차트가 처음 보여줄 «구간».
 *
 * 계획을 고르면 그 계획의 작성일이 **한가운데**에 서야 한다 — 왼쪽이 그날까지
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

/** 한 봉의 폭 — 최근 스무 봉의 평균 간격. 주말이 끼어 있어 하루로 고정하면 좁아진다 */
function stepOf(times: number[]): number {
  const last = times.length - 1
  if (last < 1) return 86_400_000
  const span = Math.min(20, last)
  return (times[last] - times[last - span]) / span || 86_400_000
}

export type Window = {
  /** 축의 min — 항상 «데이터 안» */
  from: number
  /** 축의 max — 항상 «데이터 안» */
  to: number
  /** 오른쪽에 더 필요한 여유 (축 단위 ms). 0 이면 안 준다 */
  overscroll: number
}

export function viewWindow(
  times: number[],
  anchorTime: number,
  visibleBars: number,
): Window {
  if (times.length === 0)
    return { from: anchorTime, to: anchorTime + 86_400_000, overscroll: 0 }

  const last = times.length - 1
  const found = times.findIndex((t) => t >= anchorTime)
  const anchor = found < 0 ? last : found
  const half = Math.round(visibleBars * 0.5)
  const step = stepOf(times)

  let lo = anchor - half
  let hi = anchor + (visibleBars - half)

  // 오른쪽이 모자라면 «빈 여유»로 채운다 — 축 범위는 안 넘긴다
  let overscroll = 0
  if (hi > last) {
    overscroll = (hi - last) * step
    hi = last
  }
  // 왼쪽이 모자라면 그냥 첫 봉에서 시작한다. 데이터 이전은 «없는» 것이지
  // 비어 있는 것이 아니라, 여유를 만들어 주면 거짓이 된다
  if (lo < 0) lo = 0

  return { from: times[lo], to: times[hi], overscroll }
}
