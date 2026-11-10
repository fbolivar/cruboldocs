"use client"

import { ExternalLinkIcon, PencilIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CHANNEL_LABELS, PQRS_STATUS_LABELS, PQRS_TYPE_LABELS } from "@/components/pqrs/labels"
import { cancelPqrs, closePqrs, generateNcFromPqrs, managePqrs, respondPqrs, updatePqrs } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { PqrsChannel, PqrsDetail, PqrsType } from "@/lib/types"

type Option = { id: string; name: string }
const TYPES = Object.keys(PQRS_TYPE_LABELS) as PqrsType[]
const CHANNELS = Object.keys(CHANNEL_LABELS) as PqrsChannel[]
const MANAGE_STATUS: PqrsDetail["status"][] = ["recibida", "en_gestion", "resuelta"]
const isOpenStatus = (s: PqrsDetail["status"]) => s === "recibida" || s === "en_gestion" || s === "resuelta"
const field = "flex flex-col gap-1.5"

export function PqrsHeaderActions({ pqrs, processes }: { pqrs: PqrsDetail; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!isOpenStatus(pqrs.status)) return null
  function anular() {
    if (!confirm("¿Anular esta PQRS?")) return
    start(async () => {
      const r = await cancelPqrs(pqrs.id, "")
      if (!r.ok) { toast.error(r.error); return }
      toast.success("PQRS anulada."); router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap gap-2">
      <EditPqrsSheet pqrs={pqrs} processes={processes} />
      <Button variant="outline" size="sm" onClick={anular} loading={pending}>Anular</Button>
    </div>
  )
}

function EditPqrsSheet({ pqrs, processes }: { pqrs: PqrsDetail; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PqrsType>(pqrs.type)
  const [channel, setChannel] = useState<PqrsChannel>(pqrs.channel)
  const [customerName, setCustomerName] = useState(pqrs.customerName ?? "")
  const [customerContact, setCustomerContact] = useState(pqrs.customerContact ?? "")
  const [processId, setProcessId] = useState(pqrs.processId ?? "")
  const [description, setDescription] = useState(pqrs.description)
  const [received, setReceived] = useState(pqrs.receivedDate)
  const [due, setDue] = useState(pqrs.dueDate)

  function submit() {
    if (description.trim().length < 5) { toast.error("Describe la PQRS."); return }
    start(async () => {
      const r = await updatePqrs(pqrs.id, {
        type, channel, customerName: customerName.trim() || undefined, customerContact: customerContact.trim() || undefined,
        processId: processId || null, description, receivedDate: received, dueDate: due,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("PQRS actualizada."); setOpen(false); router.refresh()
    })
  }

  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar PQRS</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as PqrsType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{PQRS_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PqrsChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}><Label htmlFor="ed-cn">Cliente</Label>
            <Input id="ed-cn" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre" />
            <Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Contacto" />
          </div>
          <div className={field}><Label>Proceso</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso dueño" /></SelectTrigger>
              <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="ed-desc">Descripción</Label>
            <Textarea id="ed-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="ed-rec">Recepción</Label>
              <input id="ed-rec" type="date" value={received} onChange={(e) => setReceived(e.target.value)} className={dateInput} />
            </div>
            <div className={field}><Label htmlFor="ed-due">Plazo</Label>
              <input id="ed-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={dateInput} />
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar cambios</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function PqrsManageActions({ pqrs, positions, processes }: { pqrs: PqrsDetail; positions: Option[]; processes: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [responsible, setResponsible] = useState("")
  const [processId, setProcessId] = useState(pqrs.processId ?? "")
  const [status, setStatus] = useState<PqrsDetail["status"]>(pqrs.status)
  if (!isOpenStatus(pqrs.status)) return null

  function submit() {
    start(async () => {
      const r = await managePqrs(pqrs.id, {
        responsibleId: responsible || null, processId: processId || null,
        status: (MANAGE_STATUS.includes(status) ? status : "en_gestion"),
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("PQRS actualizada."); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm">Asignar / cambiar estado</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Gestión de la PQRS</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className={field}><Label>Responsable</Label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger><SelectValue placeholder="Cargo responsable" /></SelectTrigger>
              <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Proceso</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso dueño" /></SelectTrigger>
              <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PqrsDetail["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MANAGE_STATUS.map((s) => <SelectItem key={s} value={s}>{PQRS_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function PqrsResponse({ pqrs }: { pqrs: PqrsDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(pqrs.response ?? "")
  const editable = isOpenStatus(pqrs.status) && pqrs.canManage

  function submit() {
    if (text.trim().length < 3) { toast.error("Escribe la respuesta al cliente."); return }
    start(async () => {
      const r = await respondPqrs(pqrs.id, text)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Respuesta registrada."); setOpen(false); router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {pqrs.response
        ? <p className="text-body whitespace-pre-wrap">{pqrs.response}</p>
        : <p className="text-small text-texto-sec">Aún sin respuesta registrada.</p>}
      {editable && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><div><Button size="sm">{pqrs.response ? "Editar respuesta" : "Registrar respuesta"}</Button></div></SheetTrigger>
          <SheetContent size="sm" className="gap-0 p-0">
            <SheetHeader className="border-b border-borde"><SheetTitle>Respuesta al cliente</SheetTitle></SheetHeader>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <Label htmlFor="pq-resp">Respuesta / resolución</Label>
              <Textarea id="pq-resp" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Qué se le responde al cliente" />
            </div>
            <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar respuesta</Button></SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

export function PqrsClose({ pqrs }: { pqrs: PqrsDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [satisfied, setSatisfied] = useState<"si" | "no">("si")
  if (!isOpenStatus(pqrs.status) || !pqrs.canManage) return null

  function submit() {
    if (!pqrs.response) { toast.error("Registra la respuesta antes de cerrar."); return }
    start(async () => {
      const r = await closePqrs(pqrs.id, satisfied === "si")
      if (!r.ok) { toast.error(r.error); return }
      toast.success("PQRS cerrada."); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><div><Button>Cerrar PQRS</Button></div></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Cerrar PQRS</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 p-4">
          {!pqrs.response && <p className="rounded-md bg-advertencia-suave p-3 text-small text-advertencia-texto">Debes registrar la respuesta antes de cerrar.</p>}
          <Label>¿El cliente quedó conforme?</Label>
          <div className="flex gap-2">
            <Button variant={satisfied === "si" ? "default" : "outline"} size="sm" onClick={() => setSatisfied("si")}>Sí</Button>
            <Button variant={satisfied === "no" ? "default" : "outline"} size="sm" onClick={() => setSatisfied("no")}>No</Button>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending} disabled={!pqrs.response}>Cerrar PQRS</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function PqrsNcAction({ pqrs }: { pqrs: PqrsDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (pqrs.type !== "reclamo") return null
  if (pqrs.nonconformityCode) {
    return (
      <Link href={`/app/no-conformidades/${pqrs.nonconformityCode}`} className="inline-flex items-center gap-1 text-small font-medium text-acento hover:underline">
        <ExternalLinkIcon className="size-3.5" /> {pqrs.nonconformityCode}
      </Link>
    )
  }
  if (!pqrs.canManage) return <p className="text-small text-texto-sec">Un reclamo puede generar una no conformidad.</p>
  function generate() {
    start(async () => {
      const r = await generateNcFromPqrs(pqrs.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`No conformidad ${r.data.code} generada.`); router.refresh()
    })
  }
  return <Button size="sm" variant="outline" onClick={generate} loading={pending}>Generar no conformidad</Button>
}
