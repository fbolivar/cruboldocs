import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { IncidentKindChip, IncidentStatusBadge, SeverityBadge } from "@/components/incidentes/badges"
import {
  AssignInvestigationSheet, CloseIncidentButton, GenerateIncidentNcAction, IncidentHeaderActions,
} from "@/components/incidentes/incident-actions"
import { IncidentStepper } from "@/components/incidentes/stepper"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getIncident, listHazards, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeIncidents } from "@/lib/domain/access"
import { formatDate, formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Incidente SST" }

export default async function IncidentePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeIncidents(user)) notFound()

  const inc = await getIncident(decodeURIComponent(codigo))
  if (!inc) notFound()

  const [processes, hazards, positions] = inc.canManage
    ? await Promise.all([listProcesses(), listHazards(), listPositions()])
    : [[], [], []]
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const hazardOptions = hazards.map((h) => ({ id: h.id, name: `${h.code} · ${h.hazard}` }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/incidentes" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Incidentes SST
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-small text-texto-sec">{inc.code}</p>
              <h1 className="mt-0.5">{inc.location ?? "Incidente SST"}</h1>
            </div>
            <IncidentHeaderActions incident={inc} processes={processOptions} hazards={hazardOptions} positions={positionOptions} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IncidentKindChip kind={inc.kind} />
            <SeverityBadge severity={inc.severity} />
            <IncidentStatusBadge status={inc.status} />
            {inc.processName && <span className="text-small text-texto-sec">· {inc.processName}</span>}
            <span className="text-small text-texto-sec">· {formatDateTime(inc.occurredAt)}</span>
          </div>
          <IncidentStepper status={inc.status} />
        </div>

        <Card>
          <CardHeader><CardTitle>Ocurrencia</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-body whitespace-pre-wrap">{inc.description}</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body sm:grid-cols-3">
              <div><dt className="text-caption text-texto-sec">Lugar</dt><dd>{inc.location ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Proceso</dt><dd>{inc.processName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Peligro asociado</dt><dd>{inc.hazardName ?? "—"}</dd></div>
            </dl>
            {inc.immediateAction && (
              <div><p className="text-caption text-texto-sec">Acción inmediata</p><p className="text-small whitespace-pre-wrap">{inc.immediateAction}</p></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trabajador afectado</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body sm:grid-cols-3">
              <div><dt className="text-caption text-texto-sec">Nombre</dt><dd>{inc.affectedName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Cargo</dt><dd>{inc.affectedPositionName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Documento</dt><dd>{inc.affectedDocument ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Lesión</dt><dd>{inc.injury ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Parte del cuerpo</dt><dd>{inc.bodyPart ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Días perdidos</dt><dd className="tabular-nums">{inc.lostDays ?? "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Investigación</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body sm:grid-cols-3">
              <div><dt className="text-caption text-texto-sec">Investigador</dt><dd>{inc.investigatedByPositionName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Investigado</dt><dd>{inc.investigatedAt ? formatDate(inc.investigatedAt) : "—"}</dd></div>
              <div>
                <dt className="text-caption text-texto-sec">Plazo (accidente)</dt>
                <dd className={inc.overdue ? "font-medium text-error-texto" : ""}>
                  {inc.investigationDue ? formatDate(inc.investigationDue) : "—"}{inc.overdue ? " (vencido)" : ""}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1">
              <p className="text-caption text-texto-sec">No conformidad de investigación (causa raíz 5 Porqués/Ishikawa + plan de acción)</p>
              <GenerateIncidentNcAction incident={inc} />
            </div>
            {inc.canManage && (inc.status === "reportado" || inc.status === "en_investigacion") && (
              <div className="flex flex-wrap items-center gap-2 border-t border-borde pt-3">
                <AssignInvestigationSheet incident={inc} positions={positionOptions} />
                <CloseIncidentButton incident={inc} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={inc.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
