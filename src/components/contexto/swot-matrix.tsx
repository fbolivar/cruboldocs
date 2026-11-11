"use client"

import { CompassIcon, MoreHorizontalIcon, PlusIcon, ShieldPlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { PestelChip } from "@/components/contexto/badges"
import { EXTERNAL_SWOT, PESTEL_LABELS, SWOT_LABELS } from "@/components/contexto/labels"
import { createContextIssue, generateRiskFromIssue, setIssueArchived, updateContextIssue } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { ContextIssueView, Pestel, Swot } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const SWOTS = Object.keys(SWOT_LABELS) as Swot[]
const PESTELS = Object.keys(PESTEL_LABELS) as Pestel[]
const QUADRANTS: { swot: Swot; title: string }[] = [
  { swot: "fortaleza", title: "Fortalezas (interna)" },
  { swot: "debilidad", title: "Debilidades (interna)" },
  { swot: "oportunidad", title: "Oportunidades (externa)" },
  { swot: "amenaza", title: "Amenazas (externa)" },
]

function IssueSheet({
  issue, processes, objectives, open, onOpenChange,
}: {
  issue: ContextIssueView | null
  processes: Option[]
  objectives: Option[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [swot, setSwot] = useState<Swot>(issue?.swot ?? "fortaleza")
  const [pestel, setPestel] = useState<string>(issue?.pestel ?? "")
  const [description, setDescription] = useState(issue?.description ?? "")
  const [implication, setImplication] = useState(issue?.implication ?? "")
  const [processId, setProcessId] = useState(issue?.processId ?? "")
  const [objectiveId, setObjectiveId] = useState(issue?.objectiveId ?? "")
  const isExternal = EXTERNAL_SWOT.includes(swot)

  const [lastId, setLastId] = useState<string | null>(issue?.id ?? null)
  if (open && (issue?.id ?? null) !== lastId) {
    setLastId(issue?.id ?? null)
    setSwot(issue?.swot ?? "fortaleza"); setPestel(issue?.pestel ?? ""); setDescription(issue?.description ?? "")
    setImplication(issue?.implication ?? ""); setProcessId(issue?.processId ?? ""); setObjectiveId(issue?.objectiveId ?? "")
  }

  function submit() {
    if (description.trim().length < 3) { toast.error("Describe la cuestión."); return }
    start(async () => {
      const payload = {
        swot, pestel: isExternal && pestel ? pestel : null, description,
        implication: implication.trim() || undefined, processId: processId || null, objectiveId: objectiveId || null,
      }
      const r = issue ? await updateContextIssue(issue.id, payload) : await createContextIssue(payload)
      if (!r.ok) { toast.error(r.error); return }
      onOpenChange(false)
      toast.success(issue ? "Cuestión actualizada." : "Cuestión registrada."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{issue ? "Editar cuestión" : "Nueva cuestión"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label>Tipo (DOFA)</Label>
            <Select value={swot} onValueChange={(v) => setSwot(v as Swot)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SWOTS.map((x) => <SelectItem key={x} value={x}>{SWOT_LABELS[x]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isExternal && (
            <div className={field}><Label>Factor PESTEL (opcional)</Label>
              <Select value={pestel || "none"} onValueChange={(v) => setPestel(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="PESTEL" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(sin clasificar)</SelectItem>
                  {PESTELS.map((x) => <SelectItem key={x} value={x}>{PESTEL_LABELS[x]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={field}><Label htmlFor="ci-desc">Cuestión</Label>
            <Textarea id="ci-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="p. ej. Cambio normativo del sector" />
          </div>
          <div className={field}><Label htmlFor="ci-impl">Implicación en el SGC (opcional)</Label>
            <Textarea id="ci-impl" rows={2} value={implication} onChange={(e) => setImplication(e.target.value)} />
          </div>
          <div className={field}><Label>Proceso (opcional)</Label>
            <Select value={processId || "none"} onValueChange={(v) => setProcessId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin proceso)</SelectItem>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Objetivo que la atiende (opcional)</Label>
            <Select value={objectiveId || "none"} onValueChange={(v) => setObjectiveId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(ninguno)</SelectItem>
                {objectives.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function GenerateRiskSheet({
  issue, processes, positions, open, onOpenChange,
}: {
  issue: ContextIssueView
  processes: Option[]
  positions: Option[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [processId, setProcessId] = useState(issue.processId ?? "")
  const [ownerId, setOwnerId] = useState("")
  const [probability, setProbability] = useState("3")
  const [impact, setImpact] = useState("3")

  function submit() {
    if (!processId) { toast.error("Elige el proceso."); return }
    if (!ownerId) { toast.error("Elige el responsable."); return }
    start(async () => {
      const r = await generateRiskFromIssue(issue.id, {
        processId, ownerPositionId: ownerId, probability: Number(probability), impact: Number(impact),
      })
      if (!r.ok) { toast.error(r.error); return }
      onOpenChange(false)
      toast.success(`Riesgo ${r.data.code} creado desde la cuestión.`); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Generar riesgo</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <p className="text-small text-texto-sec">Se creará un riesgo con esta cuestión como descripción. Luego lo valoras y le agregas controles en Riesgos.</p>
          <div className={field}><Label>Proceso</Label>
            <Select value={processId || "none"} onValueChange={(v) => setProcessId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(elige un proceso)</SelectItem>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Responsable (cargo)</Label>
            <Select value={ownerId || "none"} onValueChange={(v) => setOwnerId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(elige un cargo)</SelectItem>
                {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Probabilidad (1–5)</Label>
              <Input type="number" min={1} max={5} value={probability} onChange={(e) => setProbability(e.target.value)} />
            </div>
            <div className={field}><Label>Impacto (1–5)</Label>
              <Input type="number" min={1} max={5} value={impact} onChange={(e) => setImpact(e.target.value)} />
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear riesgo</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function IssueCard({ issue, canManage, onEdit, onArchive, onGenRisk }: {
  issue: ContextIssueView
  canManage: boolean
  onEdit: () => void
  onArchive: () => void
  onGenRisk: () => void
}) {
  return (
    <div className={`rounded-md border border-borde p-3 ${issue.status === "archivada" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body text-texto">{issue.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-texto-sec">
            {issue.pestel && <PestelChip pestel={issue.pestel} />}
            {issue.processName && <span>· {issue.processName}</span>}
            {issue.riskCode && <Link href="/app/riesgos" className="font-medium text-acento hover:underline">→ {issue.riskCode}</Link>}
            {issue.objectiveCode && <span>· Obj. {issue.objectiveCode}</span>}
          </div>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Acciones de la cuestión"><MoreHorizontalIcon aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="min-h-9 text-body" onSelect={onEdit}>Editar</DropdownMenuItem>
              {!issue.riskId && issue.status === "vigente" && (
                <DropdownMenuItem className="min-h-9 text-body" onSelect={onGenRisk}><ShieldPlusIcon aria-hidden="true" /> Generar riesgo</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="min-h-9 text-body" onSelect={onArchive}>
                {issue.status === "archivada" ? "Restaurar" : "Archivar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function SwotMatrix({
  issues, processes, objectives, positions, canManage,
}: {
  issues: ContextIssueView[]
  processes: Option[]
  objectives: Option[]
  positions: Option[]
  canManage: boolean
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const [pestel, setPestel] = useState("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [editing, setEditing] = useState<ContextIssueView | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [genIssue, setGenIssue] = useState<ContextIssueView | null>(null)
  const [genOpen, setGenOpen] = useState(false)

  const procesos = useMemo(() => [...new Set(issues.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [issues])
  const filtered = useMemo(() => issues.filter((i) => {
    if (!verArchivadas && i.status === "archivada") return false
    if (pestel !== "todos" && i.pestel !== pestel) return false
    if (proceso !== "todos" && i.processName !== proceso) return false
    if (q.trim() && !i.description.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }), [issues, pestel, proceso, q, verArchivadas])

  function openNew() { setEditing(null); setSheetOpen(true) }
  function openEdit(i: ContextIssueView) { setEditing(i); setSheetOpen(true) }
  function openGen(i: ContextIssueView) { setGenIssue(i); setGenOpen(true) }
  function archive(i: ContextIssueView) {
    const toArchive = i.status !== "archivada"
    if (toArchive && !confirm("La cuestión se archivará. ¿Continuar?")) return
    start(async () => {
      const r = await setIssueArchived(i.id, toArchive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(toArchive ? "Cuestión archivada." : "Cuestión restaurada."); router.refresh()
    })
  }

  const hasAny = issues.some((i) => i.status === "vigente")

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={pestel} onValueChange={setPestel}>
          <SelectTrigger className="md:w-40" aria-label="PESTEL"><SelectValue placeholder="PESTEL" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo PESTEL</SelectItem>
            {PESTELS.map((x) => <SelectItem key={x} value={x}>{PESTEL_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar cuestiones" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verArchivadas} onChange={(e) => setVerArchivadas(e.target.checked)} className="accent-acento" /> Mostrar archivadas
        </label>
        {canManage && <Button size="sm" className="md:ml-auto" onClick={openNew}><PlusIcon /> Nueva cuestión</Button>}
      </div>

      {!hasAny && !verArchivadas ? (
        <Card><EmptyState icon={CompassIcon} title="Aún no has documentado el contexto." description={canManage ? "Agrega la primera cuestión (DOFA)." : undefined} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {QUADRANTS.map((qd) => {
            const items = filtered.filter((i) => i.swot === qd.swot)
            return (
              <Card key={qd.swot}>
                <CardHeader><CardTitle>{qd.title}</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="text-caption text-texto-sec">Sin cuestiones.</p>
                  ) : items.map((i) => (
                    <IssueCard key={i.id} issue={i} canManage={canManage}
                      onEdit={() => openEdit(i)} onArchive={() => archive(i)} onGenRisk={() => openGen(i)} />
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {canManage && <IssueSheet issue={editing} processes={processes} objectives={objectives} open={sheetOpen} onOpenChange={setSheetOpen} />}
      {canManage && genIssue && <GenerateRiskSheet issue={genIssue} processes={processes} positions={positions} open={genOpen} onOpenChange={setGenOpen} />}
    </div>
  )
}
