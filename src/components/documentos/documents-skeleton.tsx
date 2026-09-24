import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const CHIP_ROWS = [2, 3, 3, 2]

/** Skeleton del mapa de procesos: 4 grupos con chips (mismas alturas que el contenido real). */
export function ProcessMapSkeleton() {
  return (
    <Card className="p-4 md:p-6" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="mt-4 hidden flex-col gap-3 md:flex">
        {CHIP_ROWS.map((n, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-30" />
            {Array.from({ length: n }, (_, j) => (
              <Skeleton key={j} className="h-8 w-32" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Skeleton de la tabla: cabecera + 8 filas en escritorio; 8 cards en móvil. */
export function DocumentTableSkeleton() {
  return (
    <Card className="overflow-hidden" aria-busy="true" aria-label="Cargando la lista maestra">
      <div className="hidden md:block">
        <div className="h-10 bg-superficie-alt" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-12 items-center gap-6 border-t border-borde px-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-borde md:hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Skeleton de la barra de filtros. */
export function FiltersSkeleton() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      <Skeleton className="h-11 flex-1 md:h-9 md:max-w-80" />
      <Skeleton className="h-11 w-28 md:hidden" />
      <Skeleton className="hidden h-9 w-48 md:block" />
      <Skeleton className="hidden h-9 w-44 md:block" />
      <Skeleton className="hidden h-9 w-44 md:block" />
    </div>
  )
}
