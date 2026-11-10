"use client"

import { DownloadIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { OBJECTIVE_STATUS_LABELS, PERSPECTIVE_LABELS, PERSPECTIVE_ORDER } from "@/components/objetivos/labels"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { ObjectiveCardView, ObjectiveIndicatorRef, ObjectiveStatus, Perspective } from "@/lib/types"

type Option = { id: string; name: string }
const STATUSES = Object.keys(OBJECTIVE_STATUS_LABELS) as ObjectiveStatus[]
const field = "flex flex-col gap-1.5"
const stub = () => toast.info("Disponible al conectar el backend.")

export function ExportObjectivesButton() {
  return (
    <Button variant="outline" onClick={stub}>
      <DownloadIcon /> Exportar CSV
    </Button>
  )
}

/** Formulario compartido (crear / editar). */
function ObjectiveForm({ objective, indicators, processes, onDone }: {
  objective?: ObjectiveCardView
  indicators: ObjectiveIndicatorRef[]
  processes: Option[]
  onDone: () => void
}) {
  const [description, setDescription] = useState(objective?.description ?? "")
  const [perspective, setPerspective] = useState<Perspective>(objective?.perspective ?? "financiera")
  const [processId, setProcessId] = useState(objective?.processId ?? "")
  const [target, setTarget] = useState(objective?.targetText ?? "")
  const [horizon, setHorizon] = useState(objective?.horizonYear ? String(objective.horizonYear) : "")
  const [status, setStatus] = useState<ObjectiveStatus>(objective?.status ?? "activo")
  const [linked, setLinked] = useState<string[]>(objective?.indicatorIds ?? [])
  const isEdit = !!objective

  function toggle(id: string) {
    setLinked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit() {
    if (description.trim().length < 5) { toast.error("Describe el objetivo."); return }
    stub(); onDone()
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className={field}><Label htmlFor="ob-desc">Descripción</Label>
          <Textarea id="ob-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="p. ej. Reducir el costo de la no calidad" />
        </div>
        <div className={field}><Label>Perspectiva (BSC)</Label>
          <Select value={perspective} onValueChange={(v) => setPerspective(v as Perspective)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PERSPECTIVE_ORDER.map((p) => <SelectItem key={p} value={p}>{PERSPECTIVE_LABELS[p]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={field}><Label>Proceso (opcional)</Label>
          <Select value={processId} onValueChange={setProcessId}>
            <SelectTrigger><SelectValue placeholder="Proceso dueño" /></SelectTrigger>
            <SelectContent>
              {processes.length === 0
                ? <SelectItem value="none" disabled>(procesos al conectar el backend)</SelectItem>
                : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}><Label htmlFor="ob-target">Meta (opcional)</Label>
            <Input id="ob-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="p. ej. −15%" />
          </div>
          <div className={field}><Label htmlFor="ob-horizon">Año (opcional)</Label>
            <Input id="ob-horizon" inputMode="numeric" value={horizon} onChange={(e) => setHorizon(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2026" />
          </div>
        </div>
        {isEdit && (
          <div className={field}><Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ObjectiveStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{OBJECTIVE_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className={field}>
          <Label>Indicadores ligados (opcional)</Label>
          <div className="flex flex-col gap-1 rounded-md border border-borde p-2">
            {indicators.length === 0 ? (
              <p className="px-1 py-2 text-caption text-texto-sec">(indicadores al conectar el backend)</p>
            ) : indicators.map((ind) => (
              <label key={ind.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 hover:bg-superficie-alt">
                <Checkbox checked={linked.includes(ind.id)} onCheckedChange={() => toggle(ind.id)} />
                <span className="text-body">{ind.name}</span>
              </label>
            ))}
          </div>
          <p className="text-caption text-texto-sec">El avance se calcula del cumplimiento de estos indicadores.</p>
        </div>
      </div>
      <SheetFooter className="border-t border-borde"><Button onClick={submit}>{isEdit ? "Guardar cambios" : "Crear objetivo"}</Button></SheetFooter>
    </>
  )
}

export function NewObjectiveSheet({ indicators, processes }: { indicators: ObjectiveIndicatorRef[]; processes: Option[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button><PlusIcon /> Nuevo objetivo</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo objetivo</SheetTitle></SheetHeader>
        <ObjectiveForm indicators={indicators} processes={processes} onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

/** Sheet de edición controlado por el tablero (se abre al tocar una card). */
export function EditObjectiveSheet({ objective, indicators, processes, open, onOpenChange }: {
  objective: ObjectiveCardView | null
  indicators: ObjectiveIndicatorRef[]
  processes: Option[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar objetivo</SheetTitle></SheetHeader>
        {objective && <ObjectiveForm objective={objective} indicators={indicators} processes={processes} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}
