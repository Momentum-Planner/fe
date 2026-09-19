// vite.config.ts 의 test.setupFiles 가 이 파일을 가리킨다.
// jest-dom 매처(toBeInTheDocument 등)를 등록하고, 테스트마다 DOM 을 정리한다.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * jsdom 에 `CSS.supports` 가 없다. Highcharts 는 «import 시점»에 그것을 부르므로
 * 폴리필이 없으면 차트를 쓰는 테스트가 모듈 로드 단계에서 통째로 죽는다.
 */
if (typeof globalThis.CSS === 'undefined')
  (globalThis as { CSS?: unknown }).CSS = {}
const css = globalThis.CSS as { supports?: (...a: string[]) => boolean }
css.supports ??= () => false

/**
 * jsdom 에 `ResizeObserver` 가 없다. 계획 사슬이 잇는 선을 «측정해서» 그리므로
 * (`PlanChain.tsx`) 폴리필이 없으면 계획 싱글을 띄우는 테스트가 죽는다.
 * 측정값은 쓰지 않으니 아무것도 안 하는 것으로 둔다.
 */
if (typeof globalThis.ResizeObserver === 'undefined')
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

afterEach(() => {
  cleanup()
})
