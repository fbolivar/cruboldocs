import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton de la tabla de la pestaña activa: barra de filtros + filas (cards en móvil). */
export function TabSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando sección">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-11 w-full md:h-9 md:w-80" />
        <Skeleton className="hidden h-9 w-40 md:block" />
        <Skeleton className="h-11 w-40 md:ml-auto md:h-9" />
      </div>
      <Card className="overflow-hidden">
        <div className="hidden h-10 bg-superficie-alt md:block" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-borde px-4 py-3 first:border-t-0 md:first:border-t">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="hidden h-4 w-36 md:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </Card>
    </div>
  )
}
