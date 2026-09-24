"use client"

import { SelectField } from "@/components/riesgos/control-fields"
import type { Option } from "@/components/riesgos/filter-controls"
import { Field, FormSection } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

export interface IdentificationDraft {
  processId: string
  description: string
  cause: string
  consequence: string
  category: string
  ownerPositionId: string
}

export type IdentificationErrors = Partial<Record<keyof IdentificationDraft, string>>

export const EMPTY_IDENTIFICATION: IdentificationDraft = { processId: "", description: "", cause: "", consequence: "", category: "", ownerPositionId: "" }

export function validateIdentification(d: IdentificationDraft): IdentificationErrors {
  const e: IdentificationErrors = {}
  if (!d.processId) e.processId = "Elige el proceso."
  if (!d.description.trim()) e.description = "Describe el riesgo."
  if (!d.cause.trim()) e.cause = "Indica la causa."
  if (!d.consequence.trim()) e.consequence = "Indica la consecuencia."
  if (!d.category) e.category = "Elige la categoría."
  if (!d.ownerPositionId) e.ownerPositionId = "Elige el cargo dueño del riesgo."
  return e
}

interface Props {
  value: IdentificationDraft
  errors: IdentificationErrors
  processes: Option[]
  categories: Option[]
  positions: Option[]
  onChange: (next: IdentificationDraft) => void
}

/** Sección "Identificación" del formulario Identificar riesgo. */
export function IdentifyFields({ value, errors, processes, categories, positions, onChange }: Props) {
  const text = (key: "description" | "cause" | "consequence", label: string, placeholder: string) => (
    <Field id={`ir-${key}`} label={label} error={errors[key]} required>
      {(aria) => (
        <Textarea {...aria} value={value[key]} placeholder={placeholder} onChange={(e) => onChange({ ...value, [key]: e.target.value })} className="min-h-16" />
      )}
    </Field>
  )

  return (
    <FormSection title="Identificación">
      <Field id="ir-proceso" label="Proceso" error={errors.processId} required>
        {(aria) => <SelectField aria={aria} value={value.processId} placeholder="Elige el proceso" options={processes} onChange={(v) => onChange({ ...value, processId: v })} />}
      </Field>
      {text("description", "Descripción", "Qué puede pasar")}
      {text("cause", "Causa", "Por qué podría pasar")}
      {text("consequence", "Consecuencia", "Qué efecto tendría")}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ir-categoria" label="Categoría" error={errors.category} required>
          {(aria) => <SelectField aria={aria} value={value.category} placeholder="Elige la categoría" options={categories} onChange={(v) => onChange({ ...value, category: v })} />}
        </Field>
        <Field id="ir-dueno" label="Cargo dueño" error={errors.ownerPositionId} required>
          {(aria) => (
            <SelectField aria={aria} value={value.ownerPositionId} placeholder="Elige el cargo" options={positions} onChange={(v) => onChange({ ...value, ownerPositionId: v })} />
          )}
        </Field>
      </div>
    </FormSection>
  )
}
