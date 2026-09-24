import { CheckIcon } from "lucide-react"
import Link from "next/link"

import { TaskFilter, type TaskFilterValue } from "@/components/inicio/task-filter"
import { TASKS_STEP, TaskList } from "@/components/inicio/task-list"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionError } from "@/components/ui/section-error"
import { getMyTasks } from "@/lib/data/queries"
import { countByCategory, TASK_META } from "@/lib/domain/tasks"
import type { CurrentUser, Task } from "@/lib/types"

const FILTER_EMPTY: Record<Exclude<TaskFilterValue, "todas">, string> = {
  documentos: "No tienes tareas de documentos pendientes.",
  riesgos: "No tienes tareas de riesgos pendientes.",
  accesos: "No tienes tareas de accesos pendientes.",
}

function moreHref(filter: TaskFilterValue, visible: number): string {
  const q = new URLSearchParams()
  if (filter !== "todas") q.set("tipo", filter)
  q.set("mostrar", String(visible + TASKS_STEP))
  return `/app?${q.toString()}`
}

async function loadTasks(user: CurrentUser): Promise<Task[] | null> {
  try {
    return await getMyTasks(user)
  } catch {
    return null
  }
}

/** Card protagonista "Mis tareas": filtro por tipo, lista agrupada y estados vacío/error. */
export async function TasksSection({ user, filter, visible }: { user: CurrentUser; filter: TaskFilterValue; visible: number }) {
  const tasks = await loadTasks(user)
  const filtered = tasks?.filter((t) => filter === "todas" || TASK_META[t.type].category === filter) ?? []

  return (
    <Card id="mis-tareas" role="region" className="scroll-mt-20 overflow-hidden" aria-labelledby="mis-tareas-titulo">
      <CardHeader className="pb-3 md:pb-3">
        <CardTitle id="mis-tareas-titulo">Mis tareas</CardTitle>
        {tasks && tasks.length > 0 && <TaskFilter value={filter} counts={countByCategory(tasks)} />}
      </CardHeader>
      {tasks === null ? (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <SectionError title="No pudimos cargar tus tareas." />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckIcon}
          tone="exito"
          title="Estás al día: no tienes tareas pendientes."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/app/documentos">Ir a documentos</Link>
            </Button>
          }
        />
      ) : filter !== "todas" && filtered.length === 0 ? (
        <p className="border-t border-borde px-4 py-8 text-center text-texto-sec md:px-6">
          {FILTER_EMPTY[filter]}{" "}
          <Link href="/app#mis-tareas" scroll={false} replace className="font-medium text-acento underline-offset-4 hover:underline">
            Ver todas
          </Link>
        </p>
      ) : (
        <TaskList tasks={filtered} visible={visible} moreHref={moreHref(filter, visible)} />
      )}
    </Card>
  )
}
