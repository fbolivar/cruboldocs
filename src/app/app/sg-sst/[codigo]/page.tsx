import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { SstScoreGauge } from "@/components/sg-sst/badges"
import {
  CloseEvaluationButton, ExportSstCsvButton, HazardLink, ReadOnlyNote, SstActionsPanel, SstStandards,
} from "@/components/sg-sst/evaluation-detail"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, getSstEvaluation, listPositions } from "@/lib/data/queries"
import { canSeeSst } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Autoevaluación SG-SST" }

export default async function SstEvaluationPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeSst(user)) notFound()

  const e = await getSstEvaluation(decodeURIComponent(codigo))
  if (!e) notFound()
  const positions = e.canManage ? await listPositions() : []
  const positionOptions = positions.map((p) => ({ id: p.id, name: p.name }))
  const readOnly = !e.canManage || e.status === "cerrada"
  const hasPeligros = e.items.some((i) => i.component === "peligros_riesgos")

  return (
    <Page wide>
      <Link href="/app/sg-sst" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> SG-SST
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{e.code}</p>
              <h1 className="mt-0.5">Autoevaluación {e.period}</h1>
              <p className="mt-0.5 text-small text-texto-sec">Nivel {e.tier} estándares · {e.workerCount} trabajadores · clase de riesgo {e.riskClass}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {e.status === "cerrada" ? <Badge tone="neutro">Cerrada</Badge> : <Badge tone="advertencia">Borrador</Badge>}
              <ExportSstCsvButton code={e.code} />
              {e.canManage && e.status === "borrador" && <CloseEvaluationButton evaluationId={e.id} />}
            </div>
          </div>
          <Card className="p-4"><SstScoreGauge score={e.score} rating={e.rating} /></Card>
          {readOnly && e.status === "cerrada" && <ReadOnlyNote />}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Estándares</CardTitle>
            {hasPeligros && <HazardLink />}
          </CardHeader>
          <CardContent>
            <SstStandards items={e.items} phases={e.phases} readOnly={readOnly} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <SstActionsPanel evaluationId={e.id} items={e.items} actions={e.actions} canManage={e.canManage && e.status === "borrador"} positions={positionOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={e.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}
