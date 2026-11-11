import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReportField, ReportSection, ReportShell } from "@/components/informes/report"
import { PROCESS_TYPE_LABELS } from "@/components/procesos/labels"
import { getCurrentUser, getProcessDetail } from "@/lib/data/queries"
import { canSeeProcessMap } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Informe · Caracterización de proceso", robots: { index: false, follow: false } }

export default async function ProcessReportPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const user = await getCurrentUser()
  if (!canSeeProcessMap(user)) notFound()
  const p = await getProcessDetail(decodeURIComponent(codigo))
  if (!p) notFound()
  const c = p.characterization

  return (
    <ReportShell
      backHref={`/app/procesos/${p.code}`}
      organizationName={user.organization.name}
      title={`Caracterización de proceso — ${p.name}`}
      code={p.code}
      emittedBy={user.fullName}
    >
      <ReportSection title="Identificación">
        <dl>
          <ReportField label="Tipo" value={PROCESS_TYPE_LABELS[p.type]} />
          <ReportField label="Líder" value={p.leaderName} />
        </dl>
      </ReportSection>

      <ReportSection title="Caracterización (4.4)">
        <dl>
          <ReportField label="Objetivo" value={c.objective} />
          <ReportField label="Alcance" value={c.scope} />
          <ReportField label="Entradas" value={c.inputs} />
          <ReportField label="Proveedores" value={c.suppliers} />
          <ReportField label="Salidas" value={c.outputs} />
          <ReportField label="Clientes" value={c.clients} />
          <ReportField label="Recursos" value={c.resources} />
        </dl>
      </ReportSection>

      <ReportSection title="Ciclo PHVA">
        <dl>
          <ReportField label="Planear" value={c.phvaPlan} />
          <ReportField label="Hacer" value={c.phvaDo} />
          <ReportField label="Verificar" value={c.phvaCheck} />
          <ReportField label="Actuar" value={c.phvaAct} />
        </dl>
      </ReportSection>

      <ReportSection title="Ligado a este proceso">
        <dl>
          <ReportField label="Indicadores" value={String(p.linked.indicators)} />
          <ReportField label="Riesgos" value={String(p.linked.risks)} />
          <ReportField label="Documentos" value={String(p.linked.documents)} />
          <ReportField label="Objetivos" value={String(p.linked.objectives)} />
          <ReportField label="Requisitos legales" value={String(p.linked.legal)} />
          <ReportField label="Partes interesadas" value={String(p.linked.parties)} />
          <ReportField label="Cuestiones del contexto" value={String(p.linked.issues)} />
        </dl>
      </ReportSection>
    </ReportShell>
  )
}
