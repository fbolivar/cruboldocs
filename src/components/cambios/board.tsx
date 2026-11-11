"use client"

import { PlusIcon, RefreshCwIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { ChangeStatusBadge, ChangeTypeChip } from "@/components/cambios/badges"
import { CHANGE_STATUS_LABELS, CHANGE_TYPE_LABELS } from "@/components/cambios/labels"
import { createChange } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { ChangeListItem, ChangeStatus, ChangesSummary, ChangeType } from "@/lib/types"

type Option = { id: string; name: string }
const PATH = "/app/cambios"
const field = "flex flex-col gap-1.5"
const STATUSES = Object.keys(CHANGE_STATUS_LABELS) as ChangeStatus[]
const TYPES = Object.keys(CHANGE_TYPE_LABELS) as ChangeType[]

export function ChangesSummaryBar({ summary }: { summary: ChangesSummary }) {
  const cells: [string, number][] = [["Propuestas", summary.proposed], ["En evaluación", summary.inEvaluation], ["Aprobados", summary.approved], ["Implementados", summary.implemented]]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cells.map(([k, v]) => (
        <Card key={k} className="p-4"><p className="text-caption text-texto-sec">{k}</p><p className="mt-1 font-display text-h2 tabular-nums text-texto">{v}</p></Card>
      ))}
    </div>
  )
}

export function ChangesBoard({ items }: { items: ChangeListItem[] }) {
  const [status, setStatus] = useState<"todos" | ChangeStatus>("todos")
  const [type, setType] = useState<"todos" | ChangeType>("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => items.filter((i) => {
    if (status !== "todos" && i.status !== status) return false
    if (type !== "todos" && i.changeType !== type) return false
    if (proceso !== "todos" && i.processName !== proceso) return false
    if (q.trim() && !`${i.code} ${i.title}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }), [items, status, type, proceso, q])
  const hasFilters = status !== "todos" || type !== "todos" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setStatus("todos"); setType("todos"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todo estado</SelectItem>{STATUSES.map((x) => <SelectItem key={x} value={x}>{CHANGE_STATUS_LABELS[x]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="md:w-44" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todo tipo</SelectItem>{TYPES.map((x) => <SelectItem key={x} value={x}>{CHANGE_TYPE_LABELS[x]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todo proceso</SelectItem>{procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar solicitudes" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>
      {filtered.length === 0 ? (
        <Card>{hasFilters
          ? <EmptyState icon={SearchXIcon} title="Ninguna solicitud coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          : <EmptyState icon={RefreshCwIcon} title="Aún no hay solicitudes de cambio." description="Crea la primera con «Nueva solicitud»." />}
        </Card>
      ) : (
        <Card className="overflow-hidden"><ul className="divide-y divide-borde">
          {filtered.map((i) => (
            <li key={i.id} className="relative p-4 hover:bg-superficie-alt">
              <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                  <ChangeTypeChip changeType={i.changeType} />
                  <p className="text-body">{i.title}</p>
                </div>
                <ChangeStatusBadge status={i.status} />
              </div>
              <p className="mt-1 text-caption text-texto-sec">{i.processName ? `${i.processName} · ` : ""}Solicitado {i.requestDate}</p>
            </li>
          ))}
        </ul></Card>
      )}
    </div>
  )
}

export function NewChangeSheet({ processes, positions }: { processes: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [s, setS] = useState({ title: "", changeType: "proceso" as ChangeType, processId: "", description: "", requestedById: "" })
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }))

  function submit() {
    if (s.title.trim().length < 3) { toast.error("El título es obligatorio."); return }
    start(async () => {
      const r = await createChange({ title: s.title, changeType: s.changeType, processId: s.processId || null, description: s.description || undefined, requestedById: s.requestedById || null })
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false); router.push(`${PATH}/${r.data.code}`)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nueva solicitud</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva solicitud de cambio</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="ch-title">Título</Label><Input id="ch-title" value={s.title} onChange={(e) => set("title", e.target.value)} placeholder="p. ej. Cambio de proveedor de materia prima" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Tipo</Label>
              <Select value={s.changeType} onValueChange={(v) => set("changeType", v as ChangeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{CHANGE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Proceso (opc.)</Label>
              <Select value={s.processId || "none"} onValueChange={(v) => set("processId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
                <SelectContent><SelectItem value="none">(sin proceso)</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className={field}><Label htmlFor="ch-desc">Descripción</Label><Textarea id="ch-desc" rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className={field}><Label>Solicitante (opc.)</Label>
            <Select value={s.requestedById || "none"} onValueChange={(v) => set("requestedById", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent><SelectItem value="none">(sin cargo)</SelectItem>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear solicitud</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
