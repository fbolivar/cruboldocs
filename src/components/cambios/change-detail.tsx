"use client"

import { CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CHANGE_TYPE_LABELS } from "@/components/cambios/labels"
import { assessChange, decideChange, implementChange, updateChange } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { ChangeDetail, ChangeType } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const TYPES = Object.keys(CHANGE_TYPE_LABELS) as ChangeType[]

export function ImpactPanel({ change }: { change: ChangeDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [impact, setImpact] = useState(change.impactAssessment ?? "")
  const editable = change.canManage && (change.status === "propuesto" || change.status === "en_evaluacion")

  function save() {
    if (impact.trim().length < 3) { toast.error("Describe el análisis de impacto."); return }
    start(async () => {
      const r = await assessChange(change.id, impact)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Análisis de impacto guardado."); setOpen(false); router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {change.impactAssessment ? (
        <p className="whitespace-pre-wrap text-body">{change.impactAssessment}</p>
      ) : (
        <p className="text-small text-texto-sec">Sin análisis de impacto (riesgos, recursos, responsabilidades).</p>
      )}
      {editable && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button variant="outline" size="sm" className="self-start"><PencilIcon /> {change.impactAssessment ? "Editar análisis" : "Evaluar"}</Button></SheetTrigger>
          <SheetContent size="sm" className="gap-0 p-0">
            <SheetHeader className="border-b border-borde"><SheetTitle>Análisis de impacto</SheetTitle></SheetHeader>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <p className="text-caption text-texto-sec">Describe el propósito, los riesgos, los recursos y las responsabilidades del cambio (6.3).</p>
              <Textarea rows={8} value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Riesgos: … · Recursos: … · Responsabilidades: …" />
            </div>
            <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending}>Guardar y pasar a evaluación</Button></SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

export function ChangeDecisionActions({ change, approverPositionId }: { change: ChangeDetail; approverPositionId: string | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!change.canApprove || change.status !== "en_evaluacion") return null
  const hasImpact = (change.impactAssessment ?? "").trim() !== ""

  function decide(approve: boolean) {
    if (approve && !confirm("¿Aprobar este cambio?")) return
    if (!approve && !confirm("¿Rechazar este cambio?")) return
    start(async () => {
      const r = await decideChange(change.id, approve, approverPositionId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(approve ? "Cambio aprobado." : "Cambio rechazado."); router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => decide(true)} loading={pending} disabled={!hasImpact}><CheckIcon /> Aprobar</Button>
      <Button size="sm" variant="outline" onClick={() => decide(false)} loading={pending}><XIcon /> Rechazar</Button>
      {!hasImpact && <span className="self-center text-caption text-texto-sec">Registra el análisis de impacto para decidir.</span>}
    </div>
  )
}

export function ImplementChangeAction({ change }: { change: ChangeDetail }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  if (!change.canManage || change.status !== "aprobado") return null

  function submit() {
    start(async () => {
      const r = await implementChange(change.id, notes.trim() || undefined)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Cambio implementado."); setOpen(false); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm">Marcar implementado</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Implementar cambio</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="imp-notes">Notas de implementación (opc.)</Label><Textarea id="imp-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Marcar implementado</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function EditChangeButton({ change, processes, positions }: { change: ChangeDetail; processes: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [s, setS] = useState({ title: change.title, changeType: change.changeType, processId: change.processId ?? "", description: change.description ?? "", requestedById: "" })
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }))
  if (!change.canManage || change.status === "implementado" || change.status === "rechazado") return null

  function save() {
    if (s.title.trim().length < 3) { toast.error("El título es obligatorio."); return }
    start(async () => {
      const r = await updateChange(change.id, { title: s.title, changeType: s.changeType, processId: s.processId || null, description: s.description || undefined, requestedById: s.requestedById || null })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Solicitud actualizada."); setOpen(false); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar solicitud</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="ec-title">Título</Label><Input id="ec-title" value={s.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Tipo</Label>
              <Select value={s.changeType} onValueChange={(v) => set("changeType", v as ChangeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{CHANGE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Proceso</Label>
              <Select value={s.processId || "none"} onValueChange={(v) => set("processId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
                <SelectContent><SelectItem value="none">(sin proceso)</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}><Label htmlFor="ec-desc">Descripción</Label><Textarea id="ec-desc" rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className={field}><Label>Solicitante</Label>
            <Select value={s.requestedById || "none"} onValueChange={(v) => set("requestedById", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent><SelectItem value="none">(sin cambio)</SelectItem>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending}>Guardar cambios</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
