import { LockIcon } from "lucide-react"
import type { Metadata } from "next"

import { CoursesBoard, CoursesSummaryBar } from "@/components/capacitacion/courses-board"
import { NewCourseSheet } from "@/components/capacitacion/courses-manage"
import { Page, PageHeader } from "@/components/shell/page"
import { EmptyState } from "@/components/ui/empty-state"
import { getCoursesSummary, getCurrentUser, listCourses, listProcesses } from "@/lib/data/queries"
import { canManageCourses, canSeeCourses } from "@/lib/domain/access"

export const metadata: Metadata = { title: "Capacitación" }

export default async function CapacitacionPage() {
  const user = await getCurrentUser()
  if (!canSeeCourses(user)) {
    return (
      <Page>
        <PageHeader title="Capacitación" />
        <EmptyState icon={LockIcon} title="No tienes acceso a la capacitación" description="Si participas en el SIG de tu organización, pide acceso al administrador." />
      </Page>
    )
  }

  const canManage = canManageCourses(user)
  const [summary, items, processes] = await Promise.all([
    getCoursesSummary(),
    listCourses(),
    canManage ? listProcesses() : Promise.resolve([]),
  ])
  const processOptions = processes.map((p) => ({ id: p.id, name: p.name }))

  return (
    <Page wide>
      <PageHeader
        title="Capacitación"
        actions={canManage ? <NewCourseSheet processes={processOptions} /> : undefined}
      />
      <div className="flex flex-col gap-4 md:gap-6">
        <CoursesSummaryBar summary={summary} />
        <CoursesBoard items={items} />
      </div>
    </Page>
  )
}
