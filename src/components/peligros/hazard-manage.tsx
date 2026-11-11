"use client"

import { Ban, DownloadIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CLASS_LABELS, NC_OPTIONS, ND_OPTIONS, NE_OPTIONS, RISK_LEVEL_LABELS, RISK_LEVEL_MEANING, gtc45Level } from "@/components/peligros/labels"
import { createHazard, exportHazardsCsv, setHazardActive, updateHazard } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { HazardClass, HazardDetail } from "@/lib/types"

type Option = { id: string; name: string }
const CLASSES = Object.keys(CLASS_LABELS) as HazardClass[]
const field = "flex flex-col gap-1.5"
const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"

export function ExportHazardsButton() {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`peligros-${todayIsoDate()}.csv`, await exportHazardsCsv()) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button variant="outline" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

type FormState = {
  processId: string; area: string; hazard: string; classification: HazardClass; controls: string
  nd: number | null; ne: number | null; nc: number | null; intervention: string; responsibleId: string; nextReview: string
}

function HazardForm({ init, processes, positions, onSubmit, submitLabel }: {
  init: FormState; processes: Option[]; positions: Option[]
  onSubmit: (s: FormState) => void; submitLabel: string
}) {
  const [s, setS] = useState<FormState>(init)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }))
  const np = s.nd !== null && s.ne !== null ? s.nd * s.ne : null
  const nr = np !== null && s.nc !== null ? np * s.nc : null
  const level = nr !== null ? gtc45Level(nr) : null

  function submit() {
    if (s.hazard.trim().length < 3) { toast.error("Describe el peligro."); return }
    if (s.nd === null || s.ne === null || s.nc === null) { toast.error("Completa la valoración GTC-45 (ND, NE, NC)."); return }
    onSubmit(s)
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className={field}><Label htmlFor="hz-hazard">Peligro</Label>
          <Textarea id="hz-hazard" rows={2} value={s.hazard} onChange={(e) => set("hazard", e.target.value)} placeholder="Descripción del peligro" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}><Label>Clasificación</Label>
            <Select value={s.classification} onValueChange={(v) => set("classification", v as HazardClass)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{CLASS_LABELS[c]}</SelectItem>)}</SelectContent>
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
        <div className={field}><Label htmlFor="hz-area">Área / cargo (opcional)</Label>
          <Input id="hz-area" value={s.area} onChange={(e) => set("area", e.target.value)} />
        </div>
        <div className={field}><Label htmlFor="hz-controls">Controles existentes (opcional)</Label>
          <Textarea id="hz-controls" rows={2} value={s.controls} onChange={(e) => set("controls", e.target.value)} placeholder="Fuente / medio / individuo" />
        </div>

        <div className="rounded-md border border-borde p-3">
          <p className="mb-2 text-caption font-medium uppercase tracking-wide text-texto-sec">Valoración GTC-45</p>
          <div className="grid grid-cols-3 gap-3">
            <div className={field}><Label>Deficiencia</Label>
              <Select value={s.nd === null ? "" : String(s.nd)} onValueChange={(v) => set("nd", Number(v))}>
                <SelectTrigger><SelectValue placeholder="ND" /></SelectTrigger>
                <SelectContent>{ND_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Exposición</Label>
              <Select value={s.ne === null ? "" : String(s.ne)} onValueChange={(v) => set("ne", Number(v))}>
                <SelectTrigger><SelectValue placeholder="NE" /></SelectTrigger>
                <SelectContent>{NE_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Consecuencia</Label>
              <Select value={s.nc === null ? "" : String(s.nc)} onValueChange={(v) => set("nc", Number(v))}>
                <SelectTrigger><SelectValue placeholder="NC" /></SelectTrigger>
                <SelectContent>{NC_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {nr !== null && level !== null && (
            <p className="mt-3 text-small text-texto-sec">
              NP {np} · NR <span className="font-medium text-texto">{nr}</span> · <span className="font-medium text-texto">{RISK_LEVEL_LABELS[level]}</span> — {RISK_LEVEL_MEANING[level]}
            </p>
          )}
        </div>

        <div className={field}><Label htmlFor="hz-interv">Medidas de intervención (opcional)</Label>
          <Textarea id="hz-interv" rows={2} value={s.intervention} onChange={(e) => set("intervention", e.target.value)} placeholder="Eliminación / sustitución / ingeniería / administrativos / EPP" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}><Label>Responsable (opcional)</Label>
            <Select value={s.responsibleId} onValueChange={(v) => set("responsibleId", v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="hz-review">Próxima revisión (opc.)</Label>
            <input id="hz-review" type="date" value={s.nextReview} onChange={(e) => set("nextReview", e.target.value)} className={dateInput} />
          </div>
        </div>
      </div>
      <SheetFooter className="border-t border-borde"><Button onClick={submit}>{submitLabel}</Button></SheetFooter>
    </>
  )
}

const empty: FormState = { processId: "", area: "", hazard: "", classification: "fisico", controls: "", nd: null, ne: null, nc: null, intervention: "", responsibleId: "", nextReview: "" }

function payload(s: FormState) {
  return {
    processId: s.processId || null, area: s.area.trim() || undefined, hazard: s.hazard, classification: s.classification,
    controls: s.controls.trim() || undefined, nd: s.nd, ne: s.ne, nc: s.nc,
    intervention: s.intervention.trim() || undefined, responsibleId: s.responsibleId || null, nextReview: s.nextReview || null,
  }
}

export function NewHazardSheet({ processes, positions }: { processes: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  function onSubmit(s: FormState) {
    start(async () => {
      const r = await createHazard(payload(s))
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Peligro ${r.data.code} registrado.`); setOpen(false); router.refresh()
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nuevo peligro</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo peligro</SheetTitle></SheetHeader>
        {open && <HazardForm init={empty} processes={processes} positions={positions} onSubmit={onSubmit} submitLabel="Registrar peligro" />}
      </SheetContent>
    </Sheet>
  )
}

export function HazardHeaderActions({ hazard, processes, positions }: { hazard: HazardDetail; processes: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  if (!hazard.canManage) return null

  function onSubmit(s: FormState) {
    start(async () => {
      const r = await updateHazard(hazard.id, payload(s))
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Peligro actualizado."); setOpen(false); router.refresh()
    })
  }
  function inactivate() {
    if (!confirm("El peligro quedará inactivo (se conserva en el histórico). ¿Continuar?")) return
    start(async () => {
      const r = await setHazardActive(hazard.id, false)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Peligro inactivado."); router.refresh()
    })
  }

  const init: FormState = {
    processId: hazard.processId ?? "", area: hazard.area ?? "", hazard: hazard.hazard, classification: hazard.classification,
    controls: hazard.existingControls ?? "", nd: hazard.nd, ne: hazard.ne, nc: hazard.nc,
    intervention: hazard.intervention ?? "", responsibleId: "", nextReview: hazard.nextReviewDate ?? "",
  }
  if (hazard.status === "inactivo") return null
  return (
    <div className="flex flex-wrap gap-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><Button variant="outline" size="sm"><PencilIcon /> Editar</Button></SheetTrigger>
        <SheetContent size="sm" className="gap-0 p-0">
          <SheetHeader className="border-b border-borde"><SheetTitle>Editar peligro</SheetTitle></SheetHeader>
          {open && <HazardForm init={init} processes={processes} positions={positions} onSubmit={onSubmit} submitLabel="Guardar cambios" />}
        </SheetContent>
      </Sheet>
      <Button variant="outline" size="sm" onClick={inactivate} loading={pending}><Ban className="size-4" /> Inactivar</Button>
    </div>
  )
}
