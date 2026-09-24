"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"

import { type ControlDraft, type ControlErrors, ControlFields, EMPTY_CONTROL } from "@/components/riesgos/control-fields"
import type { Option } from "@/components/riesgos/filter-controls"
import { Button } from "@/components/ui/button"
import { FormSection } from "@/components/ui/field"

export interface KeyedControl extends ControlDraft {
  key: number
}

interface Props {
  controls: KeyedControl[]
  errors: Record<number, ControlErrors>
  positions: Option[]
  onChange: (next: KeyedControl[]) => void
}

/** Sección "Controles" (opcional): uno o más controles del riesgo. */
export function IdentifyControls({ controls, errors, positions, onChange }: Props) {
  const nextKey = controls.reduce((m, c) => Math.max(m, c.key), 0) + 1
  return (
    <FormSection title="Controles (opcional)">
      {controls.length === 0 && <p className="text-small text-texto-sec">Puedes agregar controles ahora o después desde el panel del riesgo.</p>}
      {controls.map((c, idx) => (
        <div key={c.key} className="flex flex-col gap-3 rounded-md border border-borde p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label">Control {idx + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar control ${idx + 1}`}
              onClick={() => onChange(controls.filter((x) => x.key !== c.key))}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
          <ControlFields
            idPrefix={`ir-c${c.key}`}
            value={c}
            errors={errors[c.key] ?? {}}
            positions={positions}
            onChange={(next) => onChange(controls.map((x) => (x.key === c.key ? { ...next, key: c.key } : x)))}
          />
        </div>
      ))}
      <Button type="button" variant="outline" className="self-start" onClick={() => onChange([...controls, { ...EMPTY_CONTROL, key: nextKey }])}>
        <PlusIcon aria-hidden="true" />
        Agregar control
      </Button>
    </FormSection>
  )
}
