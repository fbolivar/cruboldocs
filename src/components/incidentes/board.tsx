"use client"

import { SearchXIcon, SirenIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { IncidentKindChip, IncidentStatusBadge, SeverityBadge } from "@/components/incidentes/badges"
import { INCIDENT_KIND_LABELS, INCIDENT_STATUS_LABELS, SEVERITY_LABELS } from "@/components/incidentes/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import type { IncidentKind, IncidentListItem, IncidentSeverity, IncidentStatus } from "@/lib/types"

const PATH = "/app/incidentes"
const KINDS = Object.keys(INCIDENT_KIND_LABELS) as IncidentKind[]
const SEVS = Object.keys(SEVERITY_LABELS) as IncidentSeverity[]
const STATUSES = Object.keys(INCIDENT_STATUS_LABELS) as IncidentStatus[]

// Vencidos primero, luego accidentes abiertos, luego por fecha de ocurrencia descendente.
function rank(i: IncidentListItem): number {
  if (i.overdue) return 0
  if (i.kind === "accidente" && (i.status === "reportado" || i.status === "en_investigacion")) return 1
  return 2
}

export function IncidentsBoard({ items }: { items: IncidentListItem[] }) {
  const [kind, setKind] = useState<"todos" | IncidentKind>("todos")
  const [sev, setSev] = useState<"todas" | IncidentSeverity>("todas")
  const [status, setStatus] = useState<"todos" | IncidentStatus>("todos")
  const [proc, setProc] = useState("todos")
  const [q, setQ] = useState("")

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter(Boolean) as string[])].sort(), [items])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (kind !== "todos" && i.kind !== kind) return false
      if (sev !== "todas" && i.severity !== sev) return false
      if (status !== "todos" && i.status !== status) return false
      if (proc !== "todos" && i.processName !== proc) return false
      if (q.trim() && !`${i.code} ${i.location ?? ""} ${i.processName ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    }).sort((a, b) => rank(a) - rank(b) || b.occurredAt.localeCompare(a.occurredAt))
  }, [items, kind, sev, status, proc, q])

  const hasFilters = kind !== "todos" || sev !== "todas" || status !== "todos" || proc !== "todos" || q.trim() !== ""
  const clear = () => { setKind("todos"); setSev("todas"); setStatus("todos"); setProc("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="md:w-44" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo tipo</SelectItem>
            {KINDS.map((k) => <SelectItem key={k} value={k}>{INCIDENT_KIND_LABELS[k]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sev} onValueChange={(v) => setSev(v as typeof sev)}>
          <SelectTrigger className="md:w-40" aria-label="Severidad"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda severidad</SelectItem>
            {SEVS.map((s) => <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proc} onValueChange={setProc}>
          <SelectTrigger className="md:w-48" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-56" aria-label="Buscar incidente" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters
            ? <EmptyState icon={SearchXIcon} title="Ningún incidente coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
            : <EmptyState icon={SirenIcon} title="Aún no hay incidentes." description="Reporta el primero con «Reportar incidente»." />}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => (
              <li key={i.id} className="relative p-4 hover:bg-superficie-alt">
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <p className="mt-0.5 text-body">{i.location ?? "Sin lugar indicado"}</p>
                  </div>
                  <IncidentStatusBadge status={i.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-texto-sec">
                  <IncidentKindChip kind={i.kind} />
                  <SeverityBadge severity={i.severity} />
                  {i.processName && <span>· {i.processName}</span>}
                  <span>· {formatDate(i.occurredAt)}</span>
                  {i.overdue && <span className="font-medium text-error-texto">· Investigación vencida</span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
