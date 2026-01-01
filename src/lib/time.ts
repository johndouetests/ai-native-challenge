const LOCALE = 'en-US'
const MINUTE = 60_000
const HOUR = 60 * MINUTE

const monthDay = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' })
const monthDayYear = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' })
const weekdayMonthDay = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' })
const fullDate = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full', timeStyle: 'short' })
const clock = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' })

/** API timestamps are UTC ISO-8601 strings; Date keeps the instant, formatting uses the local zone. */
export function parseIso(iso: string): Date {
  return new Date(iso)
}

function parseTimestamp(iso: string): Date {
  return new Date(iso.slice(0, 19))
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Whole local calendar days between two instants (0 = same day, 1 = yesterday). */
export function localDayDiff(date: Date, now: Date): number {
  return Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / (24 * HOUR))
}

/**
 * "just now" (< 1 min), "5m ago", "3h ago" (same local day), "Yesterday" (previous local day),
 * then "Mar 4" (with the year when it differs from the current one).
 */
export function formatRelative(iso: string, nowMs: number): string {
  const date = parseIso(iso)
  const now = new Date(nowMs)
  const diff = nowMs - date.getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  const days = localDayDiff(date, now)
  if (days <= 0) return `${Math.floor(diff / HOUR)}h ago`
  if (days === 1) return 'Yesterday'
  return date.getFullYear() === now.getFullYear() ? monthDay.format(date) : monthDayYear.format(date)
}

/** Day separator in the thread: "Today", "Yesterday", "Mon, Mar 4". */
export function formatDayLabel(iso: string, nowMs: number): string {
  const date = parseTimestamp(iso)
  const days = localDayDiff(date, new Date(nowMs))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return weekdayMonthDay.format(date)
}

/** Local calendar day key used to group messages. */
export function dayKey(iso: string): string {
  const d = parseTimestamp(iso)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function formatFull(iso: string): string {
  return fullDate.format(parseIso(iso))
}

export function formatClock(iso: string): string {
  return clock.format(parseTimestamp(iso))
}
