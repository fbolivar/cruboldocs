"use client"

import { InboxIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { SolicitudStatusBadge, SOLICITUD_STATUS_LABELS } from "@/components/solicitudes/labels"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/format"
import type { SolicitudListItem, SolicitudStatus } from "@/lib/types"

const STATUSES = Object.keys(SOLICITUD_STATUS_LABELS) as SolicitudStatus[]

export function SolicitudesBoard({ items }: { items: SolicitudListItem[] }) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<"" | SolicitudStatus>("")
  const [mineOnly, setMineOnly] = useState(false)

  const flows = useMemo(() => [...new Set(items.map((i) => i.flowName))].sort(), [items])
  const [flow, setFlow] = useState("")

  const filtered = items.filter((i) => {
    if (status && i.status !== status) return false
    if (flow && i.flowName !== flow) return false
    if (mineOnly && !i.pendingForMe) return false
    if (q && !`${i.code} ${i.title}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const select = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código o título" className="max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value as SolicitudStatus | "")} className={select} aria-label="Estado">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{SOLICITUD_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={flow} onChange={(e) => setFlow(e.target.value)} className={select} aria-label="Flujo">
          <option value="">Todos los flujos</option>
          {flows.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="size-4 accent-acento" />
          Pendientes de mí
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={InboxIcon} title="Sin solicitudes" description="Radica una nueva solicitud o ajusta los filtros." />
      ) : (
        <ul className="flex flex-col divide-y divide-borde rounded-lg border border-borde">
          {filtered.map((i) => (
            <li key={i.id}>
              <Link href={`/app/solicitudes/${i.code}`} className="flex items-center justify-between gap-3 p-3 hover:bg-superficie-alt">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-caption text-texto-sec">{i.code}</span>
                    <SolicitudStatusBadge status={i.status} />
                    {i.pendingForMe && <Badge tone="advertencia">Te toca</Badge>}
                  </div>
                  <p className="truncate text-body text-texto">{i.title}</p>
                  <p className="text-caption text-texto-sec">
                    {i.flowName}
                    {i.status === "pendiente" && ` · Paso ${i.currentStep}/${i.totalSteps}${i.currentApproverName ? ` · ${i.currentApproverName}` : ""}`}
                  </p>
                </div>
                <span className="shrink-0 text-caption text-texto-sec">{formatDate(i.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SolicitudesSummaryBar({ summary }: { summary: { pending: number; pendingForMe: number; closed: number } }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-borde bg-superficie p-4">
        <p className="text-caption text-texto-sec">Pendientes</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.pending}</p>
      </div>
      <div className="rounded-lg border border-borde bg-superficie p-4">
        <p className="text-caption text-texto-sec">Pendientes de mi aprobación</p>
        <p className={`mt-1 font-display text-h2 tabular-nums ${summary.pendingForMe > 0 ? "text-advertencia-texto" : "text-texto"}`}>{summary.pendingForMe}</p>
      </div>
      <div className="rounded-lg border border-borde bg-superficie p-4">
        <p className="text-caption text-texto-sec">Cerradas</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.closed}</p>
      </div>
    </div>
  )
}
