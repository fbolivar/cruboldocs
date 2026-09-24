import { Page } from "@/components/shell/page"
import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Carga de Inicio: mismas dimensiones que la pantalla (saludo, 4 cifras y 5 filas de tarea). */
export default function InicioLoading() {
  return (
    <Page>
      <div role="status" aria-label="Cargando tu bandeja" className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 md:h-9" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md border border-borde bg-superficie p-4">
            <Skeleton className="hidden size-10 md:block" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 md:pb-3">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-11 w-full md:h-10 md:w-96" />
        </CardHeader>
        <Skeleton className="mx-4 mt-3 mb-1 h-4 w-20 md:mx-6" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 border-t border-borde px-4 py-4 md:flex-row md:items-center md:gap-4 md:px-6 md:py-3">
            <Skeleton className="h-6 w-28 md:w-36" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4 md:w-1/2" />
              <Skeleton className="h-3 w-2/3 md:w-1/3" />
            </div>
            <Skeleton className="h-11 w-full md:h-8 md:w-24" />
          </div>
        ))}
      </Card>
      <Skeleton className="h-14 w-full rounded-md" />
    </Page>
  )
}
