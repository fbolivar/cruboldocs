"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DIRECTION_LABELS, FREQUENCY_LABELS } from "@/components/indicadores/labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { IndicatorDirection, IndicatorFrequency } from "@/lib/types"

const DIRECTIONS = Object.keys(DIRECTION_LABELS) as IndicatorDirection[]
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as IndicatorFrequency[]

/** Crear un indicador (Líder SIG). El envío se conecta en la fase de backend. */
export function NewIndicatorSheet({ processes }: { processes: { id: string; code: string }[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [process, setProcess] = useState("")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [direction, setDirection] = useState<IndicatorDirection>("mayor_mejor")
  const [target, setTarget] = useState("")
  const [targetMax, setTargetMax] = useState("")
  const [tolerance, setTolerance] = useState("")
  const [frequency, setFrequency] = useState<IndicatorFrequency>("mensual")
  const [owner, setOwner] = useState("")
  const [isRate, setIsRate] = useState(false)

  function submit() {
    if (name.trim().length < 3 || !process || !unit.trim() || target.trim() === "") {
      toast.error("Indica nombre, proceso, unidad y meta.")
      return
    }
    if (direction === "rango" && targetMax.trim() === "") {
      toast.error("Indica la meta máxima del rango.")
      return
    }
    // TODO(backend): server action createIndicator.
    toast.success("Indicador creado.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><PlusIcon /> Nuevo indicador</Button>
      </SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Nuevo indicador</SheetTitle>
          <SheetDescription>Define el KPI de un proceso: meta, sentido y frecuencia.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="ind-name">Nombre</Label>
            <Input id="ind-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cumplimiento de entregas a tiempo" />
          </div>
          <div className={field}>
            <Label>Proceso</Label>
            <Select value={process} onValueChange={setProcess}>
              <SelectTrigger><SelectValue placeholder="Proceso dueño" /></SelectTrigger>
              <SelectContent>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Cargo que captura las mediciones" />
          </div>
          <label className="flex items-center gap-2 text-small">
            <input type="checkbox" checked={isRate} onChange={(e) => setIsRate(e.target.checked)} className="size-4 accent-acento" />
            Indicador de tasa (se captura numerador / denominador)
          </label>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Crear indicador</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
