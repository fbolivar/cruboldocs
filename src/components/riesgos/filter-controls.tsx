"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RISK_LEVEL_LABELS, RISK_LEVELS } from "@/lib/domain/risk"
import type { AssessmentKind } from "@/lib/types"
import { cn } from "@/lib/utils"

const ALL = "todos"

export interface Option {
  value: string
  label: string
}

/** Select de filtro con opción "Todos" (Radix no admite valor vacío). */
export function FilterSelect({
  id,
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  id: string
  label: string
  allLabel: string
  value?: string
  options: Option[]
  onChange: (value: string | null) => void
  className?: string
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-full md:w-auto md:min-w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const LEVEL_OPTIONS: Option[] = RISK_LEVELS.map((l) => ({ value: l, label: RISK_LEVEL_LABELS[l] }))

/** Toggle Residual / Inherente: qué valoración pinta la matriz. */
export function KindToggle({ value, onChange }: { value: AssessmentKind; onChange: (v: AssessmentKind) => void }) {
  const options: { value: AssessmentKind; label: string }[] = [
    { value: "residual", label: "Residual" },
    { value: "inherente", label: "Inherente" },
  ]
  return (
    <div role="group" aria-label="Valoración que muestra la matriz" className="inline-flex rounded-md border border-borde-fuerte bg-superficie p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 rounded-sm px-3 text-small font-medium transition-colors duration-150 md:h-8",
            value === o.value ? "bg-acento-suave text-acento" : "text-texto-sec hover:text-texto"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function OverdueCheckbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-body md:min-h-0">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      Controles vencidos
    </label>
  )
}
