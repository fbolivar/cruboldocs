"use client"

import { GraduationCapIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TrainingKindChip } from "@/components/competencias/badges"
import { TRAINING_KIND_LABELS } from "@/components/competencias/labels"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/format"
import type { TrainingKind, TrainingListItem } from "@/lib/types"

const KINDS = Object.keys(TRAINING_KIND_LABELS) as TrainingKind[]

export function TrainingList({ items, canManage }: { items: TrainingListItem[]; canManage: boolean }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCapIcon}
          title="Sin formaciones registradas"
          description="Registra la primera capacitación y sus asistentes."
          action={canManage ? <NewTrainingSheet /> : undefined}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {canManage && <div><NewTrainingSheet /></div>}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-borde">
          {items.map((t) => (
            <li key={t.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body">{t.title}</p>
                <TrainingKindChip kind={t.kind} />
              </div>
              <p className="mt-0.5 text-caption text-texto-sec">
                {t.provider ? `${t.provider} · ` : ""}{formatDate(t.trainingDate)}{t.hours ? ` · ${t.hours} h` : ""} · {t.attendeeCount} asistentes
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function NewTrainingSheet() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<TrainingKind>("interna")
  const [provider, setProvider] = useState("")
  const [date, setDate] = useState("")
  const [hours, setHours] = useState("")

  function submit() {
    if (title.trim().length < 3) { toast.error("Escribe el título de la formación."); return }
    if (!date) { toast.error("Indica la fecha."); return }
    // TODO(backend): createTraining({ title, kind, provider, date, hours, attendees })
    toast.success("Disponible cuando se conecte el backend.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><PlusIcon /> Nueva formación</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva formación</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="tr-title">Título</Label>
            <Input id="tr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className={field}>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as TrainingKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{TRAINING_KIND_LABELS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="tr-prov">Proveedor (opcional)</Label>
            <Input id="tr-prov" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="tr-date">Fecha</Label>
              <input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
            </div>
            <div className={field}>
              <Label htmlFor="tr-hours">Horas (opcional)</Label>
              <Input id="tr-hours" type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <p className="text-caption text-texto-sec">Los asistentes y sus certificados se agregan al conectar el backend.</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Crear formación</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
