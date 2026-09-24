"use client"

import { SearchIcon } from "lucide-react"
import { useRef, useState } from "react"

import { FilterSelect, LEVEL_OPTIONS, OverdueCheckbox } from "@/components/riesgos/filter-controls"
import { Input } from "@/components/ui/input"
import type { RiskFilters } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"

/** Filtros de la lista: búsqueda (todas las anchuras), Nivel y Controles vencidos (escritorio). */
export function RiskListFilters({ filters }: { filters: RiskFilters }) {
  const { set } = useUrlState()
  const [q, setQ] = useState(filters.q ?? "")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onSearch(value: string) {
    setQ(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => set({ q: value.trim() || null }), 300)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full md:max-w-80">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Buscar por código o descripción"
          placeholder="Código o descripción"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="hidden items-center gap-4 md:flex">
        <FilterSelect
          id="f-nivel"
          label="Nivel"
          allLabel="Nivel: Todos"
          value={filters.level}
          options={LEVEL_OPTIONS}
          onChange={(v) => set({ nivel: v })}
          className="md:min-w-36"
        />
        <OverdueCheckbox id="f-vencidos" checked={Boolean(filters.overdueControls)} onChange={(v) => set({ vencidos: v ? 1 : null })} />
      </div>
    </div>
  )
}
