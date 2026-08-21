/**
 * 백엔드 LocalDate / LocalDateTime(ISO, 타임존 없음) 파라미터용 포매터.
 * 클라이언트 로컬 벽시계 기준으로 직렬화한다.
 */
const pad = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` (LocalDate) */
export function toLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `YYYY-MM-DDTHH:mm:ss` (LocalDateTime) */
export function toLocalDateTime(date: Date = new Date()): string {
  return (
    `${toLocalDate(date)}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** n일 전 Date. */
export function daysAgo(n: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d
}
