import { Page } from "@/components/shell/page"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const CELLS = Array.from({ length: 25 }, (_, i) => i)
const ROWS = Array.from({ length: 6 }, (_, i) => i)

/** Skeleton de Riesgos: cuadrícula 5×5 en superficie-alt + 6 filas de lista. */
export default function RiesgosLoading() {
  return (
    <Page wide>
      <div aria-busy="true" aria-live="polite" className="contents">
        <span className="sr-only">Cargando riesgos…</span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1>Riesgos</h1>
          <div className="flex gap-3">
            <Skeleton className="h-11 w-36 bg-superficie-alt md:h-9" />
            <Skeleton className="h-11 w-40 bg-superficie-alt md:h-9" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-44 bg-superficie-alt md:h-9" />
            <Skeleton className="h-11 w-44 bg-superficie-alt md:h-9" />
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <Card className="flex flex-1 flex-col gap-4 p-4 md:p-6">
              <Skeleton className="h-6 w-64 bg-superficie-alt" />
              <div className="mx-auto grid grid-cols-5 gap-1">
                {CELLS.map((i) => (
                  <Skeleton key={i} className="size-12 bg-superficie-alt md:size-16" />
                ))}
              </div>
            </Card>
            <Card className="flex flex-col gap-3 p-4 md:w-70 md:p-6">
              <Skeleton className="h-8 w-16 bg-superficie-alt" />
              {ROWS.slice(0, 4).map((i) => (
                <Skeleton key={i} className="h-5 w-full bg-superficie-alt" />
              ))}
            </Card>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-11 w-full bg-superficie-alt md:h-9 md:max-w-80" />
          <Card className="overflow-hidden">
            <div className="h-10 bg-superficie-alt" />
            {ROWS.map((i) => (
              <div key={i} className="flex items-center gap-4 border-t border-borde px-4 py-3">
                <Skeleton className="h-5 w-12 bg-superficie-alt" />
                <Skeleton className="h-5 flex-1 bg-superficie-alt" />
                <Skeleton className="hidden h-5 w-24 bg-superficie-alt md:block" />
                <Skeleton className="h-6 w-20 bg-superficie-alt" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </Page>
  )
}
