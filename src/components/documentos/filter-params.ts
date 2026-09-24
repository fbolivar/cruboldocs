// Filtros de la lista maestra ↔ URL. Se usa en servidor (page) y en cliente (exportar, filtros).

import { param, paramList, type SearchParams } from "@/lib/url"
import type { DocumentFilters, DocumentStatus } from "@/lib/types"

export const DOCUMENT_STATUSES: DocumentStatus[] = ["borrador", "en_revision", "en_aprobacion", "vigente", "obsoleto"]

/** Claves de la URL que cuentan como filtro (no incluye orden ni página). */
export const FILTER_KEYS = ["q", "proceso", "tipo", "estado", "vencida"] as const

const SORTS = ["code", "title", "nextReview"] as const
type Sort = (typeof SORTS)[number]

const isSort = (v: string | undefined): v is Sort => SORTS.some((s) => s === v)
const isStatus = (v: string): v is DocumentStatus => DOCUMENT_STATUSES.some((s) => s === v)

export function parseDocumentFilters(sp: SearchParams): DocumentFilters {
  const sort = param(sp, "orden")
  const page = Number.parseInt(param(sp, "page") ?? "1", 10)
  return {
    q: param(sp, "q"),
    processId: param(sp, "proceso"),
    typeId: param(sp, "tipo"),
    statuses: paramList(sp, "estado").filter(isStatus),
    reviewOverdue: param(sp, "vencida") === "1",
    sort: isSort(sort) ? sort : "code",
    dir: param(sp, "dir") === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** Número de filtros activos (para "Filtros (n)" y para mostrar "Limpiar"). */
export function activeFilterCount(f: DocumentFilters): number {
  return [f.q, f.processId, f.typeId, f.statuses?.length, f.reviewOverdue].filter(Boolean).length
}

/** Cambios de URL que borran todos los filtros (conserva el orden). */
export const CLEAR_FILTERS: Record<string, null> = Object.fromEntries(FILTER_KEYS.map((k) => [k, null]))

export function searchParamsToRecord(params: URLSearchParams): SearchParams {
  return Object.fromEntries(params.entries())
}
