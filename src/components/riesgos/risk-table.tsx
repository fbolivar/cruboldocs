import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

import { RiskLevelBadge } from "@/components/riesgos/risk-level-badge"
import { plural } from "@/components/riesgos/risk-params"
import { SortableTh, Table, Td, Th, THead, Tr } from "@/components/ui/table"
import type { AssessmentKind, RiskSummaryRow } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ListProps {
  rows: RiskSummaryRow[]
  kind: AssessmentKind
  selectedId: string | null
  hrefFor: (id: string) => string
}

export function OverdueNote({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null
  return (
    <span className={cn("inline-flex items-center gap-1 text-error-texto", className)}>
      <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
      {plural(count, "vencido", "vencidos")}
    </span>
  )
}

function Residual({ row }: { row: RiskSummaryRow }) {
  if (!row.residual) return <span className="text-small text-texto-sec">Sin valorar</span>
  return <RiskLevelBadge level={row.residual.level} score={row.residual.score} />
}

export type RiskSort = "level" | "code" | "process"

/** Encabezados ordenables: `sortHref(clave, dir)` construye la URL; el nivel ordena la vista activa. */
export interface RiskSortProps {
  sort: RiskSort
  dir: "asc" | "desc"
  sortHref: (key: RiskSort, dir: "asc" | "desc") => string
}

function Sortable({ label, k, sort, dir, sortHref }: RiskSortProps & { label: string; k: RiskSort }) {
  const active = sort === k
  const next = active ? (dir === "asc" ? "desc" : "asc") : k === "level" ? "desc" : "asc"
  return <SortableTh label={label} active={active} dir={dir} href={sortHref(k, next)} />
}

/** Tabla de escritorio. Toda la fila abre el panel lateral (`?riesgo=id`). */
export function RiskTable({ rows, kind, selectedId, hrefFor, ...s }: ListProps & RiskSortProps) {
  return (
    <Table>
      <THead>
        <tr>
          <Sortable label="Código" k="code" {...s} />
          <Th>Descripción</Th>
          <Sortable label="Proceso" k="process" {...s} />
          {kind === "inherente" ? <Sortable label="Inherente" k="level" {...s} /> : <Th>Inherente</Th>}
          {kind === "residual" ? <Sortable label="Residual" k="level" {...s} /> : <Th>Residual</Th>}
          <Th>Controles</Th>
        </tr>
      </THead>
      <tbody>
        {rows.map((r) => (
          <Tr
            key={r.id}
            className={cn("relative hover:bg-superficie-alt", selectedId === r.id && "bg-acento-suave hover:bg-acento-suave")}
          >
            <Td className="font-mono text-small whitespace-nowrap">
              <Link
                href={hrefFor(r.id)}
                scroll={false}
                aria-label={`${r.code}: ${r.description}`}
                className="after:absolute after:inset-0 focus-visible:after:rounded-sm"
              >
                {r.code}
              </Link>
            </Td>
            <Td className="max-w-md">
              <span className="block truncate" title={r.description}>
                {r.description}
              </span>
            </Td>
            <Td className="whitespace-nowrap text-texto-sec">{r.processName}</Td>
            <Td>
              <RiskLevelBadge level={r.inherent.level} score={r.inherent.score} />
            </Td>
            <Td>
              <Residual row={r} />
            </Td>
            <Td className="whitespace-nowrap">
              {r.controlCount}
              {r.overdueControlCount > 0 && (
                <>
                  {" · "}
                  <OverdueNote count={r.overdueControlCount} />
                </>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

/** Lista de cards para móvil: código + badge residual, descripción y resumen de controles. */
export function RiskCards({ rows, kind, selectedId, hrefFor }: ListProps) {
  return (
    <ul className="flex flex-col">
      {rows.map((r) => {
        const shown = kind === "inherente" ? r.inherent : r.residual
        return (
          <li key={r.id} className="border-t border-borde first:border-t-0">
            <Link
              href={hrefFor(r.id)}
              scroll={false}
              className={cn("flex min-h-11 flex-col gap-1 px-4 py-3 active:bg-superficie-alt", selectedId === r.id && "bg-acento-suave")}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono text-small">{r.code}</span>
                {shown ? <RiskLevelBadge level={shown.level} score={shown.score} /> : <span className="text-small text-texto-sec">Sin valorar</span>}
              </span>
              <span>{r.description}</span>
              <span className="text-small text-texto-sec">
                {r.processName} · {plural(r.controlCount, "control", "controles")}
                {r.overdueControlCount > 0 && " · "}
                <OverdueNote count={r.overdueControlCount} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
