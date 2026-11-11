import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ChangeStatusBadge, ChangeStepper, ChangeTypeChip } from "@/components/cambios/badges"
import { ChangeDecisionActions, EditChangeButton, ImpactPanel, ImplementChangeAction } from "@/components/cambios/change-detail"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getChange, getCurrentUser, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeChanges } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Solicitud de cambio" }

export default async function ChangePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeChanges(user)) notFound()

  const c = await getChange(decodeURIComponent(codigo))
  if (!c) notFound()
  const [processes, positions] = await Promise.all([
    c.canManage ? listProcesses() : Promise.resolve([]),
    c.canManage ? listPositions() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/cambios" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Gestión del cambio
      </Link>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{c.code}</p>
              <h1 className="mt-0.5">{c.title}</h1>
            </div>
            <EditChangeButton change={c} processes={processOptions} positions={positionOptions} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChangeTypeChip changeType={c.changeType} />
            <ChangeStatusBadge status={c.status} />
            {c.processName && <span className="text-small text-texto-sec">· Proceso {c.processName}</span>}
          </div>
          <p className="text-small text-texto-sec">
            {c.requestedByName ? `Solicitado por ${c.requestedByName} · ` : ""}{formatDate(c.requestDate)}
            {c.approverName ? ` · Decidió ${c.approverName}` : ""}{c.decisionDate ? ` (${formatDate(c.decisionDate)})` : ""}
          </p>
          {c.description && <p className="text-body">{c.description}</p>}
        </div>

        <Card className="p-4"><ChangeStepper status={c.status} /></Card>

        <Card>
          <CardHeader><CardTitle>Análisis de impacto</CardTitle></CardHeader>
          <CardContent><ImpactPanel change={c} /></CardContent>
        </Card>

        {(c.status === "en_evaluacion" || c.status === "aprobado") && (
          <Card>
            <CardHeader><CardTitle>Decisión</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ChangeDecisionActions change={c} approverPositionId={user.positionId} />
              <ImplementChangeAction change={c} />
              {c.status === "en_evaluacion" && !c.canApprove && <p className="text-small text-texto-sec">La aprobación o rechazo la realiza el Líder SIG.</p>}
            </CardContent>
          </Card>
        )}

        {c.implementationNotes && (
          <Card>
            <CardHeader><CardTitle>Implementación</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body">{c.implementationNotes}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={c.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
