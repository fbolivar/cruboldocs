"use client"

import { RefreshCwIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { refreshReviewSnapshot, updateReviewInputs } from "@/lib/data/actions"
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

/** Botón para recalcular el snapshot (solo en borrador). */
export function RefreshSnapshotButton({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      const r = await refreshReviewSnapshot(reviewId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Datos del sistema actualizados.")
      router.refresh()
    })
  }
  return (
    <Button size="sm" variant="outline" onClick={run} loading={pending}>
      <RefreshCwIcon /> Actualizar datos del sistema
    </Button>
  )
}

/** Entradas de texto 9.3.2. Editables en borrador; solo lectura si el acta está cerrada. */
export function ReviewInputsForm({
  reviewId,
  inputs,
  attendees,
  scope,
  editable,
}: {
  reviewId: string
  inputs: ReviewInputs
  attendees: string | null
  scope: string | null
  editable: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [values, setValues] = useState<ReviewInputs>(inputs)

  function save() {
    start(async () => {
      const r = await updateReviewInputs(reviewId, {
        attendees: attendees ?? undefined,
        scope: scope ?? undefined,
        inputs: values,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Entradas guardadas.")
      router.refresh()
    })
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
        <Button size="sm" variant="outline" onClick={save} loading={pending}>Guardar entradas</Button>
      </div>
    </div>
  )
}
