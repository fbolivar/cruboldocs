"use client"

import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { EditIndicatorSheet } from "@/components/indicadores/indicator-form-sheet"
import { archiveIndicator, unarchiveIndicator } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import type { IndicatorDetail } from "@/lib/types"

/** Editar / archivar la ficha (Líder SIG). */
export function IndicatorActions({
  indicator,
  processes,
  positions,
}: {
  indicator: IndicatorDetail
  processes: { id: string; code: string }[]
  positions: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function toggle() {
    start(async () => {
      const r = indicator.status === "activo" ? await archiveIndicator(indicator.id) : await unarchiveIndicator(indicator.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(indicator.status === "activo" ? "Indicador archivado." : "Indicador reactivado.")
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <EditIndicatorSheet indicator={indicator} processes={processes} positions={positions} />
      {indicator.status === "activo" ? (
        <Button size="sm" variant="outline" onClick={toggle} loading={pending}><ArchiveIcon /> Archivar</Button>
      ) : (
        <Button size="sm" variant="outline" onClick={toggle} loading={pending}><ArchiveRestoreIcon /> Reactivar</Button>
      )}
    </div>
  )
}
