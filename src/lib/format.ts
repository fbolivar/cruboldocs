// Formatos de fecha para es-LA (Colombia). Único lugar donde se parsean fechas.

const DAY_MS = 86_400_000

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Bogota",
})

const dateTimeFmt = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Bogota",
})

/** 15/03/2027 */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

/** 20/09/2026 10:12 */
export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso)).replace(",", "")
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Días calendario entre hoy y la fecha (negativo = en el pasado). */
export function daysFromToday(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / DAY_MS)
}

/** "Vencida hace 2 días" · "Vence hoy" · "Vence mañana" · "Vence en 5 días" */
export function dueLabel(iso: string, now: Date = new Date()): string {
  const d = daysFromToday(iso, now)
  if (d < 0) return `Vencida hace ${-d} ${-d === 1 ? "día" : "días"}`
  if (d === 0) return "Vence hoy"
  if (d === 1) return "Vence mañana"
  return `Vence en ${d} días`
}

/** "Hoy 16:40" · "Ayer 11:02" · "22/09 09:15" */
export function relativeDateTime(iso: string, now: Date = new Date()): string {
  const d = daysFromToday(iso, now)
  const time = formatDateTime(iso).split(" ")[1]
  if (d === 0) return `Hoy ${time}`
  if (d === -1) return `Ayer ${time}`
  return `${formatDate(iso).slice(0, 5)} ${time}`
}

/** Saludo según la hora local. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

/** 1,2 MB */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`
}

/** 3fa9e1…77c21 */
export function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-5)}`
}

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
