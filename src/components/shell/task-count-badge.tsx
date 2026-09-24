import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getMyTasks } from "@/lib/data/queries"
import type { CurrentUser } from "@/lib/types"

async function Count({ user }: { user: CurrentUser }) {
  // Dato vivo del shell: si falla o es 0, se oculta sin afectar la página (spec-shell §4).
  const n = await getMyTasks(user).then((t) => t.length, () => 0)
  if (n === 0) return null
  return (
    <span className="rounded-full bg-acento px-1.5 text-caption font-semibold tracking-normal text-superficie">
      {n}
      <span className="sr-only"> tareas pendientes</span>
    </span>
  )
}

/** Contador de tareas de Inicio; se transmite aparte para no bloquear la primera carga. */
export function TaskCountBadge({ user }: { user: CurrentUser }) {
  return (
    <Suspense fallback={<Skeleton className="size-5 rounded-full" />}>
      <Count user={user} />
    </Suspense>
  )
}
