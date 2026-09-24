"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { AddControlForm } from "@/components/riesgos/add-control-form"
import { AssessmentCards } from "@/components/riesgos/assessment-cards"
import { ControlCard } from "@/components/riesgos/control-card"
import type { Option } from "@/components/riesgos/filter-controls"
import type { PanelViewer } from "@/components/riesgos/risk-panel"
import { Button } from "@/components/ui/button"
import type { Control, Risk, RiskAssessment } from "@/lib/types"

interface Props {
  risk: Risk
  assessments: RiskAssessment[]
  controls: Control[]
  viewer: PanelViewer
  positions: Option[]
  onAssessmentAdded: (a: RiskAssessment) => void
  onControlAdded: (c: Control) => void
  onRegisterEvidence: (c: Control) => void
}

/** Cuerpo del panel: Análisis, Valoración y Controles. */
export function RiskPanelDetail({ risk, assessments, controls, viewer, positions, onAssessmentAdded, onControlAdded, onRegisterEvidence }: Props) {
  const [addingControl, setAddingControl] = useState(false)

  return (
    <>
      <section aria-labelledby="sec-analisis" className="flex flex-col gap-3">
        <h3 id="sec-analisis" className="text-caption text-texto-sec uppercase">
          Análisis
        </h3>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-4">
          <dt className="text-small text-texto-sec">Causa</dt>
          <dd className="sm:col-span-3">{risk.cause}</dd>
          <dt className="text-small text-texto-sec">Consecuencia</dt>
          <dd className="sm:col-span-3">{risk.consequence}</dd>
          <dt className="text-small text-texto-sec">Categoría</dt>
          <dd className="sm:col-span-3">{risk.category}</dd>
        </dl>
      </section>

      <AssessmentCards riskId={risk.id} me={viewer.me} assessments={assessments} canManage={viewer.canManage} onAdded={onAssessmentAdded} />

      <section aria-labelledby="sec-controles" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="sec-controles" className="text-caption text-texto-sec uppercase">
            Controles ({controls.length})
          </h3>
          {viewer.canManage && !addingControl && (
            <Button variant="ghost" size="sm" onClick={() => setAddingControl(true)}>
              <PlusIcon aria-hidden="true" />
              Agregar control
            </Button>
          )}
        </div>
        {addingControl && (
          <AddControlForm
            riskId={risk.id}
            positions={positions}
            onCancel={() => setAddingControl(false)}
            onSaved={(c) => {
              onControlAdded(c)
              setAddingControl(false)
            }}
          />
        )}
        {controls.length === 0 ? (
          <p className="rounded-md border border-dashed border-borde-fuerte px-4 py-6 text-center text-small text-texto-sec">
            Este riesgo aún no tiene controles.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {controls.map((c) => (
              <ControlCard
                key={c.id}
                control={c}
                canRegister={viewer.positionId !== null && c.responsiblePositionId === viewer.positionId}
                onRegister={() => onRegisterEvidence(c)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
