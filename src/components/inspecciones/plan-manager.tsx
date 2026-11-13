"use client"

import { ClipboardListIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CHARACTERISTIC_TYPE_LABELS, criterionText } from "@/components/inspecciones/labels"
import { createInspectionPlan, updateInspectionPlan } from "@/lib/data/actions"
import { Badge, Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { CharacteristicType, InspectionCharacteristic, InspectionPlanView } from "@/lib/types"

type Option = { id: string; name: string }
type Draft = { name: string; type: CharacteristicType; unit: string; min: string; max: string }

const emptyRow = (): Draft => ({ name: "", type: "numerico", unit: "", min: "", max: "" })

function toDraft(c: InspectionCharacteristic): Draft {
  return { name: c.name, type: c.type, unit: c.unit ?? "", min: c.min === null || c.min === undefined ? "" : String(c.min), max: c.max === null || c.max === undefined ? "" : String(c.max) }
}

export function PlanSheet({ plan, processes, trigger }: { plan?: InspectionPlanView; processes: Option[]; trigger: React.ReactNode }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(plan?.name ?? "")
  const [description, setDescription] = useState(plan?.description ?? "")
  const [processId, setProcessId] = useState(plan?.processId ?? "")
  const [active, setActive] = useState(plan?.isActive ?? true)
  const [rows, setRows] = useState<Draft[]>(plan ? plan.characteristics.map(toDraft) : [emptyRow()])

  function setRow(i: number, patch: Partial<Draft>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function submit() {
    if (name.trim().length < 2) { toast.error("Escribe el nombre del plan."); return }
    const chars = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        type: r.type,
        unit: r.type === "numerico" && r.unit.trim() ? r.unit.trim() : null,
        min: r.type === "numerico" && r.min.trim() ? Number(r.min) : null,
        max: r.type === "numerico" && r.max.trim() ? Number(r.max) : null,
      }))
    if (chars.length === 0) { toast.error("Agrega al menos una característica."); return }
    const input = { name: name.trim(), description: description.trim() || null, processId: processId || null, characteristics: chars }
    start(async () => {
      const r = plan ? await updateInspectionPlan(plan.id, input, active) : await createInspectionPlan({ ...input, processId: processId || null })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(plan ? "Plan actualizado." : "Plan creado.")
      setOpen(false)
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{plan ? "Editar plan" : "Nuevo plan de inspección"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="pl-name">Nombre</Label>
            <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Recepción de materia prima" />
          </div>
          <div className={field}>
            <Label htmlFor="pl-desc">Descripción (opcional)</Label>
            <Textarea id="pl-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label>Proceso (opcional)</Label>
              <Select value={processId} onValueChange={setProcessId}>
                <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
                <SelectContent>
                  {processes.length === 0
                    ? <SelectItem value="none" disabled>(sin procesos)</SelectItem>
                    : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {plan && (
              <div className={field}>
                <Label>Estado</Label>
                <Select value={active ? "activo" : "inactivo"} onValueChange={(v) => setActive(v === "activo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-caption font-medium text-texto-sec">Características</p>
            {rows.map((r, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-borde p-3">
                <div className="flex items-center gap-2">
                  <Input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Nombre de la característica" className="flex-1" aria-label="Nombre de la característica" />
                  <Button variant="ghost" size="icon-sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Quitar característica"><Trash2Icon /></Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Select value={r.type} onValueChange={(v) => setRow(i, { type: v as CharacteristicType })}>
                    <SelectTrigger className="col-span-2 sm:col-span-1" aria-label="Tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CHARACTERISTIC_TYPE_LABELS) as CharacteristicType[]).map((t) => <SelectItem key={t} value={t}>{CHARACTERISTIC_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {r.type === "numerico" && (
                    <>
                      <Input value={r.min} onChange={(e) => setRow(i, { min: e.target.value })} placeholder="Mín" inputMode="decimal" aria-label="Mínimo" />
                      <Input value={r.max} onChange={(e) => setRow(i, { max: e.target.value })} placeholder="Máx" inputMode="decimal" aria-label="Máximo" />
                      <Input value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} placeholder="Unidad" aria-label="Unidad" />
                    </>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setRows((rs) => [...rs, emptyRow()])}><PlusIcon /> Agregar característica</Button>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>{plan ? "Guardar cambios" : "Crear plan"}</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function InspectionPlanManager({ plans, processes, canManage }: { plans: InspectionPlanView[]; processes: Option[]; canManage: boolean }) {
  if (plans.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardListIcon}
          title="Aún no hay planes de inspección."
          description="Un plan define las características y criterios a verificar."
          action={canManage ? <PlanSheet processes={processes} trigger={<Button><PlusIcon /> Nuevo plan</Button>} /> : undefined}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex justify-end">
          <PlanSheet processes={processes} trigger={<Button><PlusIcon /> Nuevo plan</Button>} />
        </div>
      )}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-borde">
          {plans.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-body">{p.name}</p>
                  {!p.isActive && <Badge tone="neutro" plain>Inactivo</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-texto-sec">
                  <Chip>{p.characteristics.length} {p.characteristics.length === 1 ? "característica" : "características"}</Chip>
                  {p.processName && <span>· {p.processName}</span>}
                  {p.characteristics.length > 0 && <span>· {p.characteristics.map((c) => `${c.name} (${criterionText(c)})`).join(", ")}</span>}
                </div>
              </div>
              {canManage && <PlanSheet plan={p} processes={processes} trigger={<Button variant="ghost" size="icon-sm" aria-label="Editar plan"><PencilIcon /></Button>} />}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
