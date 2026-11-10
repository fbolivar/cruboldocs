"use client"

import { MessagesSquareIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { PqrsStatusBadge, PqrsTypeChip } from "@/components/pqrs/badges"
import { PQRS_STATUS_LABELS, PQRS_TYPE_LABELS, isOpen } from "@/components/pqrs/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, todayIsoDate } from "@/lib/format"
import type { PqrsListItem, PqrsStatus, PqrsType } from "@/lib/types"

const PATH = "/app/pqrs"
const TYPES = Object.keys(PQRS_TYPE_LABELS) as PqrsType[]
const STATUSES = Object.keys(PQRS_STATUS_LABELS) as PqrsStatus[]

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}

export function PqrsBoard({ items }: { items: PqrsListItem[] }) {
  const today = todayIsoDate()
  const soon = addDaysIso(today, 7)
  const [tipo, setTipo] = useState<"todos" | PqrsType>("todos")
  const [estado, setEstado] = useState<"todos" | PqrsStatus>("todos")
  const [venc, setVenc] = useState<"todas" | "vencidas" | "por_vencer">("todas")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const overdue = (i: PqrsListItem) => isOpen(i.status) && i.dueDate < today
  const dueSoon = (i: PqrsListItem) => isOpen(i.status) && i.dueDate >= today && i.dueDate <= soon
  const rank = (i: PqrsListItem) => (overdue(i) ? 0 : dueSoon(i) ? 1 : isOpen(i.status) ? 2 : 3)

  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (tipo !== "todos" && i.type !== tipo) return false
      if (estado !== "todos" && i.status !== estado) return false
      if (venc === "vencidas" && !overdue(i)) return false
      if (venc === "por_vencer" && !dueSoon(i)) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (q.trim() && !`${i.code} ${i.customerName ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => rank(a) - rank(b) || b.dueDate.localeCompare(a.dueDate))
  }, [items, tipo, estado, venc, proceso, q]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = tipo !== "todos" || estado !== "todos" || venc !== "todas" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setTipo("todos"); setEstado("todos"); setVenc("todas"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="md:w-40" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo tipo</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{PQRS_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{PQRS_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={venc} onValueChange={(v) => setVenc(v as typeof venc)}>
          <SelectTrigger className="md:w-40" aria-label="Vencimiento"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todo vencimiento</SelectItem>
            <SelectItem value="vencidas">Vencidas</SelectItem>
            <SelectItem value="por_vencer">Por vencer (7 días)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-52" aria-label="Buscar PQRS" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna PQRS coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={MessagesSquareIcon} title="Aún no hay PQRS." description="Registra la primera con «Nueva PQRS»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => {
              const venceTone = overdue(i) || dueSoon(i)
              return (
                <li key={i.id} className="relative p-4 hover:bg-superficie-alt">
                  <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                      <PqrsTypeChip type={i.type} />
                      <p className="text-body">{i.customerName ?? "—"}</p>
                    </div>
                    <PqrsStatusBadge status={i.status} />
                  </div>
                  <p className="mt-1 text-caption text-texto-sec">
                    {i.processName ? `${i.processName} · ` : ""}
                    <span className={isOpen(i.status) && venceTone ? "font-medium text-advertencia-texto" : ""}>
                      {isOpen(i.status) ? "Vence" : "Vencía"} {formatDate(i.dueDate)}{overdue(i) ? " (vencida)" : ""}
                    </span>
                  </p>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
