import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ComplianceBadge } from "@/components/indicadores/badges"
import { IndicatorActions } from "@/components/indicadores/indicator-actions"
import { DIRECTION_LABELS, FREQUENCY_LABELS, formatPeriod, formatTarget } from "@/components/indicadores/labels"
import { MeasurementList } from "@/components/indicadores/measurement-list"
import { TrendChart } from "@/components/indicadores/trend-chart"
import { NcTimeline } from "@/components/no-conformidades/nc-timeline"
import { Page } from "@/components/shell/page"
import { Badge, Chip } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getIndicatorMock } from "@/lib/data/indicators-mock"
import { getCurrentUser } from "@/lib/data/queries"
import { canSeeIndicators } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Indicador" }

export default async function IndicatorPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeIndicators(user)) notFound()

  const indicator = getIndicatorMock(decodeURIComponent(codigo))
  if (!indicator) notFound()

  const trend = indicator.measurements.map((m) => ({ period: m.period, value: m.value, compliance: m.compliance })).reverse()

  return (
    <Page>
      <Link href="/app/indicadores" className="inline-flex items-center gap-1 text-small text-texto-sec hover:text-texto">
        <ChevronLeftIcon className="size-4" /> Indicadores
      </Link>

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small text-texto-sec">{indicator.code}</p>
              <h1 className="mt-0.5">{indicator.name}</h1>
            </div>
            {indicator.canManage && <IndicatorActions indicatorId={indicator.id} status={indicator.status} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ComplianceBadge status={indicator.lastCompliance} />
            {indicator.lastPeriod && <span className="text-small text-texto-sec">{formatPeriod(indicator.lastPeriod)}</span>}
            {indicator.processName && <Chip>{indicator.processName}</Chip>}
            {indicator.status === "archivado" && <Badge tone="neutro">Archivado</Badge>}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Definición</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-body md:grid-cols-3">
            <Dato label="Meta" value={formatTarget(indicator.direction, indicator.target, indicator.targetMax, indicator.unit)} />
            <Dato label="Unidad" value={indicator.unit} />
            <Dato label="Sentido" value={DIRECTION_LABELS[indicator.direction]} />
            <Dato label="Frecuencia" value={FREQUENCY_LABELS[indicator.frequency]} />
            <Dato label="Tolerancia" value={indicator.tolerancePct !== null ? `±${indicator.tolerancePct}%` : "±10%"} />
            <Dato label="Responsable" value={indicator.ownerName ?? "—"} />
            <div className="col-span-2 md:col-span-3">
              <p className="text-caption text-texto-sec">Cálculo</p>
              <p>{indicator.description || "Sin fórmula registrada."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tendencia</CardTitle></CardHeader>
          <CardContent>
            <TrendChart
              points={trend}
              unit={indicator.unit}
              direction={indicator.direction}
              target={indicator.target}
              targetMax={indicator.targetMax}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mediciones</CardTitle></CardHeader>
          <CardContent><MeasurementList indicator={indicator} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trazabilidad</CardTitle></CardHeader>
          <CardContent><NcTimeline events={indicator.timeline} /></CardContent>
        </Card>
      </div>
    </Page>
  )
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-texto-sec">{label}</p>
      <p>{value}</p>
    </div>
  )
}
