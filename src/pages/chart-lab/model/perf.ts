/**
 * SVG/Canvas 차이를 감이 아니라 숫자로 재기 위한 계측.
 * 결정 기록 규칙 — 스크린샷 대신 숫자.
 */
export type Perf = {
  bars: number
  renderMs: number
  domNodes: number
  svgNodes: number
}

/** 컨테이너 안의 DOM 노드 수. Canvas 는 <canvas> 몇 장, SVG 는 캔들 수만큼 늘어난다. */
export function countNodes(
  el: HTMLElement,
): Pick<Perf, 'domNodes' | 'svgNodes'> {
  return {
    domNodes: el.querySelectorAll('*').length,
    svgNodes: el.querySelectorAll('svg *').length,
  }
}

/** 다음 페인트까지를 한 번의 렌더로 본다. */
export function measure(
  el: HTMLElement,
  draw: () => void,
  done: (p: Omit<Perf, 'bars'>) => void,
) {
  const t0 = performance.now()
  draw()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      done({ renderMs: performance.now() - t0, ...countNodes(el) })
    })
  })
}
