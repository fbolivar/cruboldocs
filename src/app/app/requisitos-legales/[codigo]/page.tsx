import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { ComplianceBadge, SourceChip } from "@/components/requisitos-legales/badges"
import { FREQUENCY_LABELS } from "@/components/requisitos-legales/labels"
import { RequirementEvaluations, RequirementHeaderActions } from "@/components/requisitos-legales/requirement-manage"
import { Page } from "@/components/shell/page"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getLegalRequirement, listProcesses } from "@/lib/data/queries"
import { canSeeLegal } from "@/lib/domain/access"
import { formatDate, todayIsoDate } from "@/lib/format"

export const metadata: Metadata = { title: "Requisito legal" }

export default async function RequisitoLegalDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeLegal(user)) notFound()

  const req = await getLegalRequirement(decodeURIComponent(codigo))
  if (!req) notFound()

  const processes = req.canManage ? await listProcesses() : []
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const overdue = req.status === "vigente" && req.nextEvalDate !== null && req.nextEvalDate < todayIsoDate()

  return (
    <Page>
      <Link href="/app/requisitos-legales" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Requisitos legales
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{req.code}</p>
              <h1 className="mt-0.5">{req.title}</h1>
            </div>
            <RequirementHeaderActions req={req} processes={processOptions} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SourceChip source={req.sourceType} />
            {req.status === "derogado" ? <Badge tone="neutro">Derogado</Badge> : <ComplianceBadge compliance={req.compliance} />}
            {req.processName && <span className="text-small text-texto-sec">· Proceso {req.processName}</span>}
            {req.status === "vigente" && req.nextEvalDate && (
              <span className={`text-small ${overdue ? "font-medium text-advertencia-texto" : "text-texto-sec"}`}>· Reevaluar {formatDate(req.nextEvalDate)}{overdue ? " (vencida)" : ""}</span>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-body whitespace-pre-wrap">{req.description}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Referencia</dt><dd>{req.reference}</dd></div>
              <div><dt className="text-caption text-texto-sec">Entidad emisora</dt><dd>{req.issuer ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Frecuencia</dt><dd>{FREQUENCY_LABELS[req.evalFrequency]}</dd></div>
              <div>
                <dt className="text-caption text-texto-sec">Enlace</dt>
                <dd>{req.url ? <a href={req.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-acento hover:underline">Ver norma <ExternalLinkIcon className="size-3.5" /></a> : "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Evaluaciones de cumplimiento</CardTitle></CardHeader>
          <CardContent><RequirementEvaluations req={req} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={req.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
