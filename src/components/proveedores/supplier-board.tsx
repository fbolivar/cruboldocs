"use client"

import { SearchXIcon, TruckIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { CriticalityChip, SupplierKindChip, SupplierStatusBadge } from "@/components/proveedores/badges"
import { CRITICALITY_LABELS, SUPPLIER_STATUS_LABELS } from "@/components/proveedores/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, todayIsoDate } from "@/lib/format"
import type { SupplierCriticality, SupplierListItem, SupplierStatus } from "@/lib/types"

const PATH = "/app/proveedores"
const STATUSES = Object.keys(SUPPLIER_STATUS_LABELS) as SupplierStatus[]
const CRITS = Object.keys(CRITICALITY_LABELS) as SupplierCriticality[]

/** Vencida o dentro de 30 días (solo informa el realce en la fila). */
function dueSoon(d: string | null): boolean {
  if (!d) return false
  return (new Date(d).getTime() - Date.now()) / 86_400_000 <= 30
}
const dueRank = (s: SupplierListItem) => (s.status === "inactivo" ? 2 : dueSoon(s.nextEvalDate) ? 0 : 1)

export function SupplierBoard({ items }: { items: SupplierListItem[] }) {
  const [estado, setEstado] = useState<"todos" | SupplierStatus>("todos")
  const [crit, setCrit] = useState<"todas" | SupplierCriticality>("todas")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])

  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (estado !== "todos" && i.status !== estado) return false
      if (crit !== "todas" && i.criticality !== crit) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (q.trim() && !`${i.name} ${i.code}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => dueRank(a) - dueRank(b) || a.name.localeCompare(b.name))
  }, [items, estado, crit, proceso, q])

  const hasFilters = estado !== "todos" || crit !== "todas" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setEstado("todos"); setCrit("todas"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{SUPPLIER_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={crit} onValueChange={(v) => setCrit(v as typeof crit)}>
          <SelectTrigger className="md:w-44" aria-label="Criticidad"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda criticidad</SelectItem>
            {CRITS.map((c) => <SelectItem key={c} value={c}>{CRITICALITY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-48" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-56" aria-label="Buscar proveedor" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún proveedor coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={TruckIcon} title="Aún no hay proveedores." description="Registra el primero con «Nuevo proveedor»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => {
              const vencida = i.nextEvalDate && i.nextEvalDate < todayIsoDate()
              return (
                <li key={i.id} className="relative p-4 hover:bg-superficie-alt">
                  <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                      <p className="mt-0.5 text-body">{i.name}</p>
                    </div>
                    <SupplierStatusBadge status={i.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-texto-sec">
                    <SupplierKindChip kind={i.kind} />
                    <CriticalityChip criticality={i.criticality} />
                    {i.processName && <span>· {i.processName}</span>}
                    {i.nextEvalDate && (
                      <span className={vencida || dueSoon(i.nextEvalDate) ? "font-medium text-advertencia-texto" : ""}>
                        · Reevaluar {formatDate(i.nextEvalDate)}{vencida ? " (vencida)" : ""}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
