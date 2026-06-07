import { useSyncExternalStore } from 'react'

/**
 * Tiny shared watchlist (관심 종목) store. Lets the stock-detail bookmark button
 * and the sidebar list read/update the same data without a provider. Replace the
 * in-memory array with API calls when a backend exists.
 */

export type WatchItem = { name: string; date: string }

let items: WatchItem[] = [
  { name: 'SK하이닉스', date: '26.04.01' },
  { name: '삼성전자', date: '26.03.21' },
  { name: 'NAVER', date: '26.02.10' },
  { name: '카카오', date: '26.01.05' },
]

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function todayLabel(): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export function addWatch(name: string) {
  if (items.some((i) => i.name === name)) return
  items = [{ name, date: todayLabel() }, ...items]
  emit()
}

export function removeWatch(name: string) {
  items = items.filter((i) => i.name !== name)
  emit()
}

export function toggleWatch(name: string) {
  if (items.some((i) => i.name === name)) removeWatch(name)
  else addWatch(name)
}

export function useWatchlist(): WatchItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
    () => items,
  )
}
