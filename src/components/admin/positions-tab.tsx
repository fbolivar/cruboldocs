import { BriefcaseIcon } from "lucide-react"

import { PositionDetail } from "@/components/admin/position-detail"
import { PositionList } from "@/components/admin/position-list"
import { PositionSheet } from "@/components/admin/position-sheet"
import { TabError } from "@/components/admin/tab-layout"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { listPositions, listProcesses } from "@/lib/data/queries"
import { param, type SearchParams } from "@/lib/url"
import type { Position, Process } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Cargos y roles: lista (320px) + detalle; en móvil, navegación en dos pasos con `?cargo=`. */
export async function PositionsTab({ sp }: { sp: SearchParams }) {
  let positions: Position[]
  let processes: Process[]
  try {
    ;[positions, processes] = await Promise.all([listPositions(), listProcesses()])
  } catch {
    return <TabError />
  }
  const processOptions = processes.map((p) => ({ value: p.id, label: p.name }))

  if (positions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BriefcaseIcon}
          title="Aún no has creado cargos."
          description="Los roles se asignan al cargo y las personas los heredan."
          action={<PositionSheet processes={processOptions} />}
        />
      </Card>
    )
  }

  const requested = param(sp, "cargo")
  const selected = positions.find((p) => p.id === requested) ?? positions[0]
  const detailStep = selected.id === requested

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      <PositionList
        positions={positions}
        selectedId={selected.id}
        action={<PositionSheet processes={processOptions} />}
        className={cn(detailStep && "hidden md:flex")}
      />
      <PositionDetail position={selected} processes={processOptions} className={cn(!detailStep && "hidden md:flex")} />
    </div>
  )
}
