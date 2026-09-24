import { FilterXIcon, ShieldAlertIcon, XIcon } from "lucide-react"
import Link from "next/link"

import { hasListFilters, RISKS_PATH } from "@/components/riesgos/risk-params"
import { RiskCards, RiskTable } from "@/components/riesgos/risk-table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { SectionError } from "@/components/ui/section-error"
import { IMPACT_LABELS, PROBABILITY_LABELS } from "@/lib/domain/risk"
import type { Paginated, RiskFilters, RiskSummaryRow } from "@/lib/types"
import { type SearchParams, withParams } from "@/lib/url"

interface Props {
  result: Paginated<RiskSummaryRow> | null
  filters: RiskFilters
  sp: SearchParams
  selectedId: string | null
  canManage: boolean
}

/** Lista de riesgos (tabla en escritorio, cards en móvil) con sus estados vacío y error. */
export function RiskList({ result, filters, sp, selectedId, canManage }: Props) {
  if (!result) return <SectionError title="No pudimos cargar los riesgos." />

  const kind = filters.kind ?? "residual"
  const clearHref = withParams(RISKS_PATH, {}, { vista: kind === "inherente" ? kind : null })
  const hrefFor = (id: string) => withParams(RISKS_PATH, sp, { riesgo: id })

  if (result.total === 0) {
    return (
      <Card>
        {hasListFilters(filters) ? (
          <EmptyState
            icon={FilterXIcon}
            title="Ningún riesgo coincide con estos filtros."
            action={
              <Button variant="outline" asChild>
                <Link href={clearHref} scroll={false}>
                  Limpiar filtros
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ShieldAlertIcon}
            title="Aún no hay riesgos identificados."
            description="Identifica el primero para empezar a llenar la matriz."
            action={
              canManage && (
                <Button asChild>
                  <Link href={withParams(RISKS_PATH, sp, { identificar: 1 })} scroll={false}>
                    Identificar riesgo
                  </Link>
                </Button>
              )
            }
          />
        )}
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {filters.cell && <CellFilterNote cell={filters.cell} href={withParams(RISKS_PATH, sp, { celda: null, page: null })} />}
      <Card className="overflow-hidden">
        <div className="hidden md:block">
          <RiskTable
            rows={result.items}
            kind={kind}
            selectedId={selectedId}
            hrefFor={hrefFor}
            sort={filters.sort ?? "level"}
            dir={filters.dir ?? (filters.sort && filters.sort !== "level" ? "asc" : "desc")}
            sortHref={(k, d) => withParams(RISKS_PATH, sp, { orden: k === "level" ? null : k, dir: d, page: null, riesgo: null })}
          />
        </div>
        <div className="md:hidden">
          <RiskCards rows={result.items} kind={kind} selectedId={selectedId} hrefFor={hrefFor} />
        </div>
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          hrefFor={(p) => withParams(RISKS_PATH, sp, { page: p > 1 ? p : null, riesgo: null })}
        />
      </Card>
    </div>
  )
}

function CellFilterNote({ cell, href }: { cell: string; href: string }) {
  const [p, i] = cell.split("-").map(Number)
  return (
    <p className="flex flex-wrap items-center gap-2 text-small text-texto-sec">
      Celda seleccionada:
      <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-acento-suave pl-2 text-acento">
        P{p} {PROBABILITY_LABELS[p - 1]} × I{i} {IMPACT_LABELS[i - 1]}
        <Link href={href} scroll={false} aria-label="Quitar filtro de celda" className="relative grid size-6 place-items-center rounded-sm after:absolute after:-inset-2.5 md:after:inset-0 hover:bg-acento hover:text-superficie">
          <XIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </span>
    </p>
  )
}
