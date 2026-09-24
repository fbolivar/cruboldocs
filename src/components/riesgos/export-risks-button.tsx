"use client"

import { DownloadIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { downloadCsv } from "@/lib/csv"
import { exportRisksCsv } from "@/lib/data/actions"
import type { RiskFilters } from "@/lib/types"

/** Exporta la lista con los filtros actuales a `matriz-riesgos-AAAA-MM-DD.csv`. */
export function ExportRisksButton({ filters }: { filters: RiskFilters }) {
  const [pending, startTransition] = useTransition()

  function onExport() {
    startTransition(async () => {
      try {
        const csv = await exportRisksCsv(filters)
        downloadCsv(`matriz-riesgos-${todayIsoDate()}.csv`, csv)
      } catch {
        toast.error("No pudimos exportar los riesgos. Inténtalo de nuevo.")
      }
    })
  }

  return (
    <Button variant="outline" loading={pending} onClick={onExport}>
      {!pending && <DownloadIcon aria-hidden="true" />}
      Exportar CSV
    </Button>
  )
}
