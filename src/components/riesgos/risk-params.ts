// Lectura de los parámetros de /app/riesgos (filtros compartibles por URL).

import { RISK_LEVELS } from "@/lib/domain/risk"
import type { RiskFilters, RiskLevel } from "@/lib/types"
import { param, type SearchParams } from "@/lib/url"

export const RISKS_PATH = "/app/riesgos"

export interface RiskParams {
  filters: RiskFilters
  page: number
  riskId: string | null
  identify: boolean
}

export function parseRiskParams(sp: SearchParams): RiskParams {
  const level = param(sp, "nivel")
  const cell = param(sp, "celda")
  const sort = param(sp, "orden")
  const dir = param(sp, "dir")
  const page = Number(param(sp, "page") ?? "1")
  return {
    filters: {
      q: param(sp, "q"),
      processId: param(sp, "proceso"),
      category: param(sp, "categoria"),
      level: RISK_LEVELS.includes(level as RiskLevel) ? (level as RiskLevel) : undefined,
      overdueControls: param(sp, "vencidos") === "1" || undefined,
      kind: param(sp, "vista") === "inherente" ? "inherente" : "residual",
      cell: cell && /^[1-5]-[1-5]$/.test(cell) ? cell : undefined,
      sort: sort === "code" || sort === "process" ? sort : "level",
      dir: dir === "asc" || dir === "desc" ? dir : undefined,
    },
    page: Number.isInteger(page) && page > 0 ? page : 1,
    riskId: param(sp, "riesgo") ?? null,
    identify: param(sp, "identificar") === "1",
  }
}

/** Hay algún filtro que reduzca la lista (la vista residual/inherente no cuenta). */
export function hasListFilters(f: RiskFilters): boolean {
  return Boolean(f.q || f.processId || f.category || f.level || f.overdueControls || f.cell)
}

/** Número de filtros activos que viven en la hoja inferior móvil. */
export function sheetFilterCount(f: RiskFilters): number {
  return [f.processId, f.category, f.level, f.overdueControls].filter(Boolean).length
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

