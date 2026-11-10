"use client"

import { PaperclipIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { NcActionStatusBadge } from "@/components/no-conformidades/badges"
import { ACTION_TYPE_LABELS } from "@/components/no-conformidades/labels"
import { Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { NcActionType, NcActionView } from "@/lib/types"
import { ListChecksIcon } from "lucide-react"

const TYPES = Object.keys(ACTION_TYPE_LABELS) as NcActionType[]

export function NcActionsPanel({
  actions,
  canManage,
  positions,
}: {
  actions: NcActionView[]
  canManage: boolean
  positions: string[]
}) {
  function complete(desc: string) {
    // TODO(backend): server action complete_nc_action.
    toast.success(`Acción marcada como hecha: ${desc.slice(0, 40)}…`)
  }
  function evidence() {
    toast.info("Registrar evidencia se habilita al conectar el backend.")
  }

  return (
    <div className="flex flex-col gap-3">
      {actions.length === 0 ? (
        <EmptyState
          icon={ListChecksIcon}
          title="Aún no hay acciones"
          description={canManage ? "Agrega la primera acción del plan." : "Un líder definirá el plan de acción."}
          action={canManage ? <AddActionSheet positions={positions} /> : undefined}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {actions.map((a) => {
              const closed = a.status === "hecha" || a.status === "cancelada"
              return (
                <li key={a.id} className="rounded-lg border border-borde bg-superficie p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Chip>{ACTION_TYPE_LABELS[a.type]}</Chip>
                      <NcActionStatusBadge status={a.status} />
                    </div>
                    <span className="inline-flex items-center gap-1 text-caption text-texto-sec">
                      {a.overdue && a.status !== "hecha" ? (
                        <span className="inline-flex items-center gap-1 text-error-texto">
                          <TriangleAlertIcon className="size-3.5" /> venció {formatDate(a.dueDate)}
                        </span>
                      ) : (
                        <>vence {formatDate(a.dueDate)}</>
                      )}
                    </span>
                  </div>
                  <p className="mt-1.5 text-body">{a.description}</p>
                  <p className="mt-0.5 text-caption text-texto-sec">Responsable: {a.responsiblePositionName}</p>
                  {a.evidences.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {a.evidences.map((e) => (
                        <li key={e.id} className="inline-flex items-center gap-1.5 text-caption text-texto-sec">
                          <PaperclipIcon className="size-3.5" /> {e.fileName} · {formatDate(e.registeredAt)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!closed && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => complete(a.description)}>Marcar hecha</Button>
                      <Button size="sm" variant="ghost" onClick={evidence}>
                        <PaperclipIcon /> Evidencia
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {canManage && (
            <div>
              <AddActionSheet positions={positions} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AddActionSheet({ positions }: { positions: string[] }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<NcActionType>("correctiva")
  const [description, setDescription] = useState("")
  const [responsible, setResponsible] = useState("")
  const [due, setDue] = useState("")

  function submit() {
    if (description.trim().length < 5 || !responsible || !due) {
      toast.error("Completa descripción, responsable y plazo.")
      return
    }
    // TODO(backend): server action add_nc_action.
    toast.success("Acción agregada al plan.")
    setOpen(false)
    setDescription("")
    setResponsible("")
    setDue("")
    setType("correctiva")
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline"><PlusIcon /> Agregar acción</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Agregar acción</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as NcActionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{ACTION_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="nc-act-desc">Descripción</Label>
            <Textarea id="nc-act-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué se hará" />
          </div>
          <div className={field}>
            <Label>Responsable (cargo)</Label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger><SelectValue placeholder="Cargo responsable" /></SelectTrigger>
              <SelectContent>
                {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="nc-act-due">Fecha límite</Label>
            <input id="nc-act-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Agregar acción</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
