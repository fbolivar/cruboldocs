"use client"

import { ChevronLeftIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { EvidenceForm } from "@/components/riesgos/evidence-form"
import type { Option } from "@/components/riesgos/filter-controls"
import { RiskLevelBadge } from "@/components/riesgos/risk-level-badge"
import { RiskPanelDetail } from "@/components/riesgos/risk-panel-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionError } from "@/components/ui/section-error"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import type { Control, PersonRef, Risk } from "@/lib/types"
import { useUrlState } from "@/lib/use-url-state"

export interface PanelViewer {
  me: PersonRef
  positionId: string | null
  canManage: boolean
}

interface Props {
  risk: Risk | null
  viewer: PanelViewer
  positions: Option[]
}

/** Panel lateral del riesgo (`?riesgo=id`): 560px en escritorio, pantalla completa en móvil. */
export function RiskPanel({ risk, viewer, positions }: Props) {
  const { set } = useUrlState()
  const [controls, setControls] = useState<Control[]>(risk?.controls ?? [])
  const [assessments, setAssessments] = useState(risk?.assessments ?? [])
  const [evidenceFor, setEvidenceFor] = useState<Control | null>(null)
  const close = () => set({ riesgo: null })
  const residual = assessments.find((a) => a.kind === "residual") ?? assessments.find((a) => a.kind === "inherente")

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" size="lg" showCloseButton={false} className="gap-0 overflow-y-auto bg-superficie">
        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-borde bg-superficie px-4 pt-2 pb-4 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" className="-ml-2 px-2 sm:hidden" onClick={close}>
              <ChevronLeftIcon aria-hidden="true" />
              Riesgos
            </Button>
            {risk && (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-small text-texto-sec">{risk.code}</span>
                {residual && <RiskLevelBadge level={residual.level} score={residual.score} />}
                <Badge tone={risk.status === "activo" ? "info" : "neutro"}>{risk.status === "activo" ? "Activo" : "Cerrado"}</Badge>
              </span>
            )}
            <Button variant="ghost" size="icon" className="ml-auto hidden sm:inline-flex" onClick={close} aria-label="Cerrar panel">
              <XIcon aria-hidden="true" />
            </Button>
          </div>
          <SheetTitle className="font-display text-h2">{risk ? risk.description : "Riesgo no disponible"}</SheetTitle>
          <SheetDescription className="text-small text-texto-sec">
            {risk ? `${risk.processName} · Dueño: ${risk.ownerPositionName}` : "No pudimos abrir este riesgo."}
          </SheetDescription>
        </div>

        <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
          {!risk ? (
            <SectionError title="No pudimos cargar el riesgo." description="Puede que ya no exista o que haya un problema de conexión." />
          ) : evidenceFor ? (
            <>
              <Button variant="ghost" size="sm" className="-ml-2 self-start px-2" onClick={() => setEvidenceFor(null)}>
                <ChevronLeftIcon aria-hidden="true" />
                Volver al riesgo
              </Button>
              <EvidenceForm
                control={evidenceFor}
                onCancel={() => setEvidenceFor(null)}
                onSaved={(ev) => {
                  const id = evidenceFor.id
                  setControls((cs) =>
                    cs.map((c) => (c.id === id ? { ...c, overdue: false, lastEvidence: { ...ev, id: `ev-${Date.now()}`, registeredBy: viewer.me } } : c))
                  )
                  setEvidenceFor(null)
                  toast.success(`Evidencia registrada para ${risk.code}`)
                }}
              />
            </>
          ) : (
            <RiskPanelDetail
              risk={risk}
              assessments={assessments}
              controls={controls}
              viewer={viewer}
              positions={positions}
              onAssessmentAdded={(a) => setAssessments((as) => [a, ...as])}
              onControlAdded={(c) => setControls((cs) => [...cs, c])}
              onRegisterEvidence={setEvidenceFor}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
