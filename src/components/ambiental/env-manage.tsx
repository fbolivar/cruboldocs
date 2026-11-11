"use client"

import { Ban, DownloadIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CONDITION_LABELS, CRIT_OPTIONS, SIGNIFICANCE_LABELS, envSignificance } from "@/components/ambiental/labels"
import { createAspect, exportEnvCsv, setAspectActive, updateAspect } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { EnvAspectDetail, EnvCondition } from "@/lib/types"

type Option = { id: string; name: string }
type LegalOption = { id: string; label: string }
const CONDITIONS = Object.keys(CONDITION_LABELS) as EnvCondition[]
const field = "flex flex-col gap-1.5"
const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"

export function ExportEnvButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`aspectos-ambientales-${todayIsoDate()}.csv`, await exportEnvCsv()) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button variant="outline" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

type FormState = {
  processId: string; activity: string; aspect: string; impact: string; condition: EnvCondition; controls: string
  legalRequirementId: string; responsibleId: string
  freq: number | null; sev: number | null; reach: number | null; legalCrit: number | null; nextReview: string
}

function AspectForm({ init, processes, positions, legalOptions, onSubmit, submitLabel }: {
  init: FormState; processes: Option[]; positions: Option[]; legalOptions: LegalOption[]
  onSubmit: (s: FormState) => void; submitLabel: string
}) {
  const [s, setS] = useState<FormState>(init)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }))
  const complete = s.freq !== null && s.sev !== null && s.reach !== null && s.legalCrit !== null
  const score = complete ? (s.freq! + s.sev! + s.reach! + s.legalCrit!) : null
  const sig = score !== null ? envSignificance(score, s.condition, !!s.legalRequirementId) : null

  function submit() {
    if (s.activity.trim().length < 2 || s.aspect.trim().length < 2 || s.impact.trim().length < 2) { toast.error("Completa actividad, aspecto e impacto."); return }
    if (!complete) { toast.error("Completa la valoración (Frecuencia, Severidad, Alcance, Cumplimiento legal)."); return }
    onSubmit(s)
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className={field}><Label htmlFor="as-act">Actividad</Label>
          <Input id="as-act" value={s.activity} onChange={(e) => set("activity", e.target.value)} placeholder="p. ej. Lavado de equipos" />
        </div>
        <div className={field}><Label htmlFor="as-aspect">Aspecto ambiental</Label>
          <Input id="as-aspect" value={s.aspect} onChange={(e) => set("aspect", e.target.value)} placeholder="p. ej. Vertimiento de aguas" />
        </div>
        <div className={field}><Label htmlFor="as-impact">Impacto</Label>
          <Input id="as-impact" value={s.impact} onChange={(e) => set("impact", e.target.value)} placeholder="p. ej. Contaminación del recurso hídrico" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}><Label>Condición</Label>
            <Select value={s.condition} onValueChange={(v) => set("condition", v as EnvCondition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Proceso</Label>
            <Select value={s.processId} onValueChange={(v) => set("processId", v)}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                {processes.length === 0 ? <SelectItem value="none" disabled>(sin procesos)</SelectItem>
                  : processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className={field}><Label htmlFor="as-controls">Controles (opcional)</Label>
          <Textarea id="as-controls" rows={2} value={s.controls} onChange={(e) => set("controls", e.target.value)} />
        </div>

        <div className="rounded-md border border-borde p-3">
          <p className="mb-2 text-caption font-medium uppercase tracking-wide text-texto-sec">Valoración de significancia</p>
          <div className="grid grid-cols-2 gap-3">
            {([["freq", "Frecuencia"], ["sev", "Severidad"], ["reach", "Alcance"], ["legalCrit", "Cumplimiento legal"]] as const).map(([k, lbl]) => (
              <div className={field} key={k}><Label>{lbl}</Label>
                <Select value={s[k] === null ? "" : String(s[k])} onValueChange={(v) => set(k, Number(v))}>
                  <SelectTrigger><SelectValue placeholder="1–3" /></SelectTrigger>
                  <SelectContent>{CRIT_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {score !== null && sig !== null && (
            <p className="mt-3 text-small text-texto-sec">Índice <span className="font-medium text-texto">{score}</span> → <span className="font-medium text-texto">{SIGNIFICANCE_LABELS[sig]}</span></p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={field}><Label>Requisito legal (opc.)</Label>
            <Select value={s.legalRequirementId} onValueChange={(v) => set("legalRequirementId", v)}>
              <SelectTrigger><SelectValue placeholder="Requisito" /></SelectTrigger>
              <SelectContent>
                {legalOptions.length === 0 ? <SelectItem value="none" disabled>(sin requisitos)</SelectItem>
                  : legalOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Responsable (opc.)</Label>
            <Select value={s.responsibleId} onValueChange={(v) => set("responsibleId", v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className={field}><Label htmlFor="as-review">Próxima revisión (opc.)</Label>
          <input id="as-review" type="date" value={s.nextReview} onChange={(e) => set("nextReview", e.target.value)} className={dateInput} />
        </div>
      </div>
      <SheetFooter className="border-t border-borde"><Button onClick={submit}>{submitLabel}</Button></SheetFooter>
    </>
  )
}

const empty: FormState = { processId: "", activity: "", aspect: "", impact: "", condition: "normal", controls: "", legalRequirementId: "", responsibleId: "", freq: null, sev: null, reach: null, legalCrit: null, nextReview: "" }

function payload(s: FormState) {
  return {
    processId: s.processId || null, activity: s.activity, aspect: s.aspect, impact: s.impact, condition: s.condition,
    controls: s.controls.trim() || undefined, legalRequirementId: s.legalRequirementId || null, responsibleId: s.responsibleId || null,
    freq: s.freq, sev: s.sev, reach: s.reach, legalCrit: s.legalCrit, nextReview: s.nextReview || null,
  }
}

export function NewAspectSheet({ processes, positions, legalOptions }: { processes: Option[]; positions: Option[]; legalOptions: LegalOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  function onSubmit(s: FormState) {
    start(async () => {
      const r = await createAspect(payload(s))
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Aspecto ${r.data.code} registrado.`); setOpen(false); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nuevo aspecto</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo aspecto ambiental</SheetTitle></SheetHeader>
        {open && <AspectForm init={empty} processes={processes} positions={positions} legalOptions={legalOptions} onSubmit={onSubmit} submitLabel="Crear aspecto" />}
      </SheetContent>
    </Sheet>
  )
}

export function AspectHeaderActions({ aspect, processes, positions, legalOptions }: { aspect: EnvAspectDetail; processes: Option[]; positions: Option[]; legalOptions: LegalOption[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  if (!aspect.canManage || aspect.status === "inactivo") return null

  function onSubmit(s: FormState) {
    start(async () => {
      const r = await updateAspect(aspect.id, payload(s))
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Aspecto actualizado."); setOpen(false); router.refresh()
    })
  }
  function inactivate() {
    if (!confirm("El aspecto quedará inactivo (se conserva en el histórico). ¿Continuar?")) return
    start(async () => {
      const r = await setAspectActive(aspect.id, false)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Aspecto inactivado."); router.refresh()
    })
  }
  const init: FormState = {
    processId: aspect.processId ?? "", activity: aspect.activity, aspect: aspect.aspect, impact: aspect.impact,
    condition: aspect.condition, controls: aspect.controls ?? "", legalRequirementId: aspect.legalRequirementId ?? "",
    responsibleId: "", freq: aspect.freq, sev: aspect.sev, reach: aspect.reach, legalCrit: aspect.legalCrit, nextReview: aspect.nextReviewDate ?? "",
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
        <SheetContent size="sm" className="gap-0 p-0">
          <SheetHeader className="border-b border-borde"><SheetTitle>Editar aspecto</SheetTitle></SheetHeader>
          {open && <AspectForm init={init} processes={processes} positions={positions} legalOptions={legalOptions} onSubmit={onSubmit} submitLabel="Guardar cambios" />}
        </SheetContent>
      </Sheet>
      <Button variant="outline" size="sm" onClick={inactivate} loading={pending}><Ban className="size-4" /> Inactivar</Button>
    </div>
  )
}
