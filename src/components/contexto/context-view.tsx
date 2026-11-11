"use client"

import { DownloadIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { PartiesList } from "@/components/contexto/parties-list"
import { SwotMatrix } from "@/components/contexto/swot-matrix"
import { exportContextIssuesCsv, exportInterestedPartiesCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ContextIssueView, ContextSummary, InterestedPartyView } from "@/lib/types"

type Option = { id: string; name: string }

function CsvButton({ label, run }: { label: string; run: () => Promise<string> }) {
  const [pending, start] = useTransition()
  return (
    <Button variant="outline" size="sm" loading={pending} onClick={() => start(async () => {
      try { downloadCsv(`${label}-${todayIsoDate()}.csv`, await run()) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })}><DownloadIcon /> Exportar CSV</Button>
  )
}

export function ContextView({
  summary, issues, parties, processes, objectives, positions, legal, canManage,
}: {
  summary: ContextSummary
  issues: ContextIssueView[]
  parties: InterestedPartyView[]
  processes: Option[]
  objectives: Option[]
  positions: Option[]
  legal: Option[]
  canManage: boolean
}) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Cuestiones", summary.total], ["Internas", summary.internal], ["Externas", summary.external], ["Partes interesadas", summary.parties]].map(([label, n]) => (
          <Card key={label} className="p-4">
            <p className="text-caption text-texto-sec">{label}</p>
            <p className="mt-1 font-display text-h2 tabular-nums text-texto">{n}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="analisis" className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="analisis">Análisis de contexto</TabsTrigger>
            <TabsTrigger value="partes">Partes interesadas</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="analisis" className="mt-4 flex flex-col gap-3">
          {issues.length > 0 && (
            <div className="flex justify-end"><CsvButton label="contexto-cuestiones" run={exportContextIssuesCsv} /></div>
          )}
          <SwotMatrix issues={issues} processes={processes} objectives={objectives} positions={positions} canManage={canManage} />
        </TabsContent>
        <TabsContent value="partes" className="mt-4 flex flex-col gap-3">
          {parties.length > 0 && (
            <div className="flex justify-end"><CsvButton label="partes-interesadas" run={exportInterestedPartiesCsv} /></div>
          )}
          <PartiesList parties={parties} processes={processes} legal={legal} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
