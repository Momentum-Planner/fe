/**
 * 배열에서 «비어 있을 리 없는» 자리를 꺼낸다.
 *
 * `noUncheckedIndexedAccess` 를 켜면 `arr[i]` 가 `T | undefined` 가 된다 — 맞는
 * 말이다. 다만 목의 캔들처럼 **생성기가 늘 채우는** 자리나 테스트의 「첫 번째
 * 결과」까지 매번 분기하면 읽을 수가 없어진다.
 *
 * 그래서 **분기 대신 터지게** 한다. `!` 와 다른 점이 그것이다 —
 * `!` 는 가정이 깨져도 `undefined` 가 조용히 흘러가 엉뚱한 데서 터지지만,
 * 이것은 **가정이 깨진 그 자리에서** 멈춘다. 테스트라면 그 자리가 곧 실패 지점이다.
 *
 * ⚠️ **목과 테스트에서만 쓴다.** 화면 코드는 「없을 수 있다」를 실제로 다뤄야 한다 —
 *    사용자에게 예외를 던지는 것은 답이 아니다.
 */
export function at<T>(arr: readonly T[], i: number): T {
  const v = arr.at(i)
  if (v === undefined)
    throw new Error(
      `배열이 비었거나 범위 밖이다 — index ${i}, length ${arr.length}`,
    )
  return v
}
