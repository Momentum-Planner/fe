// vite.config.ts 의 test.setupFiles 가 이 파일을 가리킨다.
// jest-dom 매처(toBeInTheDocument 등)를 등록하고, 테스트마다 DOM 을 정리한다.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
