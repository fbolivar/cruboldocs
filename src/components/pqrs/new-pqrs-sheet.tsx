"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { CHANNEL_LABELS, PQRS_TYPE_LABELS } from "@/components/pqrs/labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { PqrsChannel, PqrsType } from "@/lib/types"

type ProcessOption = { id: string; name: string }
const TYPES = Object.keys(PQRS_TYPE_LABELS) as PqrsType[]
const CHANNELS = Object.keys(CHANNEL_LABELS) as PqrsChannel[]

export function ExportPqrsButton() {
  return (
    <Button variant="outline" onClick={() => toast.success("Exportación disponible cuando se conecte el backend.")}>
      <DownloadIcon /> Exportar CSV
    </Button>
  )
}

export function NewPqrsSheet({ processes }: { processes: ProcessOption[] }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PqrsType>("peticion")
  const [channel, setChannel] = useState<PqrsChannel>("correo")
  const [customerName, setCustomerName] = useState("")
  const [customerContact, setCustomerContact] = useState("")
  const [processId, setProcessId] = useState("")
  const [description, setDescription] = useState("")
  const [received, setReceived] = useState("")

  function submit() {
    if (description.trim().length < 5) { toast.error("Describe la PQRS."); return }
    if (!received) { toast.error("Indica la fecha de recepción."); return }
    // TODO(backend): createPqrs({ type, channel, customerName, customerContact, processId, description, received })
    toast.success("Disponible cuando se conecte el backend.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><PlusIcon /> Nueva PQRS</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva PQRS</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as PqrsType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{PQRS_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PqrsChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}>
            <Label htmlFor="pq-cn">Cliente (opcional)</Label>
            <Input id="pq-cn" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre" />
            <Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Contacto (correo o teléfono)" />
            <p className="text-caption text-texto-sec">Dato personal del cliente: registra solo lo necesario para responder.</p>
          </div>
          <div className={field}>
            <Label>Proceso (opcional)</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso dueño" /></SelectTrigger>
              <SelectContent>
                {processes.length === 0
                  ? <SelectItem value="none" disabled>(procesos al conectar el backend)</SelectItem>
                  : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="pq-desc">Descripción</Label>
            <Textarea id="pq-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className={field}>
            <Label htmlFor="pq-date">Fecha de recepción</Label>
            <input id="pq-date" type="date" value={received} onChange={(e) => setReceived(e.target.value)} className={dateInput} />
            <p className="text-caption text-texto-sec">El plazo se fija en +15 días; podrás ajustarlo en la ficha.</p>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Registrar PQRS</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
