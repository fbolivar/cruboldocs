"use client"

import { RefreshCwIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ReviewInputs } from "@/lib/types"

const FIELDS: { key: keyof ReviewInputs; label: string }[] = [
  { key: "satisfaccion", label: "Satisfacción del cliente" },
  { key: "retroalimentacion", label: "Retroalimentación / quejas" },
  { key: "proveedores", label: "Desempeño de proveedores" },
  { key: "recursos", label: "Adecuación de recursos" },
  { key: "mejora", label: "Oportunidades de mejora" },
]

/** Botón para recalcular el snapshot (solo en borrador). Stub; backend. */
export function RefreshSnapshotButton() {
  function run() {
    // TODO(backend): server action refreshReviewSnapshot.
    toast.success("Datos del sistema actualizados.")
  }
  return (
    <Button size="sm" variant="outline" onClick={run}>
      <RefreshCwIcon /> Actualizar datos del sistema
    </Button>
  )
}

/** Entradas de texto 9.3.2. Editables en borrador; solo lectura si el acta está cerrada. */
export function ReviewInputsForm({ inputs, editable }: { inputs: ReviewInputs; editable: boolean }) {
  const [values, setValues] = useState<ReviewInputs>(inputs)

  function save() {
    // TODO(backend): server action updateReview (entradas de texto).
    toast.success("Entradas guardadas.")
  }

  if (!editable) {
    return (
      <dl className="flex flex-col gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <dt className="text-caption text-texto-sec">{f.label}</dt>
            <dd className="whitespace-pre-line text-body">{values[f.key] || "—"}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`in-${f.key}`}>{f.label}</Label>
          <Textarea
            id={`in-${f.key}`}
            rows={2}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <div>
        <Button size="sm" variant="outline" onClick={save}>Guardar entradas</Button>
      </div>
    </div>
  )
}
