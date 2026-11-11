import type { DashboardBlock, DashboardBlockKey } from "@/lib/types"

/** Catálogo canónico de bloques del tablero (orden por defecto). Fuente única (ADR-069). */
export const DASHBOARD_BLOCKS: { key: DashboardBlockKey; label: string }[] = [
  { key: "kpi_mejora", label: "Mejora (KPIs)" },
  { key: "kpi_desempeno", label: "Desempeño (KPIs)" },
  { key: "kpi_cliente", label: "Cliente (KPIs)" },
  { key: "kpi_documentos", label: "Documentos (KPIs)" },
  { key: "panel_nc", label: "No conformidades (panel)" },
  { key: "panel_indicadores", label: "Indicadores por cumplimiento (panel)" },
  { key: "panel_objetivos", label: "Objetivos por perspectiva (panel)" },
  { key: "panel_pqrs", label: "PQRS y satisfacción (panel)" },
]

const CATALOG_KEYS = DASHBOARD_BLOCKS.map((b) => b.key)
const LABELS = new Map(DASHBOARD_BLOCKS.map((b) => [b.key, b.label]))

export function blockLabel(key: DashboardBlockKey): string {
  return LABELS.get(key) ?? key
}

/** Fusiona el layout guardado (lista de claves visibles en orden) con el catálogo:
 *  claves desconocidas se ignoran; las del catálogo ausentes se anexan ocultas al final. */
export function mergeLayout(stored: unknown): DashboardBlock[] {
  const known = Array.isArray(stored)
    ? (stored.filter((k): k is DashboardBlockKey => typeof k === "string" && (CATALOG_KEYS as string[]).includes(k)))
    : null
  if (!known || known.length === 0) {
    // Sin preferencia válida → todos visibles en orden canónico.
    return DASHBOARD_BLOCKS.map((b) => ({ key: b.key, visible: true }))
  }
  const seen = new Set(known)
  const visible: DashboardBlock[] = known.map((key) => ({ key, visible: true }))
  const hidden: DashboardBlock[] = CATALOG_KEYS.filter((k) => !seen.has(k)).map((key) => ({ key, visible: false }))
  return [...visible, ...hidden]
}

/** Deriva el layout a guardar: las claves visibles en el orden de la lista. */
export function toStoredLayout(blocks: DashboardBlock[]): DashboardBlockKey[] {
  return blocks.filter((b) => b.visible).map((b) => b.key)
}
