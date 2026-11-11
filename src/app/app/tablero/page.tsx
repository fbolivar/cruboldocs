import { LayoutDashboardIcon, LockIcon } from "lucide-react"
import type { Metadata } from "next"
import { Fragment, type ReactNode } from "react"

import { ComplianceBar, HBar, PerspectiveBars, Sparkline } from "@/components/tablero/charts"
import { CsvButton } from "@/components/tablero/csv-button"
import { CustomizeDashboardSheet } from "@/components/tablero/customize-dashboard-sheet"
import { DashboardControls } from "@/components/tablero/dashboard-controls"
import { PrintHeader } from "@/components/tablero/print-header"
import { StatTile } from "@/components/tablero/stat-tile"
import { Page, PageHeader } from "@/components/shell/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getDashboard, getDashboardLayout } from "@/lib/data/queries"
import { canSeeDashboard } from "@/lib/domain/access"
import { isUuid } from "@/lib/data/queries"
import type { DashboardBlockKey } from "@/lib/types"

export const metadata: Metadata = { title: "Tablero" }

export default async function TableroPage({ searchParams }: { searchParams: Promise<{ proceso?: string; anio?: string; norma?: string }> }) {
  const user = await getCurrentUser()
  if (!canSeeDashboard(user)) {
    return (
      <Page>
        <PageHeader title="Tablero" />
        <EmptyState icon={LockIcon} title="No tienes acceso al tablero" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const sp = await searchParams
  const now = new Date().getFullYear()
  const year = sp.anio && /^\d{4}$/.test(sp.anio) ? Number(sp.anio) : now
  const processId = sp.proceso && isUuid(sp.proceso) ? sp.proceso : null
  const normId = sp.norma && isUuid(sp.norma) ? sp.norma : null
  const [d, layout] = await Promise.all([getDashboard({ processId, year, normId }), getDashboardLayout()])
  const processName = processId ? d.processes.find((p) => p.id === processId)?.name ?? null : null
  const normCode = normId ? d.norms.find((n) => n.id === normId)?.code ?? null : null

  const blocks: Record<DashboardBlockKey, ReactNode> = {
    kpi_mejora: (
      <Card className="p-4">
        <p className="mb-3 text-caption font-medium uppercase tracking-wide text-texto-sec">Mejora</p>
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="NC abiertas" value={d.nc.open} href="/app/no-conformidades" />
          <StatTile label="Acciones vencidas" value={d.nc.overdueActions} tone={d.nc.overdueActions > 0 ? "error" : "neutro"} href="/app/no-conformidades" />
        </div>
      </Card>
    ),
    kpi_desempeno: (
      <Card className="p-4">
        <p className="mb-3 text-caption font-medium uppercase tracking-wide text-texto-sec">Desempeño</p>
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="Cumplimiento indicadores" value={d.indicators.compliancePct === null ? "—" : `${d.indicators.compliancePct}%`} tone={d.indicators.compliancePct === null ? "neutro" : d.indicators.compliancePct >= 80 ? "exito" : d.indicators.compliancePct >= 60 ? "advertencia" : "error"} href="/app/indicadores" />
          <StatTile label="Auditorías (año)" value={d.audits.closedThisYear} detail="ver auditorías" href="/app/auditorias" />
          <StatTile label="Objetivos activos" value={d.objectives.active} href="/app/objetivos" />
          <StatTile label="Objetivos cumplidos" value={d.objectives.fulfilled} tone="exito" href="/app/objetivos" />
        </div>
      </Card>
    ),
    kpi_cliente: (
      <Card className="p-4">
        <p className="mb-3 text-caption font-medium uppercase tracking-wide text-texto-sec">Cliente</p>
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="PQRS abiertas" value={d.pqrs.open} href="/app/pqrs" />
          <StatTile label="PQRS vencidas" value={d.pqrs.overdue} tone={d.pqrs.overdue > 0 ? "error" : "neutro"} href="/app/pqrs" />
          <StatTile label="Satisfacción" value={d.satisfaction.lastScore === null ? "—" : `${Math.round(d.satisfaction.lastScore)}`} tone={d.satisfaction.lastScore === null ? "neutro" : d.satisfaction.lastScore >= 80 ? "exito" : d.satisfaction.lastScore >= 60 ? "advertencia" : "error"} href="/app/pqrs" />
        </div>
      </Card>
    ),
    kpi_documentos: (
      <Card className="p-4">
        <p className="mb-3 text-caption font-medium uppercase tracking-wide text-texto-sec">Documentos</p>
        <StatTile label="Por vencer (30 días)" value={d.documents.dueSoon} tone={d.documents.dueSoon > 0 ? "advertencia" : "neutro"} href="/app/documentos" />
      </Card>
    ),
    panel_nc: (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>No conformidades</CardTitle>
          <CsvButton panel="no-conformidades" processId={processId} year={year} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {d.nc.byStatus.length === 0 ? (
            <p className="text-small text-texto-sec">Sin no conformidades registradas.</p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-caption text-texto-sec">Por estado</p>
                <HBar rows={d.nc.byStatus} />
              </div>
              {d.nc.bySeverity.length > 0 && (
                <p className="text-caption text-texto-sec">
                  Severidad de las abiertas: {d.nc.bySeverity.map((s) => `${s.label} ${s.value}`).join(" · ")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    ),
    panel_indicadores: (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Indicadores por cumplimiento</CardTitle>
          <CsvButton panel="indicadores" processId={processId} year={year} />
        </CardHeader>
        <CardContent>
          <ComplianceBar cumple={d.indicators.cumple} atRisk={d.indicators.atRisk} notMeeting={d.indicators.notMeeting} withoutMeasurement={d.indicators.withoutMeasurement} />
        </CardContent>
      </Card>
    ),
    panel_objetivos: (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Objetivos por perspectiva (BSC)</CardTitle>
          <CsvButton panel="objetivos" processId={processId} year={year} />
        </CardHeader>
        <CardContent><PerspectiveBars rows={d.objectives.byPerspective} /></CardContent>
      </Card>
    ),
    panel_pqrs: (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>PQRS y satisfacción</CardTitle>
          <CsvButton panel="pqrs" processId={processId} year={year} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-small text-texto-sec">Abiertas {d.pqrs.open} · Vencidas {d.pqrs.overdue}</p>
          <Sparkline trend={d.satisfaction.trend} />
        </CardContent>
      </Card>
    ),
  }

  const visible = layout.filter((b) => b.visible)

  return (
    <Page wide>
      <PageHeader
        title="Tablero"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardControls processes={d.processes} norms={d.norms} processId={processId} year={year} normId={normId} />
            <CustomizeDashboardSheet initial={layout} />
          </div>
        }
      />
      <PrintHeader organizationName={user.organization.name} year={year} processName={processName} normCode={normCode} />

      {!d.hasAnyData ? (
        <EmptyState
          icon={LayoutDashboardIcon}
          title="Aún no hay datos del SGC"
          description="Cuando registres no conformidades, indicadores, objetivos o PQRS, los verás consolidados aquí."
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={LayoutDashboardIcon} title="Tu tablero está vacío" description="Usa «Personalizar» para mostrar los bloques que quieras ver." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
          {visible.map((b) => <Fragment key={b.key}>{blocks[b.key]}</Fragment>)}
        </div>
      )}
    </Page>
  )
}
