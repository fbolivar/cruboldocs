"use client"

import { Ban, PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ComplianceBadge } from "@/components/requisitos-legales/badges"
import { FREQUENCY_LABELS, SOURCE_LABELS } from "@/components/requisitos-legales/labels"
import { derogateRequirement, evaluateRequirement, updateRequirement } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, todayIsoDate } from "@/lib/format"
import type { LegalFrequency, LegalRequirementDetail, LegalSource } from "@/lib/types"

type ProcessOption = { id: string; name: string }
const SOURCES = Object.keys(SOURCE_LABELS) as LegalSource[]
const FREQS = Object.keys(FREQUENCY_LABELS) as LegalFrequency[]
const field = "flex flex-col gap-1.5"
const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"

export function RequirementHeaderActions({ req, processes }: { req: LegalRequirementDetail; processes: ProcessOption[] }) {
  if (!req.canManage || req.status === "derogado") return null
  return (
    <div className="flex flex-wrap gap-2">
      <EditRequirementSheet req={req} processes={processes} />
      <DerogateButton reqId={req.id} />
    </div>
  )
}

function DerogateButton({ reqId }: { reqId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function run() {
    if (!confirm("El requisito dejará de contar en la matriz activa; se conserva el historial. ¿Derogar?")) return
    start(async () => {
      const r = await derogateRequirement(reqId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Requisito derogado."); router.refresh()
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}><Ban className="size-4" /> Derogar</Button>
}

function EditRequirementSheet({ req, processes }: { req: LegalRequirementDetail; processes: ProcessOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(req.title)
  const [sourceType, setSourceType] = useState<LegalSource>(req.sourceType)
  const [reference, setReference] = useState(req.reference)
  const [issuer, setIssuer] = useState(req.issuer ?? "")
  const [description, setDescription] = useState(req.description)
  const [processId, setProcessId] = useState(req.processId ?? "")
  const [url, setUrl] = useState(req.url ?? "")
  const [frequency, setFrequency] = useState<LegalFrequency>(req.evalFrequency)

  function submit() {
    if (title.trim().length < 3 || reference.trim().length < 1 || description.trim().length < 3) { toast.error("Revisa los datos."); return }
    start(async () => {
      const r = await updateRequirement(req.id, { title, sourceType, reference, issuer: issuer.trim() || undefined, description, processId: processId || null, url: url.trim() || undefined, frequency })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Requisito actualizado."); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Editar requisito</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="er-title">Título</Label><Input id="er-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Fuente</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as LegalSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((sfx) => <SelectItem key={sfx} value={sfx}>{SOURCE_LABELS[sfx]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as LegalFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}><Label htmlFor="er-ref">Referencia</Label><Input id="er-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div className={field}><Label htmlFor="er-issuer">Entidad emisora</Label><Input id="er-issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} /></div>
          <div className={field}><Label htmlFor="er-desc">Qué exige</Label><Textarea id="er-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className={field}><Label>Proceso</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="er-url">Enlace</Label><Input id="er-url" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar cambios</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function RequirementEvaluations({ req }: { req: LegalRequirementDetail }) {
  const canEval = req.canManage && req.status === "vigente"
  return (
    <div className="flex flex-col gap-3">
      {req.evaluations.length === 0 ? (
        <EmptyState icon={PlusIcon} title="Este requisito aún no se ha evaluado" description={canEval ? "Registra la primera evaluación." : undefined} />
      ) : (
        <ul className="divide-y divide-borde">
          {req.evaluations.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <ComplianceBadge compliance={e.compliance} />
                <span className="text-caption text-texto-sec">{formatDate(e.evaluatedAt)} · por {e.evaluatedBy}</span>
              </div>
              <p className="text-body whitespace-pre-wrap">{e.evidence}</p>
              {e.note && <p className="text-caption text-texto-sec">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}
      {canEval && <div><EvaluateSheet reqId={req.id} /></div>}
    </div>
  )
}

function EvaluateSheet({ reqId }: { reqId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [compliance, setCompliance] = useState<"cumple" | "parcial" | "no_cumple">("cumple")
  const [evidence, setEvidence] = useState("")
  const [evaluatedAt, setEvaluatedAt] = useState(todayIsoDate())
  const [note, setNote] = useState("")

  function submit() {
    if (evidence.trim().length < 1) { toast.error("Registra la evidencia o la brecha."); return }
    start(async () => {
      const r = await evaluateRequirement(reqId, { compliance, evidence, evaluatedAt, note: note.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Evaluación registrada.")
      setOpen(false); setEvidence(""); setNote("")
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm"><PlusIcon /> Evaluar</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Evaluar cumplimiento</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className={field}><Label>Cumplimiento</Label>
            <Select value={compliance} onValueChange={(v) => setCompliance(v as typeof compliance)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cumple">Cumple</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="no_cumple">No cumple</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="ev-evidence">Evidencia / brecha</Label>
            <Textarea id="ev-evidence" rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Cómo se cumple, o qué falta" />
          </div>
          <div className={field}><Label htmlFor="ev-date">Fecha de evaluación</Label>
            <input id="ev-date" type="date" max={todayIsoDate()} value={evaluatedAt} onChange={(e) => setEvaluatedAt(e.target.value)} className={dateInput} />
          </div>
          <div className={field}><Label htmlFor="ev-note">Nota (opcional)</Label><Textarea id="ev-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar evaluación</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
