import { DocumentRow } from "@/components/documentos/document-row"
import { SortableTh, Table, Th, THead } from "@/components/ui/table"
import { withParams, type SearchParams } from "@/lib/url"
import type { DocumentFilters, DocumentSummary } from "@/lib/types"

type SortKey = NonNullable<DocumentFilters["sort"]>

/** Tabla de escritorio (6 columnas + menú). El orden viaja en la URL (`orden`, `dir`). */
export function DocumentTable({ items, filters, sp }: { items: DocumentSummary[]; filters: DocumentFilters; sp: SearchParams }) {
  const sortTh = (key: SortKey, label: string) => {
    const active = filters.sort === key
    const nextDir = active && filters.dir === "asc" ? "desc" : "asc"
    return (
      <SortableTh
        label={label}
        active={active}
        dir={filters.dir ?? "asc"}
        href={withParams("/app/documentos", sp, { orden: key === "code" ? null : key, dir: nextDir === "asc" ? null : "desc", page: null })}
      />
    )
  }

  return (
    <Table>
      <caption className="sr-only">Lista maestra de documentos</caption>
      <THead>
        <tr>
          {sortTh("code", "Código")}
          {sortTh("title", "Título")}
          <Th>Proceso</Th>
          <Th>Versión</Th>
          <Th>Estado</Th>
          {sortTh("nextReview", "Próxima revisión")}
          <Th className="w-12">
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </THead>
      <tbody>
        {items.map((d) => (
          <DocumentRow key={d.id} doc={d} />
        ))}
      </tbody>
    </Table>
  )
}
