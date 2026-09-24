"use client"

import { ChevronDownIcon, PlusIcon } from "lucide-react"
import { useState } from "react"

import { NewAssessmentForm } from "@/components/riesgos/new-assessment-form"
import { RiskLevelBadge } from "@/components/riesgos/risk-level-badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import type { AssessmentKind, PersonRef, RiskAssessment } from "@/lib/types"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<AssessmentKind, string> = { inherente: "Inherente", residual: "Residual" }

function MiniCard({ kind, a }: { kind: AssessmentKind; a: RiskAssessment | undefined }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md border border-borde p-3">
      <span className="text-small text-texto-sec">{KIND_LABEL[kind]}</span>
      {a ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-small">
            P{a.probability} × I{a.impact}
          </span>
          <RiskLevelBadge level={a.level} score={a.score} />
        </span>
      ) : (
        <span className="text-small text-texto-sec">Sin valorar</span>
      )}
    </div>
  )
}

interface Props {
  riskId: string
  me: PersonRef
  assessments: RiskAssessment[]
  canManage: boolean
  onAdded: (a: RiskAssessment) => void
}

/** Valoración vigente (inherente / residual), historial inmutable y nueva valoración (líder). */
export function AssessmentCards({ riskId, me, assessments, canManage, onAdded }: Props) {
  const [showHistory, setShowHistory] = useState(false)
  const [adding, setAdding] = useState(false)
  const latest = (k: AssessmentKind) => assessments.find((a) => a.kind === k)

  return (
    <section aria-labelledby="sec-valoracion" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="sec-valoracion" className="text-caption text-texto-sec uppercase">
          Valoración
        </h3>
        {canManage && !adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon aria-hidden="true" />
            Nueva valoración
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        <MiniCard kind="inherente" a={latest("inherente")} />
        <MiniCard kind="residual" a={latest("residual")} />
      </div>

      {adding && (
        <NewAssessmentForm
          riskId={riskId}
          me={me}
          onCancel={() => setAdding(false)}
          onSaved={(a) => {
            onAdded(a)
            setAdding(false)
          }}
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        className="self-start px-0 hover:bg-transparent hover:underline"
        aria-expanded={showHistory}
        aria-controls="historial-valoraciones"
        onClick={() => setShowHistory((v) => !v)}
      >
        Historial de valoraciones ({assessments.length})
        <ChevronDownIcon className={cn("transition-transform duration-150", showHistory && "rotate-180")} aria-hidden="true" />
      </Button>
      {showHistory && (
        <ol id="historial-valoraciones" className="flex flex-col">
          {assessments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-borde py-2.5 text-small first:border-t-0">
              <span className="w-20 text-texto-sec">{formatDate(a.assessedAt)}</span>
              <span className="w-16">{KIND_LABEL[a.kind]}</span>
              <span>
                P{a.probability} × I{a.impact}
              </span>
              <RiskLevelBadge level={a.level} score={a.score} />
              <span className="basis-full text-texto-sec sm:ml-auto sm:basis-auto">{a.assessedBy.fullName}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
