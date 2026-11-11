"use client"

import { GaugeIcon, PlusIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { EquipmentStatusBadge } from "@/components/metrologia/badges"
import { EQUIPMENT_STATUS_LABELS, FREQUENCY_LABELS } from "@/components/metrologia/labels"
import { createEquipment } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { EffectiveEquipmentStatus, EquipmentListItem, MetrologyFrequency, MetrologySummary } from "@/lib/types"

type Option = { id: string; name: string }
const PATH = "/app/metrologia"
const field = "flex flex-col gap-1.5"
const STATUSES = Object.keys(EQUIPMENT_STATUS_LABELS) as EffectiveEquipmentStatus[]
const FREQS = Object.keys(FREQUENCY_LABELS) as MetrologyFrequency[]

export function MetrologySummaryBar({ summary }: { summary: MetrologySummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="text-caption text-texto-sec">Equipos activos</p><p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.active}</p></Card>
      <Card className="p-4"><p className="text-caption text-texto-sec">Vencidos</p><p className={`mt-1 font-display text-h2 tabular-nums ${summary.overdue > 0 ? "text-error-texto" : "text-texto"}`}>{summary.overdue}</p></Card>
      <Card className="p-4"><p className="text-caption text-texto-sec">Por vencer (30 días)</p><p className={`mt-1 font-display text-h2 tabular-nums ${summary.dueSoon > 0 ? "text-advertencia-texto" : "text-texto"}`}>{summary.dueSoon}</p></Card>
    </div>
  )
}

export function MetrologyBoard({ items }: { items: EquipmentListItem[] }) {
  const [status, setStatus] = useState<"todos" | EffectiveEquipmentStatus>("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => items.filter((i) => {
    if (status !== "todos" && i.status !== status) return false
    if (proceso !== "todos" && i.processName !== proceso) return false
    if (q.trim() && !`${i.code} ${i.name}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }), [items, status, proceso, q])
  const hasFilters = status !== "todos" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setStatus("todos"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todo estado</SelectItem>{STATUSES.map((x) => <SelectItem key={x} value={x}>{EQUIPMENT_STATUS_LABELS[x]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todo proceso</SelectItem>{procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar equipos" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>
      {filtered.length === 0 ? (
        <Card>{hasFilters
          ? <EmptyState icon={SearchXIcon} title="Ningún equipo coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          : <EmptyState icon={GaugeIcon} title="Aún no registras equipos." description="Registra el primero con «Nuevo equipo»." />}
        </Card>
      ) : (
        <Card className="overflow-hidden"><ul className="divide-y divide-borde">
          {filtered.map((i) => (
            <li key={i.id} className={`relative p-4 hover:bg-superficie-alt ${i.status === "fuera_de_servicio" ? "opacity-60" : ""}`}>
              <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                  <p className="text-body">{i.name}</p>
                </div>
                <EquipmentStatusBadge status={i.status} />
              </div>
              <p className="mt-1 text-caption text-texto-sec">
                {i.processName ? `${i.processName} · ` : ""}{i.measurementRange ? `${i.measurementRange} · ` : ""}
                {i.nextDueDate ? <>Próxima: {i.nextDueDate}{i.status === "vencido" ? <span className="text-error-texto"> (vencida)</span> : ""}</> : "Sin calibrar"}
              </p>
            </li>
          ))}
        </ul></Card>
      )}
    </div>
  )
}

export function NewEquipmentSheet({ processes, positions }: { processes: Option[]; positions: Option[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [s, setS] = useState({ name: "", type: "", processId: "", location: "", range: "", unit: "", frequency: "anual" as MetrologyFrequency, responsibleId: "" })
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }))

  function submit() {
    if (s.name.trim().length < 2) { toast.error("El nombre del equipo es obligatorio."); return }
    start(async () => {
      const r = await createEquipment({ name: s.name, type: s.type || undefined, processId: s.processId || null, location: s.location || undefined, range: s.range || undefined, unit: s.unit || undefined, frequency: s.frequency, responsibleId: s.responsibleId || null })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(`Equipo ${r.data.code} registrado.`); setOpen(false); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button disabled={pending}><PlusIcon /> Nuevo equipo</Button></SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nuevo equipo</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="eq-name">Nombre</Label><Input id="eq-name" value={s.name} onChange={(e) => set("name", e.target.value)} placeholder="p. ej. Balanza analítica" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="eq-type">Tipo (opc.)</Label><Input id="eq-type" value={s.type} onChange={(e) => set("type", e.target.value)} /></div>
            <div className={field}><Label>Proceso (opc.)</Label>
              <Select value={s.processId || "none"} onValueChange={(v) => set("processId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
                <SelectContent><SelectItem value="none">(sin proceso)</SelectItem>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label htmlFor="eq-range">Rango (opc.)</Label><Input id="eq-range" value={s.range} onChange={(e) => set("range", e.target.value)} placeholder="0–200 g" /></div>
            <div className={field}><Label htmlFor="eq-unit">Unidad (opc.)</Label><Input id="eq-unit" value={s.unit} onChange={(e) => set("unit", e.target.value)} placeholder="g" /></div>
          </div>
          <div className={field}><Label htmlFor="eq-loc">Ubicación (opc.)</Label><Input id="eq-loc" value={s.location} onChange={(e) => set("location", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}><Label>Frecuencia de calibración</Label>
              <Select value={s.frequency} onValueChange={(v) => set("frequency", v as MetrologyFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={field}><Label>Responsable (opc.)</Label>
              <Select value={s.responsibleId || "none"} onValueChange={(v) => set("responsibleId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
                <SelectContent><SelectItem value="none">(sin responsable)</SelectItem>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Registrar equipo</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
