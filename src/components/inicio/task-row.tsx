import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/badge"
import { TASK_META } from "@/lib/domain/tasks"
import { dueLabel } from "@/lib/format"
import type { Task, TaskType } from "@/lib/types"

/** Cómo se nombra a quien originó la tarea, según su tipo. */
const ORIGIN_VERB: Partial<Record<TaskType, string>> = {
  revisar: "Envió",
  aprobar: "Envió",
  corregir: "Devolvió",
  atender_solicitud: "Solicitó",
}

/** Chip del tipo de tarea; ancho mínimo uniforme en escritorio para alinear la columna. */
export function TaskTypeChip({ type }: { type: TaskType }) {
  return <Chip className="md:min-w-36">{TASK_META[type].label}</Chip>
}

function secondaryLine(task: Task): string[] {
  const assigned = task.type === "confirmar_lectura" ? "Distribuido a" : "Asignada a"
  const parts = [`${assigned} ${task.assigneePositionName}`]
  if (task.originName) parts.push(`${ORIGIN_VERB[task.type] ?? "Originó"} ${task.originName}`)
  return parts
}

/**
 * Fila de tarea. Toda la fila es clicable mediante el enlace del botón (su área se
 * extiende a la fila con `after:`), así el botón es el único foco y no hay enlaces anidados.
 */
export function TaskRow({ task, primary, now }: { task: Task; primary: boolean; now: Date }) {
  const meta = TASK_META[task.type]
  const due = dueLabel(task.dueDate, now)
  const subject = [task.entityCode, task.title].filter(Boolean).join(" ")
  return (
    <li className="relative flex flex-col gap-2 border-t border-borde px-4 py-4 transition-colors duration-150 ease-out hover:bg-fondo md:flex-row md:items-center md:gap-4 md:px-6 md:py-3">
      <div className="flex items-center justify-between gap-2 md:contents">
        <TaskTypeChip type={task.type} />
        <span className="text-small text-texto-sec md:hidden">{due}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="wrap-break-word">
          {task.entityCode && (
            <>
              <span className="font-mono text-small">{task.entityCode}</span>
              <span className="text-texto-sec"> · </span>
            </>
          )}
          <span className="font-medium">{task.title}</span>
          {task.versionNo !== null && <span className="text-texto-sec"> v{task.versionNo}</span>}
          {task.detail && <span className="text-texto-sec"> · {task.detail}</span>}
        </p>
        <p className="text-small text-texto-sec">
          <span className="hidden md:inline">{due} · </span>
          {secondaryLine(task).join(" · ")}
        </p>
      </div>
      <Button asChild size="sm" variant={primary ? "default" : "outline"} className="w-full md:w-auto">
        <Link href={task.href} className="after:absolute after:inset-0">
          {meta.verb}
          <span className="sr-only">: {subject}</span>
        </Link>
      </Button>
    </li>
  )
}
