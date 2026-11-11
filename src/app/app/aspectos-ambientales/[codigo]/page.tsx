import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ConditionChip, SignificanceBadge } from "@/components/ambiental/badges"
import { AspectHeaderActions } from "@/components/ambiental/env-manage"
import { CRIT_OPTIONS } from "@/components/ambiental/labels"
import { NormCell } from "@/components/multinorma/norm-cell"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getEntityNorms, getEnvAspect, listActiveNorms, listLegalRequirements, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeEnv, canTagNorms } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Aspecto ambiental" }

const critLabel = (v: number) => CRIT_OPTIONS.find((o) => o.value === v)?.label ?? String(v)

export default async function AspectoDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeEnv(user)) notFound()

  const a = await getEnvAspect(decodeURIComponent(codigo))
  if (!a) notFound()

  const [processes, positions, legal, norms, tagged] = await Promise.all([
    a.canManage ? listProcesses() : Promise.resolve([]),
    a.canManage ? listPositions() : Promise.resolve([]),
    a.canManage ? listLegalRequirements() : Promise.resolve([]),
    listActiveNorms(),
    getEntityNorms("aspecto_ambiental", a.id),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))
  const legalOptions = legal.filter((r) => r.status === "vigente").map((r) => ({ id: r.id, label: `${r.code} · ${r.title}` }))

  return (
    <Page>
      <Link href="/app/aspectos-ambientales" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Aspectos ambientales
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{a.code}</p>
              <h1 className="mt-0.5">{a.aspect}</h1>
            </div>
            <AspectHeaderActions aspect={a} processes={processOptions} positions={positionOptions} legalOptions={legalOptions} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConditionChip condition={a.condition} />
            {a.status === "inactivo" ? <Badge tone="neutro">Inactivo</Badge> : <SignificanceBadge significance={a.significance} />}
            {a.processName && <span className="text-small text-texto-sec">· Proceso {a.processName}</span>}
          </div>
          {norms.length > 0 && (
            <div className="flex items-center gap-2 text-small text-texto-sec">
              <span>Normas:</span>
              <NormCell entityType="aspecto_ambiental" entityId={a.id} allNorms={norms} tagged={tagged} canManage={a.canManage && canTagNorms(user)} />
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Valoración (índice ambiental)</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Frecuencia</dt><dd>{critLabel(a.freq)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Severidad</dt><dd>{critLabel(a.sev)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Alcance</dt><dd>{critLabel(a.reach)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Cumplimiento legal</dt><dd>{critLabel(a.legalCrit)}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-texto-sec">Índice → Significancia</dt>
                <dd className="flex items-center gap-2"><span className="font-display text-h3 tabular-nums text-texto">{a.score}</span> <SignificanceBadge significance={a.significance} /></dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Actividad</dt><dd>{a.activity}</dd></div>
              <div><dt className="text-caption text-texto-sec">Impacto</dt><dd>{a.impact}</dd></div>
              <div className="sm:col-span-2"><dt className="text-caption text-texto-sec">Controles</dt><dd className="whitespace-pre-wrap">{a.controls ?? "—"}</dd></div>
              <div>
                <dt className="text-caption text-texto-sec">Requisito legal</dt>
                <dd>{a.legalRequirementCode ? <Link href={`/app/requisitos-legales/${a.legalRequirementCode}`} className="inline-flex items-center gap-1 text-acento hover:underline">{a.legalRequirementCode} <ExternalLinkIcon className="size-3.5" /></Link> : "—"}</dd>
              </div>
              <div><dt className="text-caption text-texto-sec">Responsable</dt><dd>{a.responsibleName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Próxima revisión</dt><dd>{a.nextReviewDate ? formatDate(a.nextReviewDate) : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={a.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
