import { Page } from "@/components/shell/page"
import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton de la ficha: encabezado, visor y columna de detalles (mismas medidas que la vista real). */
export default function DocumentoLoading() {
  return (
    <Page>
      <div role="status" aria-label="Cargando documento" className="flex flex-col gap-4 md:gap-8">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-8" />
          </div>
          <Skeleton className="h-8 w-3/4 md:h-9 md:w-1/2" />
        </div>
        <Skeleton className="h-32 w-full rounded-md md:h-20" />
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-dvh max-h-128 min-w-0 flex-1 rounded-md md:max-h-200" />
          <Skeleton className="h-11 w-full rounded-md md:h-96 md:w-80 md:shrink-0" />
        </div>
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    </Page>
  )
}
