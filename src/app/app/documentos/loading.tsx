import { DocumentTableSkeleton, FiltersSkeleton, ProcessMapSkeleton } from "@/components/documentos/documents-skeleton"
import { Page } from "@/components/shell/page"
import { Skeleton } from "@/components/ui/skeleton"

/** Carga de la lista maestra: encabezado, mapa de procesos (chips) y 8 filas de tabla. */
export default function DocumentosLoading() {
  return (
    <Page wide>
      <div className="flex items-end justify-between gap-4">
        <h1>Documentos</h1>
        {/* Reserva el alto del menú ⋯ de móvil para evitar salto de layout. */}
        <div className="size-11 md:hidden" aria-hidden="true" />
        <div className="hidden gap-3 md:flex" aria-hidden="true">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>
      <ProcessMapSkeleton />
      <div className="flex flex-col gap-4">
        <FiltersSkeleton />
        <DocumentTableSkeleton />
      </div>
    </Page>
  )
}
