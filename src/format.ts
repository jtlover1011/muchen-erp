export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return formatDate(new Date())
}

export function nowLocalMinute(): string {
  const d = new Date()
  return `${formatDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatShipTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return `${value.slice(0, 10)} ${value.slice(11, 16)}`
  return value
}

export function shipDay(value: string): string {
  return value.slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d)
  next.setDate(next.getDate() + days)
  return formatDate(next)
}

export function yesterday(): string {
  return addDays(today(), -1)
}

export function lastNDates(days: number, end = today()): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) dates.push(addDays(end, -i))
  return dates
}

export function weekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return '周' + '日一二三四五六'[new Date(y, m - 1, d).getDay()]
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function money(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function qty(n: number): string {
  return n.toLocaleString('zh-CN')
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function hit(q: string, parts: Array<string | number>): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return parts.some((part) => String(part).toLowerCase().includes(s))
}

export function sum(nums: number[]): number {
  return nums.reduce((total, n) => total + n, 0)
}
