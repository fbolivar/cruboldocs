"use client"

import { ExternalLinkIcon, FileWarningIcon, PencilIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { toast } from "sonner"

import { IncidentFields, incidentPayload, type IncidentFormState, type Option } from "@/components/incidentes/incident-form"
import { cancelIncident, closeIncident, generateNcFromIncident, setIncidentInvestigation, updateIncident } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { IncidentDetail } from "@/lib/types"

const isOpen = (s: IncidentDetail["status"]) => s === "reportado" || s === "en_investigacion"
const field = "flex flex-col gap-1.5"

/** ISO del servidor → "YYYY-MM-DDTHH:mm" local para datetime-local. */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function stateFrom(i: IncidentDetail): IncidentFormState {
  return {
    kind: i.kind, occurredAt: toLocalInput(i.occurredAt), location: i.location ?? "",
    processId: i.processId ?? "", hazardId: i.hazardId ?? "", description: i.description,
    immediateAction: i.immediateAction ?? "", severity: i.severity, affectedName: i.affectedName ?? "",
    affectedDocument: i.affectedDocument ?? "", affectedPositionId: i.affectedPositionId ?? "",
    injury: i.injury ?? "", bodyPart: i.bodyPart ?? "", lostDays: i.lostDays != null ? String(i.lostDays) : "",
  }
}

export function IncidentHeaderActions({ incident, processes, hazards, positions }: { incident: IncidentDetail; processes: Option[]; hazards: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!incident.canManage || !isOpen(incident.status)) return null
  function anular() {
    if (!confirm("¿Anular este incidente?")) return
    start(async () => {
      const r = await cancelIncident(incident.id, "")
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Incidente anulado."); router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap gap-2">
      <EditIncidentSheet incident={incident} processes={processes} hazards={hazards} positions={positions} />
      <Button variant="outline" size="sm" onClick={anular} loading={pending}>Anular</Button>
    </div>
  )
}

function EditIncidentSheet({ incident, processes, hazards, positions }: { incident: IncidentDetail; processes: Option[]; hazards: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<IncidentFormState>(() => stateFrom(incident))
  const set = useCallback(<K extends keyof IncidentFormState>(k: K, v: IncidentFormState[K]) => setState((s) => ({ ...s, [k]: v })), [])

  function submit() {
    if (state.description.trim().length < 3) { toast.error("Describe qué pasó."); return }
    start(async () => {
      const r = await updateIncident(incident.id, incidentPayload(state))
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Incidente actualizado."); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setState(stateFrom(incident)) }}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar incidente</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <IncidentFields state={state} set={set} processes={processes} hazards={hazards} positions={positions} />
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar cambios</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function AssignInvestigationSheet({ incident, positions }: { incident: IncidentDetail; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [investigator, setInvestigator] = useState(incident.investigatedByPositionId ?? "")
  if (!incident.canManage || !isOpen(incident.status)) return null

  function submit() {
    start(async () => {
      const r = await setIncidentInvestigation(incident.id, investigator || null, null)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Investigación asignada."); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><div><Button variant="outline" size="sm">{incident.investigatedAt ? "Reasignar investigación" : "Iniciar investigación"}</Button></div></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Investigación</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className={field}>
            <Label>Investigador (cargo)</Label>
            <Select value={investigator} onValueChange={setInvestigator}>
              <SelectTrigger><SelectValue placeholder="Cargo investigador" /></SelectTrigger>
              <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-caption text-texto-sec">La causa raíz y el plan de acción se registran en la no conformidad de investigación.</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function GenerateIncidentNcAction({ incident }: { incident: IncidentDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (incident.ncCode) {
    return (
      <Link href={`/app/no-conformidades/${incident.ncCode}`} className="inline-flex items-center gap-1 text-small font-medium text-acento hover:underline">
        <ExternalLinkIcon className="size-3.5" /> {incident.ncCode}{incident.ncStatus ? ` · ${incident.ncStatus}` : ""}
      </Link>
    )
  }
  if (!incident.canManage || incident.status === "anulado") {
    return <p className="text-small text-texto-sec">La investigación (causa raíz y acciones) se lleva en una no conformidad.</p>
  }
  function generate() {
    start(async () => {
      const r = await generateNcFromIncident(incident.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`No conformidad ${r.data.code} generada.`); router.refresh()
    })
  }
  return <Button size="sm" variant="outline" onClick={generate} loading={pending}><FileWarningIcon /> Generar NC de investigación</Button>
}

export function CloseIncidentButton({ incident }: { incident: IncidentDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!incident.canManage || !isOpen(incident.status)) return null
  const needsNc = incident.kind === "accidente" && !incident.ncCode
  const needsInvestigation = !incident.investigatedAt

  function run() {
    start(async () => {
      const r = await closeIncident(incident.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Incidente cerrado."); router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {needsInvestigation && <p className="text-caption text-advertencia-texto">Registra la investigación (asigna investigador) antes de cerrar.</p>}
      {needsNc && <p className="text-caption text-advertencia-texto">Un accidente exige generar la NC de investigación antes de cerrar.</p>}
      <Button onClick={run} loading={pending} disabled={needsInvestigation || needsNc}>Cerrar incidente</Button>
    </div>
  )
}
