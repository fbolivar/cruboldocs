"use client"

import { CheckIcon, LockIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { CommitmentStatusBadge } from "@/components/actas/badges"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { MinuteDetail } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
const stub = () => toast.info("Disponible al conectar el backend.")

/** Editar / Cerrar acta — solo en borrador y si gestiona. */
export function MinuteHeaderActions({ minute, processes }: { minute: MinuteDetail; processes: Option[] }) {
  if (minute.status !== "borrador" || !minute.canManage) return null
  return (
    <div className="flex flex-wrap gap-2">
      <EditMinuteSheet minute={minute} processes={processes} />
      <CloseMinuteButton />
    </div>
  )
}

function CloseMinuteButton() {
  function cerrar() {
    if (!confirm("¿Cerrar esta acta? Quedará en solo lectura; sus compromisos se podrán seguir cumpliendo.")) return
    stub()
  }
  return <Button variant="outline" size="sm" onClick={cerrar}><LockIcon /> Cerrar acta</Button>
}

function EditMinuteSheet({ minute, processes }: { minute: MinuteDetail; processes: Option[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(minute.title)
  const [type, setType] = useState(minute.meetingType)
  const [date, setDate] = useState(minute.meetingDate)
  const [processId, setProcessId] = useState(minute.processId ?? "")
  const [attendees, setAttendees] = useState(minute.attendees ?? "")
  const [agenda, setAgenda] = useState(minute.agenda ?? "")

  function submit() {
    if (title.trim().length < 3) { toast.error("Indica el título del acta."); return }
    stub(); setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar acta</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="em-title">Título</Label>
            <Input id="em-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comité">Comité</SelectItem>
                  <SelectItem value="seguimiento">Seguimiento</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}><Label htmlFor="em-date">Fecha</Label>
              <input id="em-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={dateInput} />
            </div>
          </div>
          <div className={field}><Label>Proceso</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="em-att">Asistentes</Label>
            <Textarea id="em-att" rows={2} value={attendees} onChange={(e) => setAttendees(e.target.value)} />
            <p className="text-caption text-texto-sec">Dato personal: registra solo los nombres necesarios.</p>
          </div>
          <div className={field}><Label htmlFor="em-agenda">Temas / orden del día</Label>
            <Textarea id="em-agenda" rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Guardar cambios</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Lista de compromisos + agregar (solo borrador) + marcar cumplido (mientras el compromiso siga pendiente). */
export function CommitmentsSection({ minute, positions }: { minute: MinuteDetail; positions: Option[] }) {
  const canAdd = minute.status === "borrador" && minute.canManage
  return (
    <div className="flex flex-col gap-3">
      {minute.commitments.length === 0 ? (
        <EmptyState
          icon={CheckIcon}
          title="Esta acta aún no tiene compromisos."
          description={canAdd ? "Agrega el primero con «Agregar compromiso»." : undefined}
        />
      ) : (
        <ul className="divide-y divide-borde">
          {minute.commitments.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-body">{c.description}</p>
                <p className="mt-0.5 text-caption text-texto-sec">
                  Resp.: {c.responsibleName ?? "—"}{c.dueDate ? ` · Vence ${formatDate(c.dueDate)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CommitmentStatusBadge status={c.status} />
                {minute.canManage && c.status === "pendiente" && (
                  <Button variant="outline" size="sm" onClick={stub}><CheckIcon /> Marcar cumplido</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canAdd && <div><AddCommitmentSheet positions={positions} /></div>}
    </div>
  )
}

function AddCommitmentSheet({ positions }: { positions: Option[] }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [responsible, setResponsible] = useState("")
  const [due, setDue] = useState("")

  function submit() {
    if (description.trim().length < 3) { toast.error("Describe el compromiso."); return }
    stub(); setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Agregar compromiso</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo compromiso</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className={field}><Label htmlFor="cm-desc">Descripción</Label>
            <Textarea id="cm-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className={field}><Label>Responsable (opcional)</Label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger><SelectValue placeholder="Cargo responsable" /></SelectTrigger>
              <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="cm-due">Plazo (opcional)</Label>
            <input id="cm-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={dateInput} />
          </div>
          <p className="text-caption text-texto-sec">Se creará una tarea para el cargo responsable, con recordatorio al vencer.</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Agregar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
