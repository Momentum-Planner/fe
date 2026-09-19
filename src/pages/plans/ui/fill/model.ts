import { useSyncExternalStore } from 'react'
import type { FillStart } from './NewFillForm'

/**
 * 체결 칸이 열려 있나. 거래 계획 머리의 「+ 체결 기록」(빈 채) 과 카드의 「+ 체결」(계획이
 * 골라진 채) 이 같은 칸을 연다.  ⚠️ 상단 바로 올렸다가 되돌렸다 (Q23 · 4장 ⑦) — 스토어는 남겨 둔다.
 */
export type FillPanel = { start?: FillStart } | null

let state: FillPanel = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const openFill = (start?: FillStart) => {
  state = { start }
  emit()
}
export const closeFill = () => {
  if (state === null) return
  state = null
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useFillPanel = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
