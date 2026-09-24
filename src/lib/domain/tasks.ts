import { daysFromToday } from "@/lib/format"
import type { Task, TaskCategory, TaskType } from "@/lib/types"

export const TASK_META: Record<TaskType, { label: string; verb: string; category: TaskCategory }> = {
  revisar: { label: "Revisar", verb: "Revisar", category: "documentos" },
  aprobar: { label: "Aprobar", verb: "Aprobar", category: "documentos" },
  corregir: { label: "Corregir", verb: "Corregir", category: "documentos" },
  atender_solicitud: { label: "Atender solicitud", verb: "Atender solicitud", category: "documentos" },
  confirmar_lectura: { label: "Confirmar lectura", verb: "Leer", category: "documentos" },
  revisar_documento_vencido: { label: "Revisión vencida", verb: "Revisar documento", category: "documentos" },
  ejecutar_control: { label: "Ejecutar control", verb: "Registrar evidencia", category: "riesgos" },
  recertificar_accesos: { label: "Recertificar accesos", verb: "Recertificar", category: "accesos" },
}

export type TaskGroupId = "vencidas" | "hoy" | "proximas"

export interface TaskGroup {
  id: TaskGroupId
  label: string
  tasks: Task[]
}

/** Agrupa por vencimiento (Vencidas / Hoy / Próximas) y ordena por fecha dentro de cada grupo. */
export function groupTasksByDue(tasks: Task[], now: Date = new Date()): TaskGroup[] {
  const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const groups: TaskGroup[] = [
    { id: "vencidas", label: "Vencidas", tasks: [] },
    { id: "hoy", label: "Hoy", tasks: [] },
    { id: "proximas", label: "Próximas", tasks: [] },
  ]
  for (const t of sorted) {
    const d = daysFromToday(t.dueDate, now)
    groups[d < 0 ? 0 : d === 0 ? 1 : 2].tasks.push(t)
  }
  return groups.filter((g) => g.tasks.length > 0)
}

export function countByCategory(tasks: Task[]): Record<TaskCategory | "todas", number> {
  const counts = { todas: tasks.length, documentos: 0, riesgos: 0, accesos: 0 }
  for (const t of tasks) counts[TASK_META[t.type].category]++
  return counts
}
