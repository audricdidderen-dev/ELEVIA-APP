/**
 * Local date utilities — avoids UTC timezone bugs for Belgian users (CET/CEST).
 * Always use these instead of toISOString().slice(0,10).
 */

/** Returns today's date as 'YYYY-MM-DD' in local timezone */
export function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Formats a Date object as 'YYYY-MM-DD' in local timezone */
export function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Returns Monday-Sunday bounds for the current week in local timezone */
export function getWeekBounds() {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: localDateStr(monday),
    end: localDateStr(sunday),
  }
}
