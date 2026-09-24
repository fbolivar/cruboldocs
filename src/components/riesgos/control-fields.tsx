"use client"

import type { Option } from "@/components/riesgos/filter-controls"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CONTROL_TYPE_LABELS } from "@/lib/domain/risk"
import type { ControlType } from "@/lib/types"

export interface ControlDraft {
  description: string
  type: ControlType
  frequency: string
  responsiblePositionId: string
}

export type ControlErrors = Partial<Record<"description" | "frequency" | "responsiblePositionId", string>>

export const EMPTY_CONTROL: ControlDraft = { description: "", type: "preventivo", frequency: "", responsiblePositionId: "" }

export function validateControl(c: ControlDraft): ControlErrors {
  const e: ControlErrors = {}
  if (!c.description.trim()) e.description = "Describe el control."
  if (!c.frequency.trim()) e.frequency = "Indica la frecuencia."
  if (!c.responsiblePositionId) e.responsiblePositionId = "Elige el cargo responsable."
  return e
}

/** Selector con los estilos de campo de formulario. */
export function SelectField({
  aria,
  value,
  placeholder,
  options,
  onChange,
}: {
  aria: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }
  value: string
  placeholder: string
  options: Option[]
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger {...aria} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const TYPE_OPTIONS: Option[] = (Object.keys(CONTROL_TYPE_LABELS) as ControlType[]).map((t) => ({ value: t, label: CONTROL_TYPE_LABELS[t] }))

/** Campos de un control: descripción, tipo, frecuencia y cargo responsable. */
export function ControlFields({
  idPrefix,
  value,
  errors,
  positions,
  onChange,
}: {
  idPrefix: string
  value: ControlDraft
  errors: ControlErrors
  positions: Option[]
  onChange: (next: ControlDraft) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field id={`${idPrefix}-desc`} label="Descripción del control" error={errors.description} required>
        {(aria) => (
          <Textarea {...aria} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} className="min-h-16" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-tipo`} label="Tipo" required>
          {(aria) => (
            <SelectField aria={aria} value={value.type} placeholder="Elige el tipo" options={TYPE_OPTIONS} onChange={(v) => onChange({ ...value, type: v as ControlType })} />
          )}
        </Field>
        <Field id={`${idPrefix}-frec`} label="Frecuencia" error={errors.frequency} required>
          {(aria) => (
            <Input {...aria} placeholder="Mensual, Por evento…" value={value.frequency} onChange={(e) => onChange({ ...value, frequency: e.target.value })} />
          )}
        </Field>
      </div>
      <Field id={`${idPrefix}-resp`} label="Cargo responsable" error={errors.responsiblePositionId} required>
        {(aria) => (
          <SelectField
            aria={aria}
            value={value.responsiblePositionId}
            placeholder="Elige el cargo"
            options={positions}
            onChange={(v) => onChange({ ...value, responsiblePositionId: v })}
          />
        )}
      </Field>
    </div>
  )
}
