"use client"

import { DownloadIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { OptionSelect, type Option } from "@/components/admin/option-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { exportAuditCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import type { AuditFilters as Filters } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"

const ALL = "todos"

interface AuditFiltersProps {
  filters: Filters
  options: { actors: Option[]; actions: Option[]; entities: Option[] }
  count: number
}

/** Filtros de la bitácora (URL) + exportación CSV con los mismos filtros. */
export function AuditFilters({ filters, options, count }: AuditFiltersProps) {
  const { set } = useUrlState()
  const [exporting, startExport] = useTransition()

  function exportCsv() {
    startExport(async () => {
      try {
        const csv = await exportAuditCsv(filters)
        downloadCsv(`auditoria-${todayIsoDate()}.csv`, csv)
        toast.success(`Exportamos ${count} ${count === 1 ? "evento" : "eventos"} a CSV`)
      } catch {
        toast.error("No pudimos exportar el archivo. Inténtalo de nuevo.")
      }
    })
  }

  const selects: { key: string; label: string; all: string; value?: string; options: Option[] }[] = [
    { key: "usuario", label: "Usuario", all: "Todos los usuarios", value: filters.actor, options: options.actors },
    { key: "accion", label: "Acción", all: "Todas las acciones", value: filters.action, options: options.actions },
    { key: "entidad", label: "Entidad", all: "Todas las entidades", value: filters.entityType, options: options.entities },
  ]

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="grid grid-cols-2 gap-3 md:flex">
        {(
          [
            { key: "desde", label: "Desde", value: filters.from },
            { key: "hasta", label: "Hasta", value: filters.to },
          ] as const
        ).map((d) => (
          <div key={d.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`audit-${d.key}`} className="text-label">
              {d.label}
            </Label>
            <Input id={`audit-${d.key}`} type="date" className="md:w-40" value={d.value ?? ""} onChange={(e) => set({ [d.key]: e.target.value })} />
          </div>
        ))}
      </div>
      {selects.map((s) => (
        <div key={s.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`audit-${s.key}`} className="text-label">
            {s.label}
          </Label>
          <OptionSelect
            aria={{ id: `audit-${s.key}` }}
            className="md:w-48"
            options={[{ value: ALL, label: s.all }, ...s.options]}
            value={s.value ?? ALL}
            onChange={(v) => set({ [s.key]: v === ALL ? null : v })}
          />
        </div>
      ))}
      <Button variant="outline" className="md:ml-auto" loading={exporting} disabled={count === 0} onClick={exportCsv}>
        {!exporting && <DownloadIcon aria-hidden="true" />}
        Exportar CSV
      </Button>
    </div>
  )
}
