"use client"

import { ChevronLeftIcon, XIcon } from "lucide-react"
import type * as React from "react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { type ControlErrors, validateControl } from "@/components/riesgos/control-fields"
import type { Option } from "@/components/riesgos/filter-controls"
import { IdentifyControls, type KeyedControl } from "@/components/riesgos/identify-controls"
import {
  EMPTY_IDENTIFICATION,
  IdentifyFields,
  type IdentificationDraft,
  type IdentificationErrors,
  validateIdentification,
} from "@/components/riesgos/identify-fields"
import { ProbabilityImpactPicker } from "@/components/riesgos/probability-impact-picker"
import { Button } from "@/components/ui/button"
import { FormSection } from "@/components/ui/field"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { createRisk } from "@/lib/data/actions"
import { useUrlState } from "@/lib/use-url-state"

interface Props {
  processes: Option[]
  categories: Option[]
  positions: Option[]
}

type PI = { probability: number | null; impact: number | null }

/** Formulario "Identificar riesgo" (`?identificar=1`): identificación, valoración inherente y controles. */
export function IdentifyRiskSheet({ processes, categories, positions }: Props) {
  const { set } = useUrlState()
  const [ident, setIdent] = useState<IdentificationDraft>(EMPTY_IDENTIFICATION)
  const [pi, setPi] = useState<PI>({ probability: null, impact: null })
  const [controls, setControls] = useState<KeyedControl[]>([])
  const [errors, setErrors] = useState<IdentificationErrors>({})
  const [piErrors, setPiErrors] = useState<{ probability?: string; impact?: string }>({})
  const [controlErrors, setControlErrors] = useState<Record<number, ControlErrors>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const close = () => set({ identificar: null })

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const e = validateIdentification(ident)
    const pe = { probability: pi.probability ? undefined : "Elige la probabilidad.", impact: pi.impact ? undefined : "Elige el impacto." }
    const ce = Object.fromEntries(controls.map((c) => [c.key, validateControl(c)]).filter(([, v]) => Object.keys(v).length > 0))
    setErrors(e)
    setPiErrors(pe)
    setControlErrors(ce)
    const { probability, impact } = pi
    if (Object.keys(e).length > 0 || !probability || !impact || Object.keys(ce).length > 0) {
      setFormError("Revisa los campos marcados.")
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await createRisk({
        ...ident,
        description: ident.description.trim(),
        cause: ident.cause.trim(),
        consequence: ident.consequence.trim(),
        probability,
        impact,
        controls: controls.map(({ key: _key, ...c }) => ({ ...c, description: c.description.trim(), frequency: c.frequency.trim() })),
      })
      if (!res.ok) return setFormError(res.error)
      toast.success(`Riesgo ${res.data.code} creado`)
      set({ identificar: null, riesgo: res.data.id })
    })
  }

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" size="lg" showCloseButton={false} className="gap-0 bg-superficie">
        <form noValidate onSubmit={onSubmit} className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-borde px-4 pt-2 pb-4 sm:px-6 sm:pt-5">
            <div className="flex flex-col gap-1">
              <Button type="button" variant="ghost" className="-ml-2 self-start px-2 sm:hidden" onClick={close}>
                <ChevronLeftIcon aria-hidden="true" />
                Riesgos
              </Button>
              <SheetTitle className="font-display text-h2">Identificar riesgo</SheetTitle>
              <SheetDescription className="text-small text-texto-sec">La valoración inherente se guarda como primera entrada del historial.</SheetDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={close} aria-label="Cerrar">
              <XIcon aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 sm:px-6">
            <IdentifyFields value={ident} errors={errors} processes={processes} categories={categories} positions={positions} onChange={setIdent} />
            <FormSection title="Valoración inherente">
              <ProbabilityImpactPicker idPrefix="ir" probability={pi.probability} impact={pi.impact} onChange={setPi} errors={piErrors} />
            </FormSection>
            <IdentifyControls controls={controls} errors={controlErrors} positions={positions} onChange={setControls} />
          </div>

          <div className="flex flex-col gap-3 border-t border-borde px-4 py-4 sm:px-6">
            {formError && (
              <p role="alert" className="text-small text-error-texto">
                {formError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" loading={pending}>
                Guardar riesgo
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
