import Link from "next/link"

import type { TaskCategory } from "@/lib/types"
import { cn } from "@/lib/utils"

export type TaskFilterValue = TaskCategory | "todas"

const OPTIONS: { value: TaskFilterValue; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "documentos", label: "Documentos" },
  { value: "riesgos", label: "Riesgos" },
  { value: "accesos", label: "Accesos" },
]

export function parseTaskFilter(value: string | undefined): TaskFilterValue {
  return OPTIONS.some((o) => o.value === value) ? (value as TaskFilterValue) : "todas"
}

/** Control segmentado Todas/Documentos/Riesgos/Accesos con conteo; el valor vive en la URL (`?tipo=`). */
export function TaskFilter({ value, counts }: { value: TaskFilterValue; counts: Record<TaskFilterValue, number> }) {
  return (
    <nav aria-label="Filtrar tareas por tipo" className="-mx-4 grow basis-full overflow-x-auto px-4 md:mx-0 md:grow-0 md:basis-auto md:px-0">
      <ul className="inline-flex gap-1 rounded-md bg-superficie-alt p-1">
        {OPTIONS.map((o) => {
          const active = o.value === value
          return (
            <li key={o.value}>
              <Link
                href={o.value === "todas" ? "/app#mis-tareas" : `/app?tipo=${o.value}#mis-tareas`}
                scroll={false}
                replace
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-sm px-3 text-label whitespace-nowrap transition-colors duration-150 ease-out md:h-8",
                  active ? "bg-superficie text-texto shadow-sm" : "text-texto-sec hover:text-texto"
                )}
              >
                {o.label}
                <span className={cn("tabular-nums", active ? "text-acento" : "text-texto-sec")}>{counts[o.value]}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
