"use client"

import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createApprovalFlow, setFlowSteps, updateApprovalFlow } from "@/lib/data/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { WorkflowIcon } from "lucide-react"
import type { ApprovalFlowView } from "@/lib/types"

type PositionOption = { id: string; name: string }
type Step = { name: string; position: string }

function FlowEditor({
  flow, positions, trigger,
}: {
  flow: ApprovalFlowView | null
  positions: PositionOption[]
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(flow?.name ?? "")
  const [description, setDescription] = useState(flow?.description ?? "")
  const [isActive, setIsActive] = useState(flow?.isActive ?? true)
  const [steps, setSteps] = useState<Step[]>(flow?.steps.map((s) => ({ name: s.name, position: s.positionId })) ?? [])

  const field = "flex flex-col gap-1.5"
  const select = "h-11 w-full rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"

  function setStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function move(i: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function save() {
    if (name.trim().length < 2) { toast.error("Ponle un nombre al flujo."); return }
    if (steps.length < 1) { toast.error("Agrega al menos un paso."); return }
    if (steps.some((s) => s.name.trim().length < 1 || !s.position)) { toast.error("Cada paso necesita nombre y cargo."); return }
    start(async () => {
      let flowId = flow?.id
      if (!flowId) {
        const r = await createApprovalFlow({ name: name.trim(), description: description.trim() || undefined })
        if (!r.ok) { toast.error(r.error); return }
        flowId = r.data.id
      } else {
        const r = await updateApprovalFlow({ flowId, name: name.trim(), description: description.trim() || undefined, isActive })
        if (!r.ok) { toast.error(r.error); return }
      }
      const rs = await setFlowSteps({ flowId, steps: steps.map((s) => ({ name: s.name.trim(), position: s.position })) })
      if (!rs.ok) { toast.error(rs.error); return }
      toast.success(flow ? "Flujo actualizado." : "Flujo creado.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{flow ? "Editar flujo" : "Nuevo flujo"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label htmlFor="fl-name">Nombre</Label>
            <Input id="fl-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Aprobación de compra" />
          </div>
          <div className={field}>
            <Label htmlFor="fl-desc">Descripción (opcional)</Label>
            <Textarea id="fl-desc" rows={2} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {flow && (
            <label className="flex items-center gap-2 text-body">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 accent-acento" />
              Activo (los usuarios pueden radicar con este flujo)
            </label>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Pasos de aprobación</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setSteps((p) => [...p, { name: "", position: positions[0]?.id ?? "" }])}>
                <PlusIcon /> Paso
              </Button>
            </div>
            {positions.length === 0 && <p className="text-caption text-error-texto">Primero crea cargos en la pestaña Cargos.</p>}
            {steps.length === 0 ? (
              <p className="text-caption text-texto-sec">Sin pasos. Agrega el primero.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {steps.map((st, i) => (
                  <li key={i} className="flex flex-col gap-2 rounded-md border border-borde p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caption text-texto-sec">{i + 1}</span>
                      <Input value={st.name} maxLength={120} onChange={(e) => setStep(i, { name: e.target.value })} placeholder="Nombre del paso (p. ej. Jefe de área)" />
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={st.position} onChange={(e) => setStep(i, { position: e.target.value })} className={select} aria-label={`Cargo aprobador del paso ${i + 1}`}>
                        {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Bajar" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon /></Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar paso" onClick={() => setSteps((p) => p.filter((_, idx) => idx !== i))}><Trash2Icon /></Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending} disabled={positions.length === 0}>{flow ? "Guardar" : "Crear flujo"}</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function FlowManager({ flows, positions }: { flows: ApprovalFlowView[]; positions: PositionOption[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-small text-texto-sec">Plantillas de flujo de aprobación. Los usuarios radican solicitudes contra un flujo activo.</p>
        <FlowEditor flow={null} positions={positions} trigger={<Button><PlusIcon /> Nuevo flujo</Button>} />
      </div>
      {flows.length === 0 ? (
        <EmptyState icon={WorkflowIcon} title="Aún no hay flujos" description="Crea el primero para habilitar las solicitudes." />
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {flows.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-texto">{f.name}</span>
                  <Badge tone={f.isActive ? "exito" : "neutro"}>{f.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>
                <p className="text-caption text-texto-sec">{f.steps.length} paso{f.steps.length === 1 ? "" : "s"}: {f.steps.map((s) => s.positionName).join(" → ") || "sin pasos"}</p>
              </div>
              <FlowEditor flow={f} positions={positions} trigger={<Button variant="outline" size="sm"><PencilIcon /> Editar</Button>} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
