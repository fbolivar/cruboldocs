import { CalendarSyncIcon, CheckIcon } from "lucide-react"

import { RecertList } from "@/components/admin/recert-list"
import { TabError } from "@/components/admin/tab-layout"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { getRecertification } from "@/lib/data/queries"
import { formatDate } from "@/lib/format"
import type { RecertificationInfo } from "@/lib/types"

export async function RecertTab() {
  let info: RecertificationInfo
  try {
    info = await getRecertification()
  } catch {
    return <TabError />
  }
  // Vencidas primero; dentro de cada grupo, por fecha límite.
  const items = [...info.items].sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="inline-flex items-center gap-2 font-medium">
          <CalendarSyncIcon className="size-4 text-texto-sec" aria-hidden="true" />
          Cada {info.periodDays} días · próxima: {formatDate(info.nextDueDate)}
        </p>
        <p className="text-small text-texto-sec">
          Confirma si cada persona debe conservar su acceso. Las que revoques pierden el acceso al guardar.
        </p>
      </div>
      {items.length === 0 ? (
        <Card>
          <EmptyState icon={CheckIcon} tone="exito" title="No hay accesos por recertificar." description="Te avisaremos en la bandeja cuando llegue el próximo periodo." />
        </Card>
      ) : (
        <RecertList items={items} />
      )}
    </div>
  )
}
