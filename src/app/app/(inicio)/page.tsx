import type { Metadata } from "next"

import { ActivitySection } from "@/components/inicio/activity-section"
import { SummarySection } from "@/components/inicio/summary-section"
import { TaskCompletedToast } from "@/components/inicio/task-completed-toast"
import { parseTaskFilter } from "@/components/inicio/task-filter"
import { TASKS_STEP } from "@/components/inicio/task-list"
import { TasksSection } from "@/components/inicio/tasks-section"
import { Page, PageHeader } from "@/components/shell/page"
import { getCurrentUser } from "@/lib/data/queries"
import { greeting } from "@/lib/format"
import { param } from "@/lib/url"

export const metadata: Metadata = { title: "Inicio" }

/** Inicio / Bandeja: qué tengo que hacer hoy, y hacerlo con un clic. */
export default async function InicioPage(props: PageProps<"/app">) {
  const sp = await props.searchParams
  const user = await getCurrentUser()
  const filter = parseTaskFilter(param(sp, "tipo"))
  const requested = Number(param(sp, "mostrar"))
  const visible = Number.isFinite(requested) && requested > TASKS_STEP ? Math.ceil(requested / TASKS_STEP) * TASKS_STEP : TASKS_STEP
  const firstName = user.fullName.split(" ")[0]
  const context = [user.positionName, user.organization.name].filter(Boolean).join(" · ")

  return (
    <Page>
      <PageHeader title={`${greeting()}, ${firstName}`} description={<span className="text-small">{context}</span>} />
      <SummarySection user={user} />
      <TasksSection user={user} filter={filter} visible={visible} />
      <ActivitySection />
      <TaskCompletedToast show={param(sp, "completada") === "1"} />
    </Page>
  )
}
