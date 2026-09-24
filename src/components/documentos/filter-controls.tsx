"use client"

import { MultiSelect } from "@/components/documentos/multi-select"
import { DOCUMENT_STATUSES } from "@/components/documentos/filter-params"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DOCUMENT_STATUS_META } from "@/lib/domain/documents"
import type { DocumentType, Process } from "@/lib/types"
import { cn } from "@/lib/utils"

const ALL = "todos"

export interface FilterValues {
  processId: string | null
  typeId: string | null
  statuses: string[]
  overdue: boolean
}

interface FilterControlsProps {
  /** Prefijo de ids: los controles se renderizan en escritorio y en la hoja móvil. */
  idPrefix: string
  values: FilterValues
  processes: Process[]
  types: DocumentType[]
  onChange: (changes: Record<string, string | null>) => void
  /** "inline" = fila de escritorio (labels ocultos); "stacked" = hoja móvil con labels visibles. */
  layout: "inline" | "stacked"
}

const STATUS_OPTIONS = DOCUMENT_STATUSES.map((s) => ({ value: s, label: DOCUMENT_STATUS_META[s].label }))

/** Proceso, Tipo, Estado (multi) y "Revisión vencida". Cada cambio se refleja en la URL. */
export function FilterControls({ idPrefix, values, processes, types, onChange, layout }: FilterControlsProps) {
  const stacked = layout === "stacked"
  const labelCls = stacked ? "text-label" : "sr-only"
  const wrap = stacked ? "flex flex-col gap-1.5" : "contents"
  const active = (on: boolean) => (on ? "border-acento bg-acento-suave text-acento" : "")

  return (
    <>
      <div className={wrap}>
        <Label htmlFor={`${idPrefix}-proceso`} className={labelCls}>
          Proceso
        </Label>
        <Select value={values.processId ?? ""} onValueChange={(v) => onChange({ proceso: v === ALL ? null : v })}>
          <SelectTrigger id={`${idPrefix}-proceso`} className={cn(stacked ? "w-full" : "w-48", active(!!values.processId))}>
            <SelectValue placeholder={stacked ? "Todos los procesos" : "Proceso"} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL}>Todos los procesos</SelectItem>
            {processes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={wrap}>
        <Label htmlFor={`${idPrefix}-tipo`} className={labelCls}>
          Tipo
        </Label>
        <Select value={values.typeId ?? ""} onValueChange={(v) => onChange({ tipo: v === ALL ? null : v })}>
          <SelectTrigger id={`${idPrefix}-tipo`} className={cn(stacked ? "w-full" : "w-44", active(!!values.typeId))}>
            <SelectValue placeholder={stacked ? "Todos los tipos" : "Tipo"} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={wrap}>
        <Label htmlFor={`${idPrefix}-estado`} className={labelCls}>
          Estado
        </Label>
        <MultiSelect
          id={`${idPrefix}-estado`}
          options={STATUS_OPTIONS}
          value={values.statuses}
          onChange={(v) => onChange({ estado: v.length ? v.join(",") : null })}
          placeholder="Todos los estados"
          summaryLabel="Estado"
          className={stacked ? "w-full" : "w-44"}
        />
      </div>

      <div className={cn("flex items-center gap-2", stacked ? "min-h-11" : "h-9")}>
        <Checkbox
          id={`${idPrefix}-vencida`}
          checked={values.overdue}
          onCheckedChange={(c) => onChange({ vencida: c === true ? "1" : null })}
        />
        <Label htmlFor={`${idPrefix}-vencida`} className="text-body font-normal">
          Revisión vencida
        </Label>
      </div>
    </>
  )
}
