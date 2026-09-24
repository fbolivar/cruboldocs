"use client"

import { SlidersHorizontalIcon } from "lucide-react"
import { useState } from "react"

import { FilterSelect, KindToggle, LEVEL_OPTIONS, type Option, OverdueCheckbox } from "@/components/riesgos/filter-controls"
import { sheetFilterCount } from "@/components/riesgos/risk-params"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { RiskFilters } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"

interface Props {
  filters: RiskFilters
  processes: Option[]
  categories: Option[]
}

/** Filtros superiores: Proceso, Categoría y vista. En móvil, Proceso/Categoría/Nivel/Vencidos van en hoja inferior. */
export function RiskTopFilters({ filters, processes, categories }: Props) {
  const { set } = useUrlState()
  const [open, setOpen] = useState(false)
  const count = sheetFilterCount(filters)
  const kind = filters.kind ?? "residual"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" className="md:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontalIcon aria-hidden="true" />
        Filtros{count > 0 && ` (${count})`}
      </Button>
      <div className="hidden items-center gap-3 md:flex">
        <FilterSelect
          id="f-proceso"
          label="Proceso"
          allLabel="Proceso: Todos"
          value={filters.processId}
          options={processes}
          onChange={(v) => set({ proceso: v })}
        />
        <FilterSelect
          id="f-categoria"
          label="Categoría"
          allLabel="Categoría: Todas"
          value={filters.category}
          options={categories}
          onChange={(v) => set({ categoria: v })}
        />
      </div>
      <KindToggle value={kind} onChange={(v) => set({ vista: v === "inherente" ? v : null })} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle className="font-display text-h3">Filtros</SheetTitle>
            <SheetDescription className="text-small text-texto-sec">Se aplican al instante a la matriz y a la lista.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6">
            <FilterSelect id="m-proceso" label="Proceso" allLabel="Proceso: Todos" value={filters.processId} options={processes} onChange={(v) => set({ proceso: v })} />
            <FilterSelect id="m-categoria" label="Categoría" allLabel="Categoría: Todas" value={filters.category} options={categories} onChange={(v) => set({ categoria: v })} />
            <FilterSelect id="m-nivel" label="Nivel" allLabel="Nivel: Todos" value={filters.level} options={LEVEL_OPTIONS} onChange={(v) => set({ nivel: v })} />
            <OverdueCheckbox id="m-vencidos" checked={Boolean(filters.overdueControls)} onChange={(v) => set({ vencidos: v ? 1 : null })} />
            <div className="flex gap-3">
              {count > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => set({ proceso: null, categoria: null, nivel: null, vencidos: null })}>
                  Limpiar
                </Button>
              )}
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Ver resultados
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
