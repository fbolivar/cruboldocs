import type { FocoSeverity } from "@/lib/focos/types"

// Reglas y umbrales de los focos de riesgo (puros, testeables). Umbrales fijos (ADR-114).

/** Días enteros entre dos fechas ISO (a - b). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso), b = Date.parse(bIso)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((a - b) / 86_400_000)
}

/** Severidad de un foco de vencimientos por cantidad y antigüedad (días) del más viejo. */
export function overdueSeverity(count: number, oldestDays: number): FocoSeverity {
  if (count >= 3 || oldestDays >= 14) return "alta"
  if (count >= 1) return "media"
  return "baja"
}

/** true si los valores (más reciente primero) descienden de forma estricta en los últimos 3. */
export function isDescending(latestFirst: number[]): boolean {
  if (latestFirst.length < 3) return false
  const [a, b, c] = latestFirst
  return a < b && b < c
}

/** Severidad de un indicador según el cumplimiento de su última medición y la tendencia. */
export function indicatorSeverity(lastCompliance: string, descending: boolean): FocoSeverity | null {
  if (lastCompliance === "no_cumple") return "alta"
  if (descending) return "alta"
  if (lastCompliance === "en_riesgo") return "media"
  return null
}

/** Severidad de NC recurrentes de un proceso por cantidad en la ventana. */
export function recurrenceSeverity(count: number): FocoSeverity | null {
  if (count >= 5) return "alta"
  if (count >= 3) return "media"
  return null
}

/** Severidad de un proveedor en descenso por su estado y criticidad. */
export function supplierSeverity(status: string, criticality: string): FocoSeverity | null {
  if (status === "rechazado") return criticality === "alta" ? "alta" : "media"
  if (status === "condicionado") return criticality === "alta" ? "media" : "baja"
  return null
}
