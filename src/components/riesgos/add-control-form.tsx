"use client"

import type * as React from "react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { type ControlDraft, type ControlErrors, ControlFields, EMPTY_CONTROL, validateControl } from "@/components/riesgos/control-fields"
import type { Option } from "@/components/riesgos/filter-controls"
import { Button } from "@/components/ui/button"
import { addControl } from "@/lib/data/actions"
import type { Control } from "@/lib/types"

interface Props {
  riskId: string
  positions: Option[]
  onCancel: () => void
  onSaved: (c: Control) => void
}

/** Agregar control a un riesgo existente (líder). */
export function AddControlForm({ riskId, positions, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState<ControlDraft>(EMPTY_CONTROL)
  const [errors, setErrors] = useState<ControlErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const e = validateControl(draft)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    startTransition(async () => {
      const res = await addControl(riskId, { ...draft, description: draft.description.trim(), frequency: draft.frequency.trim() })
      if (!res.ok) return setFormError(res.error)
      toast.success("Control agregado")
      onSaved({
        id: `nuevo-${Date.now()}`,
        description: draft.description.trim(),
        type: draft.type,
        frequency: draft.frequency.trim(),
        responsiblePositionId: draft.responsiblePositionId,
        responsiblePositionName: positions.find((p) => p.value === draft.responsiblePositionId)?.label ?? "",
        nextDueDate: new Date().toISOString(),
        overdue: false,
        lastEvidence: null,
      })
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 rounded-md border border-borde bg-fondo p-4">
      <h4 className="font-display text-h3">Agregar control</h4>
      <ControlFields idPrefix="nc" value={draft} errors={errors} positions={positions} onChange={setDraft} />
      {formError && (
        <p role="alert" className="text-small text-error-texto">
          {formError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Guardar control
        </Button>
      </div>
    </form>
  )
}
