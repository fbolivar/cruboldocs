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

const TZ = "America/Bogota"
const isoDateFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ })
const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TZ })

/** Fecha calendario AAAA-MM-DD en Bogotá, sin importar la zona horaria del servidor. */
export function bogotaIsoDate(d: Date): string {
  return isoDateFmt.format(d)
}

/** Días calendario (en Bogotá) entre hoy y la fecha (negativo = en el pasado). */
export function daysFromToday(iso: string, now: Date = new Date()): number {
  const day = (d: Date) => Date.parse(`${bogotaIsoDate(d)}T00:00:00Z`)
  return Math.round((day(new Date(iso)) - day(now)) / DAY_MS)
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

/** Saludo según la hora de Bogotá. */
export function greeting(now: Date = new Date()): string {
  const h = Number(hourFmt.format(now))
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

/** Hoy AAAA-MM-DD en Bogotá (para `<input type="date">` y nombres de archivo). */
export function todayIsoDate(now: Date = new Date()): string {
  return bogotaIsoDate(now)
}
