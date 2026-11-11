import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { HazardClassChip, RiskLevelBadge } from "@/components/peligros/badges"
import { HazardHeaderActions } from "@/components/peligros/hazard-manage"
import { CLASS_LABELS, NC_OPTIONS, ND_OPTIONS, NE_OPTIONS, RISK_LEVEL_MEANING } from "@/components/peligros/labels"
import { Page } from "@/components/shell/page"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getHazard, listPositions, listProcesses } from "@/lib/data/queries"
import { canSeeHazards } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Peligro SST" }

const labelOf = (opts: { value: number; label: string }[], v: number) => opts.find((o) => o.value === v)?.label ?? String(v)

export default async function PeligroDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeHazards(user)) notFound()

  const h = await getHazard(decodeURIComponent(codigo))
  if (!h) notFound()

  const [processes, positions] = h.canManage ? await Promise.all([listProcesses(), listPositions()]) : [[], []]
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page>
      <Link href="/app/peligros" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Peligros SST
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{h.code}</p>
              <h1 className="mt-0.5">{h.hazard}</h1>
            </div>
            <HazardHeaderActions hazard={h} processes={processOptions} positions={positionOptions} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HazardClassChip classification={h.classification} />
            {h.status === "inactivo" ? <Badge tone="neutro">Inactivo</Badge> : <RiskLevelBadge level={h.riskLevel} />}
            {h.processName && <span className="text-small text-texto-sec">· Proceso {h.processName}</span>}
            {h.area && <span className="text-small text-texto-sec">· {h.area}</span>}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Valoración GTC-45</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Nivel de Deficiencia (ND)</dt><dd>{labelOf(ND_OPTIONS, h.nd)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Nivel de Exposición (NE)</dt><dd>{labelOf(NE_OPTIONS, h.ne)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Nivel de Consecuencia (NC)</dt><dd>{labelOf(NC_OPTIONS, h.nc)}</dd></div>
              <div><dt className="text-caption text-texto-sec">Nivel de Probabilidad (NP = ND×NE)</dt><dd>{h.np}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-texto-sec">Nivel de Riesgo (NR = NP×NC)</dt>
                <dd className="flex items-center gap-2"><span className="font-display text-h3 tabular-nums text-texto">{h.nr}</span> <RiskLevelBadge level={h.riskLevel} /> <span className="text-small text-texto-sec">{RISK_LEVEL_MEANING[h.riskLevel]}</span></dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Controles y medidas</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div><dt className="text-caption text-texto-sec">Clasificación</dt><dd className="text-body">{CLASS_LABELS[h.classification]}</dd></div>
            <div><dt className="text-caption text-texto-sec">Controles existentes</dt><dd className="text-body whitespace-pre-wrap">{h.existingControls ?? "—"}</dd></div>
            <div><dt className="text-caption text-texto-sec">Medidas de intervención</dt><dd className="text-body whitespace-pre-wrap">{h.intervention ?? "—"}</dd></div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <div><dt className="text-caption text-texto-sec">Responsable</dt><dd>{h.responsibleName ?? "—"}</dd></div>
              <div><dt className="text-caption text-texto-sec">Próxima revisión</dt><dd>{h.nextReviewDate ? formatDate(h.nextReviewDate) : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={h.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
