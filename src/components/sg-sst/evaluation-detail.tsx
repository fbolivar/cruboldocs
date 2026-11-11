"use client"

import { ChevronRightIcon, DownloadIcon, ExternalLinkIcon, LockIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { SST_ACTION_LABELS, SST_COMPONENT_LABELS, SST_CYCLE_LABELS } from "@/components/sg-sst/labels"
import { addSstAction, closeEvaluation, exportSstCsv, setItemStatus, setSstActionStatus } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { SstActionView, SstCycle, SstItemStatus, SstItemView, SstPhaseTotal } from "@/lib/types"

type Option = { id: string; name: string }
const STATUSES: SstItemStatus[] = ["cumple", "no_cumple", "no_aplica"]
const STATUS_LABEL: Record<string, string> = { cumple: "Cumple", no_cumple: "No cumple", no_aplica: "No aplica" }
const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
const field = "flex flex-col gap-1.5"

export function ExportSstCsvButton({ code }: { code: string }) {
  const [pending, start] = useTransition()
  function run() {
    start(async () => {
      try { downloadCsv(`${code}-${todayIsoDate()}.csv`, await exportSstCsv(code)) }
      catch { toast.error("No pudimos exportar el CSV.") }
    })
  }
  return <Button variant="outline" size="sm" onClick={run} loading={pending}><DownloadIcon /> Exportar CSV</Button>
}

export function CloseEvaluationButton({ evaluationId }: { evaluationId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function close() {
    if (!confirm("La autoevaluación quedará en solo lectura con su puntaje y valoración del período. ¿Cerrar?")) return
    start(async () => {
      const r = await closeEvaluation(evaluationId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Autoevaluación cerrada."); router.refresh()
    })
  }
  return <Button size="sm" onClick={close} loading={pending}>Cerrar</Button>
}

function StandardRow({ item, readOnly }: { item: SstItemView; readOnly: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [just, setJust] = useState(item.justification ?? "")
  const [editingNa, setEditingNa] = useState(false)

  function choose(status: SstItemStatus) {
    if (status === "no_aplica") { setEditingNa(true); return }
    start(async () => {
      const r = await setItemStatus(item.itemId, status)
      if (!r.ok) { toast.error(r.error); return }
      setEditingNa(false); router.refresh()
    })
  }
  function saveNa() {
    if (just.trim().length < 1) { toast.error("Justifica por qué no aplica."); return }
    start(async () => {
      const r = await setItemStatus(item.itemId, "no_aplica", just)
      if (!r.ok) { toast.error(r.error); return }
      setEditingNa(false); router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-small">
          <span className="font-mono text-caption text-texto-sec">{item.code}</span> {item.name}
          <span className="text-caption text-texto-sec"> ({item.weight})</span>
        </p>
        {readOnly ? (
          <Badge tone={item.status === "cumple" ? "exito" : item.status === "no_cumple" ? "error" : "neutro"} plain>
            {item.status === "pendiente" ? "Pendiente" : STATUS_LABEL[item.status]}
          </Badge>
        ) : (
          <div role="radiogroup" aria-label={item.code} className="flex shrink-0 gap-1">
            {STATUSES.map((st) => (
              <Button key={st} type="button" size="sm" variant={item.status === st ? "default" : "outline"}
                role="radio" aria-checked={item.status === st} disabled={pending} onClick={() => choose(st)}>
                {STATUS_LABEL[st]}
              </Button>
            ))}
          </div>
        )}
      </div>
      {!readOnly && (editingNa || item.status === "no_aplica") && (
        <div className="flex flex-col gap-1.5 rounded-md border border-borde bg-superficie-alt p-2">
          <Label htmlFor={`na-${item.itemId}`} className="text-caption">Justificación (por qué no aplica)</Label>
          <Textarea id={`na-${item.itemId}`} rows={2} value={just} onChange={(e) => setJust(e.target.value)} />
          <div className="flex gap-2"><Button size="sm" onClick={saveNa} loading={pending}>Guardar</Button>
            {editingNa && item.status !== "no_aplica" && <Button size="sm" variant="outline" onClick={() => setEditingNa(false)}>Cancelar</Button>}
          </div>
        </div>
      )}
      {readOnly && item.status === "no_aplica" && item.justification && (
        <p className="text-caption text-texto-sec">No aplica: {item.justification}</p>
      )}
    </div>
  )
}

export function SstStandards({ items, phases, readOnly }: { items: SstItemView[]; phases: SstPhaseTotal[]; readOnly: boolean }) {
  const byPhase = useMemo(() => {
    const cycles = [...new Set(items.map((i) => i.cycle))]
    return cycles.map((cycle) => {
      const its = items.filter((i) => i.cycle === cycle)
      const comps = [...new Set(its.map((i) => i.component))]
      return { cycle, comps: comps.map((c) => ({ component: c, items: its.filter((i) => i.component === c) })) }
    })
  }, [items])

  return (
    <div className="flex flex-col gap-3">
      {byPhase.map(({ cycle, comps }) => {
        const ph = phases.find((p) => p.cycle === (cycle as SstCycle))
        return (
          <details key={cycle} open className="group rounded-lg border border-borde bg-superficie">
            <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 font-medium">
              <span className="flex items-center gap-2"><ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" /> {SST_CYCLE_LABELS[cycle as SstCycle]}</span>
              {ph && <span className="text-small tabular-nums text-texto-sec">{ph.obtained.toFixed(2)} / {ph.possible.toFixed(2)}</span>}
            </summary>
            <div className="border-t border-borde px-3 pb-2">
              {comps.map(({ component, items: cItems }) => {
                const applicable = cItems.filter((i) => i.applicable)
                const autoCount = cItems.length - applicable.length
                return (
                  <div key={component}>
                    <p className="mt-2 text-caption font-medium uppercase tracking-wide text-texto-sec">{SST_COMPONENT_LABELS[component]}</p>
                    <div className="divide-y divide-borde">
                      {applicable.map((i) => <StandardRow key={i.itemId} item={i} readOnly={readOnly} />)}
                    </div>
                    {autoCount > 0 && (
                      <p className="py-2 text-caption text-texto-sec">{autoCount} estándar{autoCount > 1 ? "es" : ""} no aplica{autoCount > 1 ? "n" : ""} a tu nivel (calificado{autoCount > 1 ? "s" : ""} al máximo, Res. 0312).</p>
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}
    </div>
  )
}

export function SstActionsPanel({
  evaluationId, items, actions, canManage, positions,
}: {
  evaluationId: string; items: SstItemView[]; actions: SstActionView[]; canManage: boolean; positions: Option[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const failed = items.filter((i) => i.status === "no_cumple")

  function changeStatus(id: string, status: string) {
    start(async () => {
      const r = await setSstActionStatus(id, status)
      if (!r.ok) { toast.error(r.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h3">Plan de mejoramiento ({actions.length})</h2>
        {canManage && failed.length > 0 && <NewActionSheet evaluationId={evaluationId} failed={failed} positions={positions} />}
      </div>
      {actions.length === 0 ? (
        <p className="rounded-md border border-dashed border-borde-fuerte px-4 py-6 text-center text-small text-texto-sec">
          {failed.length === 0 ? "Marca los estándares incumplidos para agregar acciones de mejora." : "Agrega acciones de mejora para los estándares «No cumple»."}
        </p>
      ) : (
        <ul className="divide-y divide-borde">
          {actions.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-small"><span className="font-mono text-caption text-texto-sec">{a.standardCode}</span> {a.description}</p>
                <p className="text-caption text-texto-sec">{a.responsibleName ?? "Sin responsable"}{a.dueDate ? ` · vence ${a.dueDate}` : ""}{a.overdue ? " · vencida" : ""}</p>
              </div>
              {canManage && a.status !== "hecha" && a.status !== "cancelada" ? (
                <Select value={a.status} onValueChange={(v) => changeStatus(a.id, v)} disabled={pending}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pendiente", "en_curso", "hecha", "cancelada"] as const).map((st) => <SelectItem key={st} value={st}>{SST_ACTION_LABELS[st]}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Badge tone={a.status === "hecha" ? "exito" : a.overdue ? "error" : "neutro"} plain>{SST_ACTION_LABELS[a.status]}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewActionSheet({ evaluationId, failed, positions }: { evaluationId: string; failed: SstItemView[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [standardId, setStandardId] = useState(failed[0]?.standardId ?? "")
  const [description, setDescription] = useState("")
  const [responsibleId, setResponsibleId] = useState("")
  const [dueDate, setDueDate] = useState("")

  function submit() {
    if (!standardId) { toast.error("Elige el estándar incumplido."); return }
    if (description.trim().length < 3) { toast.error("Describe la acción."); return }
    start(async () => {
      const r = await addSstAction({ evaluationId, standardId, description, responsibleId: responsibleId || null, dueDate: dueDate || null })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Acción agregada."); setOpen(false); setDescription(""); setResponsibleId(""); setDueDate(""); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="sm" variant="outline"><PlusIcon /> Acción</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Acción de mejora</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label>Estándar incumplido</Label>
            <Select value={standardId} onValueChange={setStandardId}>
              <SelectTrigger><SelectValue placeholder="Estándar" /></SelectTrigger>
              <SelectContent>{failed.map((i) => <SelectItem key={i.standardId} value={i.standardId}>{i.code} · {i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="ac-desc">Acción</Label>
            <Textarea id="ac-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Responsable (opc.)</Label>
              <Select value={responsibleId || "none"} onValueChange={(v) => setResponsibleId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(sin responsable)</SelectItem>
                  {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={field}><Label htmlFor="ac-due">Plazo (opc.)</Label>
              <input id="ac-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={dateInput} />
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Agregar acción</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Aviso de solo lectura/suave a Peligros (lo usa la página). */
export function HazardLink() {
  return (
    <Link href="/app/peligros" className="inline-flex items-center gap-1 text-small text-acento hover:underline">
      Ver matriz de peligros (GTC-45) <ExternalLinkIcon className="size-3.5" />
    </Link>
  )
}

export function ReadOnlyNote() {
  return (
    <p className="inline-flex items-center gap-1.5 text-small text-texto-sec"><LockIcon className="size-4" /> Esta autoevaluación está cerrada (solo lectura).</p>
  )
}
