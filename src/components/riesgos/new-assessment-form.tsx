"use client"

import type * as React from "react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ProbabilityImpactPicker } from "@/components/riesgos/probability-impact-picker"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { addAssessment } from "@/lib/data/actions"
import { riskLevel, riskScore } from "@/lib/domain/risk"
import type { AssessmentKind, PersonRef, RiskAssessment } from "@/lib/types"

interface Props {
  riskId: string
  me: PersonRef
  onCancel: () => void
  onSaved: (a: RiskAssessment) => void
}

/** Nueva valoración: se agrega al historial, nunca sobrescribe la anterior. */
export function NewAssessmentForm({ riskId, me, onCancel, onSaved }: Props) {
  const [kind, setKind] = useState<AssessmentKind>("residual")
  const [pi, setPi] = useState<{ probability: number | null; impact: number | null }>({ probability: null, impact: null })
  const [errors, setErrors] = useState<{ probability?: string; impact?: string; form?: string }>({})
  const [pending, startTransition] = useTransition()

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const e = {
      probability: pi.probability ? undefined : "Elige la probabilidad.",
      impact: pi.impact ? undefined : "Elige el impacto.",
    }
    setErrors(e)
    const { probability, impact } = pi
    if (!probability || !impact) return
    startTransition(async () => {
      const res = await addAssessment(riskId, kind, probability, impact)
      if (!res.ok) return setErrors({ form: res.error })
      const score = riskScore(probability, impact)
      toast.success("Valoración registrada")
      onSaved({ id: `nueva-${Date.now()}`, kind, probability, impact, score, level: riskLevel(score), assessedBy: me, assessedAt: new Date().toISOString() })
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 rounded-md border border-borde bg-fondo p-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-label">Tipo de valoración</legend>
        <RadioGroup value={kind} onValueChange={(v) => setKind(v as AssessmentKind)} className="flex gap-6">
          {(["residual", "inherente"] as const).map((k) => (
            <Label key={k} htmlFor={`nv-${k}`} className="flex min-h-11 items-center gap-2 text-body font-normal md:min-h-8">
              <RadioGroupItem id={`nv-${k}`} value={k} />
              {k === "residual" ? "Residual" : "Inherente"}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <ProbabilityImpactPicker idPrefix="nv" probability={pi.probability} impact={pi.impact} onChange={setPi} errors={errors} />
      {errors.form && (
        <p role="alert" className="text-small text-error-texto">
          {errors.form}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Guardar valoración
        </Button>
      </div>
    </form>
  )
}
