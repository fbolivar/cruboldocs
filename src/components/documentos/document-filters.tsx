"use client"

import { SlidersHorizontalIcon } from "lucide-react"
import { useCallback, useState } from "react"

import { FilterControls, type FilterValues } from "@/components/documentos/filter-controls"
import {
  activeFilterCount,
  CLEAR_FILTERS,
  parseDocumentFilters,
  searchParamsToRecord,
} from "@/components/documentos/filter-params"
import { SearchBox } from "@/components/documentos/search-box"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUrlState } from "@/lib/use-url-state"
import type { DocumentType, Process } from "@/lib/types"

/** Barra de filtros de la lista maestra sincronizada con la URL (compartible). */
export function DocumentFilters({ processes, types }: { processes: Process[]; types: DocumentType[] }) {
  const { params, set } = useUrlState()
  const [sheetOpen, setSheetOpen] = useState(false)
  const f = parseDocumentFilters(searchParamsToRecord(params))
  const count = activeFilterCount(f)
  // En la hoja móvil la búsqueda queda fuera: el contador solo cuenta lo que está dentro.
  const sheetCount = count - (f.q ? 1 : 0)

  const values: FilterValues = {
    processId: f.processId ?? null,
    typeId: f.typeId ?? null,
    statuses: f.statuses ?? [],
    overdue: !!f.reviewOverdue,
  }
  const onSearch = useCallback((q: string | null) => set({ q }), [set])
  const clear = () => set(CLEAR_FILTERS)

  return (
    <div role="search" aria-label="Filtros de documentos" className="flex flex-wrap items-center gap-2">
      <SearchBox value={f.q ?? ""} onSearch={onSearch} className="min-w-0 flex-1 md:max-w-80" />

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <FilterControls idPrefix="filtro" layout="inline" values={values} processes={processes} types={types} onChange={set} />
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Limpiar
          </Button>
        )}
      </div>

      <Button variant="outline" className="md:hidden" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontalIcon aria-hidden="true" />
        Filtros{sheetCount > 0 && ` (${sheetCount})`}
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-dvh gap-0 rounded-t-lg bg-superficie md:hidden">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="font-display text-h3">Filtros</SheetTitle>
            <SheetDescription className="text-small text-texto-sec">Los cambios se aplican al instante.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 py-2">
            <FilterControls idPrefix="filtro-movil" layout="stacked" values={values} processes={processes} types={types} onChange={set} />
          </div>
          <SheetFooter className="flex-row gap-3 border-t border-borde px-4 py-3">
            <Button variant="outline" className="flex-1" onClick={clear} disabled={sheetCount === 0}>
              Limpiar
            </Button>
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              Ver resultados
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
