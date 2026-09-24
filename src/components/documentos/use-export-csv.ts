"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { parseDocumentFilters, searchParamsToRecord } from "@/components/documentos/filter-params"
import { downloadCsv } from "@/lib/csv"
import { exportDocumentsCsv } from "@/lib/data/actions"
import { todayIsoDate } from "@/lib/format"

/** Exporta la lista maestra con los filtros actuales de la URL (sin paginar). */
export function useExportCsv() {
  const params = useSearchParams()
  const [exporting, setExporting] = useState(false)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const { page: _page, ...filters } = parseDocumentFilters(searchParamsToRecord(params))
      const csv = await exportDocumentsCsv(filters)
      const name = `lista-maestra-${todayIsoDate()}.csv`
      downloadCsv(name, csv)
      toast.success(`Descargamos ${name}.`)
    } catch {
      toast.error("No pudimos exportar la lista maestra. Inténtalo de nuevo.")
    } finally {
      setExporting(false)
    }
  }

  return { exportCsv, exporting }
}
