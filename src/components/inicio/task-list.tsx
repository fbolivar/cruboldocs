import Link from "next/link"

import { TaskRow } from "@/components/inicio/task-row"
import { Button } from "@/components/ui/button"
import { groupTasksByDue, type TaskGroupId } from "@/lib/domain/tasks"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"

export const TASKS_STEP = 25

const GROUP_STYLE: Record<TaskGroupId, { dot: string | null; text: string }> = {
  vencidas: { dot: "bg-error", text: "text-error-texto" },
  hoy: { dot: "bg-advertencia", text: "text-advertencia-texto" },
  proximas: { dot: null, text: "text-texto-sec" },
}

interface TaskListProps {
  /** Tareas ya filtradas por categoría. */
  tasks: Task[]
  visible: number
  /** URL que muestra 25 tareas más. */
  moreHref: string
}

/** Lista agrupada por vencimiento (Vencidas / Hoy / Próximas) con "Ver más" de 25 en 25. */
export function TaskList({ tasks, visible, moreHref }: TaskListProps) {
  const now = new Date()
  const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const shown = sorted.slice(0, visible)
  const groups = groupTasksByDue(shown, now)
  const remaining = sorted.length - shown.length
  const firstId = shown[0]?.id

  return (
    <div>
      {groups.map((g) => {
        const style = GROUP_STYLE[g.id]
        return (
          <section key={g.id} id={g.id} aria-labelledby={`grupo-${g.id}`} className="scroll-mt-20">
            <h3 id={`grupo-${g.id}`} className="flex items-center gap-2 px-4 pt-3 pb-1 md:px-6">
              {style.dot && <span aria-hidden="true" className={cn("size-2 rounded-full", style.dot)} />}
              <span className={cn("text-caption uppercase", style.text)}>{g.label}</span>
            </h3>
            <ul>
              {g.tasks.map((t) => (
                <TaskRow key={t.id} task={t} primary={t.id === firstId} now={now} />
              ))}
            </ul>
          </section>
        )
      })}
      {remaining > 0 && (
        <div className="border-t border-borde px-4 py-3 md:px-6">
          <Button asChild variant="ghost" size="sm" className="w-full md:w-auto">
            <Link href={moreHref} scroll={false} replace>
              Ver más tareas ({Math.min(remaining, TASKS_STEP)} de {remaining})
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
