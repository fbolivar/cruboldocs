"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { toast } from "sonner"

import { IncidentFields, incidentPayload, type IncidentFormState, type Option } from "@/components/incidentes/incident-form"
import { exportIncidentsCsv, reportIncident } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

/** Valor local "YYYY-MM-DDTHH:mm" para el input datetime-local (hora del navegador). */
function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function emptyState(): IncidentFormState {
  return {
    kind: "casi_accidente", occurredAt: nowLocal(), location: "", processId: "", hazardId: "",
    description: "", immediateAction: "", severity: "sin_lesion", affectedName: "", affectedDocument: "",
    affectedPositionId: "", injury: "", bodyPart: "", lostDays: "",
  }
}

export function ExportIncidentsButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try {
        downloadCsv(`incidentes-${todayIsoDate()}.csv`, await exportIncidentsCsv())
      } catch {
        toast.error("No pudimos exportar el CSV.")
      }
    })
  }
  return <Button variant="outline" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

export function ReportIncidentSheet({ processes, hazards, positions }: { processes: Option[]; hazards: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<IncidentFormState>(emptyState)
  const set = useCallback(<K extends keyof IncidentFormState>(k: K, v: IncidentFormState[K]) => setState((s) => ({ ...s, [k]: v })), [])

  function submit() {
    if (state.description.trim().length < 3) { toast.error("Describe qué pasó."); return }
    start(async () => {
      const r = await reportIncident(incidentPayload(state))
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Incidente ${r.data.code} reportado.`)
      setOpen(false); setState(emptyState())
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setState(emptyState()) }}>
      <SheetTrigger asChild><Button><PlusIcon /> Reportar incidente</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Reportar incidente</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <IncidentFields state={state} set={set} processes={processes} hazards={hazards} positions={positions} />
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Reportar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
