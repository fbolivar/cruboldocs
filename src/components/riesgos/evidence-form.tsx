"use client"

import { InfoIcon } from "lucide-react"
import type * as React from "react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { registerEvidence } from "@/lib/data/actions"
import { todayIsoDate } from "@/lib/format"
import type { Control, ControlEvidence, EvidenceResult } from "@/lib/types"

const MAX_BYTES = 25 * 1024 * 1024

type Errors = Partial<Record<"executedAt" | "result" | "file" | "form", string>>

interface Props {
  control: Control
  onCancel: () => void
  onSaved: (evidence: Omit<ControlEvidence, "id" | "registeredBy">) => void
}

/** Registro de evidencia de un control (inmutable una vez guardada). Reemplaza la vista del panel. */
export function EvidenceForm({ control, onCancel, onSaved }: Props) {
  const today = todayIsoDate()
  const [executedAt, setExecutedAt] = useState(today)
  const [result, setResult] = useState<EvidenceResult | "">("")
  const [notes, setNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()

  function validate(): Errors {
    const e: Errors = {}
    if (!executedAt) e.executedAt = "Indica la fecha de ejecución."
    else if (executedAt > today) e.executedAt = "La fecha de ejecución no puede ser futura."
    if (!result) e.result = "Elige el resultado del control."
    if (file && file.size > MAX_BYTES) e.file = "El archivo supera 25 MB. Adjunta uno más liviano."
    return e
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0 || !result) return
    startTransition(async () => {
      const res = await registerEvidence({ controlId: control.id, executedAt, result, notes: notes.trim(), fileName: file?.name ?? null })
      if (!res.ok) return setErrors({ form: res.error })
      // Mediodía en Bogotá: evita que la fecha cambie al formatearla.
      onSaved({ executedAt: `${executedAt}T12:00:00-05:00`, result, notes: notes.trim(), fileName: file?.name ?? null })
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-h3">Registrar evidencia</h3>
        <p className="text-small text-texto-sec">{control.description}</p>
      </div>

      <Field id="ev-fecha" label="Fecha de ejecución" error={errors.executedAt} required>
        {(aria) => <Input {...aria} type="date" max={today} value={executedAt} onChange={(e) => setExecutedAt(e.target.value)} className="md:max-w-48" />}
      </Field>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.result ? "ev-resultado-error" : undefined}>
        <legend className="mb-1.5 text-label">
          Resultado <span className="text-texto-sec">(obligatorio)</span>
        </legend>
        <RadioGroup value={result} onValueChange={(v) => setResult(v as EvidenceResult)} className="flex flex-wrap gap-x-6 gap-y-1" aria-invalid={errors.result ? true : undefined}>
          {(["efectivo", "no_efectivo"] as const).map((v) => (
            <Label key={v} htmlFor={`ev-${v}`} className="flex min-h-11 items-center gap-2 text-body font-normal md:min-h-8">
              <RadioGroupItem id={`ev-${v}`} value={v} />
              {v === "efectivo" ? "Efectivo" : "No efectivo"}
            </Label>
          ))}
        </RadioGroup>
        {errors.result && (
          <p id="ev-resultado-error" className="text-small text-error-texto">
            {errors.result}
          </p>
        )}
      </fieldset>

      <Field id="ev-notas" label="Observaciones">
        {(aria) => <Textarea {...aria} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué se verificó y qué se encontró" />}
      </Field>

      <Field id="ev-archivo" label="Archivo de soporte" help="Opcional. PDF, imagen u hoja de cálculo de hasta 25 MB." error={errors.file}>
        {(aria) => <Input {...aria} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="py-1.5" />}
      </Field>

      <p className="flex items-start gap-2 text-small text-texto-sec">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Las evidencias no se pueden editar después de registrarse.
      </p>

      {errors.form && (
        <p role="alert" className="rounded-sm bg-error-suave px-3 py-2 text-small text-error-texto">
          {errors.form}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Registrar evidencia
        </Button>
      </div>
    </form>
  )
}
