import { ClockIcon, FileTextIcon, ListChecksIcon, ShieldCheckIcon } from "lucide-react"

import { SetupChecklist } from "@/components/inicio/setup-checklist"
import { SummaryCard } from "@/components/inicio/summary-card"
import { SectionError } from "@/components/ui/section-error"
import { getHomeSummary, getSetupProgress } from "@/lib/data/queries"
import type { CurrentUser, HomeSummary, SetupProgress } from "@/lib/types"
import { cn } from "@/lib/utils"

async function load(user: CurrentUser): Promise<[HomeSummary, SetupProgress | null] | null> {
  try {
    return await Promise.all([getHomeSummary(user), user.isOrgAdmin ? getSetupProgress() : null])
  } catch {
    return null
  }
}

/**
 * Resumen de la bandeja (3–4 cifras clicables). Para el Admin de una organización
 * sin configurar (sin procesos o sin cargos con roles) se reemplaza por el checklist.
 */
export async function SummarySection({ user }: { user: CurrentUser }) {
  const data = await load(user)
  if (!data) return <SectionError title="No pudimos cargar el resumen." />
  const [summary, setup] = data
  if (setup && !(setup.hasProcesses && setup.hasPositionsWithRoles)) return <SetupChecklist progress={setup} />

  const overdue = summary.overdueTasks > 0
  return (
    <section
      aria-label="Resumen"
      className={cn("grid grid-cols-2 gap-3 md:gap-4", summary.pendingControls !== null ? "md:grid-cols-4" : "md:grid-cols-3")}
    >
      <SummaryCard icon={ListChecksIcon} value={summary.pendingTasks} label="Tareas pendientes" href="/app#mis-tareas" />
      <SummaryCard icon={ClockIcon} value={summary.overdueTasks} label="Vencidas" href={overdue ? "/app#vencidas" : "/app#mis-tareas"} alert={overdue} />
      <SummaryCard
        icon={FileTextIcon}
        value={summary.documentsDueForReview30d}
        label="Docs. por revisar (30 días)"
        href="/app/documentos?estado=vigente&orden=nextReview"
      />
      {summary.pendingControls !== null && (
        <SummaryCard icon={ShieldCheckIcon} value={summary.pendingControls} label="Controles pendientes" href="/app?tipo=riesgos#mis-tareas" />
      )}
    </section>
  )
}
