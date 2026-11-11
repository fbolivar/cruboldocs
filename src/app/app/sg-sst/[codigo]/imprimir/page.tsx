import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReportField, ReportSection, ReportShell, ReportTable } from "@/components/informes/report"
import { SST_ACTION_LABELS, SST_COMPONENT_LABELS, SST_ITEM_LABELS, SST_RATING_LABELS } from "@/components/sg-sst/labels"
import { getCurrentUser, getSstEvaluation } from "@/lib/data/queries"
import { canSeeSst } from "@/lib/domain/access"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = { title: "Informe · SG-SST", robots: { index: false, follow: false } }

export default async function SstReportPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeSst(user)) notFound()
  const e = await getSstEvaluation(decodeURIComponent(codigo))
  if (!e) notFound()

  return (
    <ReportShell
      backHref={`/app/sg-sst/${e.code}`}
      organizationName={user.organization.name}
      title={`Autoevaluación SG-SST (Res. 0312) — ${e.period}`}
      code={e.code}
      emittedBy={user.fullName}
    >
      <ReportSection title="Resultado">
        <dl>
          <ReportField label="Periodo" value={String(e.period)} />
          <ReportField label="Nivel (estándares)" value={`${e.tier}`} />
          <ReportField label="Trabajadores" value={String(e.workerCount)} />
          <ReportField label="Clase de riesgo" value={String(e.riskClass)} />
          <ReportField label="Puntaje" value={e.score != null ? `${e.score}%` : "—"} />
          <ReportField label="Valoración" value={e.rating ? SST_RATING_LABELS[e.rating] : "—"} />
        </dl>
      </ReportSection>

      <ReportSection title="Estándares mínimos">
        <ReportTable
          columns={["Código", "Estándar", "Componente", "Estado"]}
          rows={e.items.map((i) => [
            i.code, i.name, SST_COMPONENT_LABELS[i.component],
            i.applicable ? SST_ITEM_LABELS[i.status] : `${SST_ITEM_LABELS.no_aplica} (no aplica)`,
          ])}
        />
      </ReportSection>

      <ReportSection title="Plan de mejora">
        <ReportTable
          columns={["Estándar", "Acción", "Responsable", "Plazo", "Estado"]}
          rows={e.actions.map((a) => [
            a.standardCode, a.description, a.responsibleName ?? "—",
            a.dueDate ? formatDate(a.dueDate) : "—", SST_ACTION_LABELS[a.status],
          ])}
        />
      </ReportSection>
    </ReportShell>
  )
}
