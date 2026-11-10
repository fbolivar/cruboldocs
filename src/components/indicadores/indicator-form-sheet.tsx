"use client"

import { PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { DIRECTION_LABELS, FREQUENCY_LABELS } from "@/components/indicadores/labels"
import { createIndicator, updateIndicator } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { IndicatorDetail, IndicatorDirection, IndicatorFrequency } from "@/lib/types"

const DIRECTIONS = Object.keys(DIRECTION_LABELS) as IndicatorDirection[]
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as IndicatorFrequency[]

type Processes = { id: string; code: string }[]
type Positions = { id: string; name: string }[]

/** Crear un indicador (Líder SIG). */
export function NewIndicatorSheet({ processes, positions }: { processes: Processes; positions: Positions }) {
  return (
    <IndicatorFormSheet
      processes={processes}
      positions={positions}
      trigger={<Button><PlusIcon /> Nuevo indicador</Button>}
    />
  )
}

/** Editar la definición (Líder SIG). */
export function EditIndicatorSheet({ indicator, processes, positions }: { indicator: IndicatorDetail; processes: Processes; positions: Positions }) {
  return (
    <IndicatorFormSheet
      indicator={indicator}
      processes={processes}
      positions={positions}
      trigger={<Button size="sm" variant="outline"><PencilIcon /> Editar</Button>}
    />
  )
}

function IndicatorFormSheet({
  indicator,
  processes,
  positions,
  trigger,
}: {
  indicator?: IndicatorDetail
  processes: Processes
  positions: Positions
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const editing = !!indicator

  const [name, setName] = useState(indicator?.name ?? "")
  const [process, setProcess] = useState("")
  const [description, setDescription] = useState(indicator?.description ?? "")
  const [unit, setUnit] = useState(indicator?.unit ?? "")
  const [direction, setDirection] = useState<IndicatorDirection>(indicator?.direction ?? "mayor_mejor")
  const [target, setTarget] = useState(indicator ? String(indicator.target) : "")
  const [targetMax, setTargetMax] = useState(indicator?.targetMax != null ? String(indicator.targetMax) : "")
  const [tolerance, setTolerance] = useState(indicator?.tolerancePct != null ? String(indicator.tolerancePct) : "")
  const [frequency, setFrequency] = useState<IndicatorFrequency>(indicator?.frequency ?? "mensual")
  const [owner, setOwner] = useState("")
  const [isRate, setIsRate] = useState(indicator?.isRate ?? false)

  function submit() {
    if (name.trim().length < 3 || (!editing && !process) || !unit.trim() || target.trim() === "") {
      toast.error("Indica nombre, proceso, unidad y meta.")
      return
    }
    if (direction === "rango" && targetMax.trim() === "") {
      toast.error("Indica la meta máxima del rango.")
      return
    }
    const payload = {
      name,
      description: description || undefined,
      unit,
      direction,
      target: Number(target),
      targetMax: direction === "rango" ? Number(targetMax) : null,
      tolerancePct: tolerance.trim() === "" ? null : Number(tolerance),
      frequency,
      ownerId: owner || null,
      isRate,
    }
    start(async () => {
      if (editing) {
        const r = await updateIndicator(indicator!.id, payload)
        if (!r.ok) { toast.error(r.error); return }
        toast.success("Indicador actualizado.")
      } else {
        const r = await createIndicator({ ...payload, processId: process })
        if (!r.ok) { toast.error(r.error); return }
        toast.success(`Indicador ${r.data.code} creado.`)
      }
      setOpen(false)
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>{editing ? "Editar indicador" : "Nuevo indicador"}</SheetTitle>
          <SheetDescription>Define el KPI de un proceso: meta, sentido y frecuencia.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="ind-name">Nombre</Label>
            <Input id="ind-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cumplimiento de entregas a tiempo" />
          </div>
          {!editing && (
            <div className={field}>
              <Label>Proceso</Label>
              <Select value={process} onValueChange={setProcess}>
                <SelectTrigger><SelectValue placeholder="Proceso dueño" /></SelectTrigger>
                <SelectContent>
                  {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={field}>
            <Label htmlFor="ind-desc">Descripción / fórmula (opcional)</Label>
            <Textarea id="ind-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cómo se calcula" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="ind-unit">Unidad</Label>
              <Input id="ind-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%  ·  días  ·  pts" />
            </div>
            <div className={field}>
              <Label>Sentido</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as IndicatorDirection)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{DIRECTION_LABELS[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="ind-target">{direction === "rango" ? "Meta mín" : "Meta"}</Label>
              <Input id="ind-target" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            {direction === "rango" && (
              <div className={field}>
                <Label htmlFor="ind-targetmax">Meta máx</Label>
                <Input id="ind-targetmax" type="number" value={targetMax} onChange={(e) => setTargetMax(e.target.value)} />
              </div>
            )}
            <div className={field}>
              <Label htmlFor="ind-tol">Tolerancia % (opcional)</Label>
              <Input id="ind-tol" type="number" value={tolerance} onChange={(e) => setTolerance(e.target.value)} placeholder="10" />
            </div>
          </div>
          <div className={field}>
            <Label>Frecuencia</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as IndicatorFrequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label>Responsable (opcional)</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger><SelectValue placeholder="Cargo que captura las mediciones" /></SelectTrigger>
              <SelectContent>
                {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-small">
            <input type="checkbox" checked={isRate} onChange={(e) => setIsRate(e.target.checked)} className="size-4 accent-acento" />
            Indicador de tasa (se captura numerador / denominador)
          </label>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit} loading={pending}>{editing ? "Guardar cambios" : "Crear indicador"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
