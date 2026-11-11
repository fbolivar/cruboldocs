import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReportField, ReportSection, ReportShell, ReportTable } from "@/components/informes/report"
import { COMPLIANCE_LABELS } from "@/components/indicadores/labels"
import { getCurrentUser, getIndicatorSummary, listIndicators } from "@/lib/data/queries"
import { canSeeIndicators } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Informe · Indicadores", robots: { index: false, follow: false } }

export default async function IndicatorsReportPage() {
  const user = await getCurrentUser()
  if (!canSeeIndicators(user)) notFound()
  const [summary, indicators] = await Promise.all([getIndicatorSummary(), listIndicators()])

  return (
    <ReportShell
      backHref="/app/indicadores"
      organizationName={user.organization.name}
      title="Informe de indicadores (KPIs)"
      emittedBy={user.fullName}
    >
      <ReportSection title="Resumen del periodo">
        <dl>
          <ReportField label="Indicadores activos" value={String(summary.active)} />
          <ReportField label="Cumplimiento" value={summary.compliancePct != null ? `${summary.compliancePct}%` : "—"} />
          <ReportField label="En riesgo" value={String(summary.atRisk)} />
          <ReportField label="No cumplen" value={String(summary.notMeeting)} />
          <ReportField label="Sin medición del periodo" value={String(summary.withoutMeasurement)} />
        </dl>
      </ReportSection>

      <ReportSection title="Indicadores">
        <ReportTable
          columns={["Código", "Indicador", "Proceso", "Meta", "Última medición", "Cumplimiento"]}
          rows={indicators.map((i) => [
            i.code, i.name, i.processName ?? "—", `${i.target} ${i.unit}`,
            i.lastValue != null ? `${i.lastValue} ${i.unit}${i.lastPeriod ? ` (${formatDate(i.lastPeriod)})` : ""}` : "—",
            i.lastCompliance ? COMPLIANCE_LABELS[i.lastCompliance] : "—",
          ])}
        />
      </ReportSection>
    </ReportShell>
  )
}
