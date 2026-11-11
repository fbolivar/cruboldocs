"use client"

import { DownloadIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { exportDashboardCsv, type DashboardCsvPanel } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"

/** Exporta un panel del tablero a CSV (respeta los filtros activos). */
export function CsvButton({ panel, processId, year }: { panel: DashboardCsvPanel; processId: string | null; year: number }) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try {
        const csv = await exportDashboardCsv(panel, { processId, year })
        downloadCsv(`tablero-${panel}-${todayIsoDate()}.csv`, csv)
      } catch {
        toast.error("No pudimos exportar el CSV.")
      }
    })
  }
  return (
    <button
      onClick={run}
      disabled={pending}
      className="inline-flex items-center gap-1 text-caption font-medium text-acento hover:underline disabled:opacity-50 print:hidden"
    >
      <DownloadIcon className="size-3.5" /> CSV
    </button>
  )
}
