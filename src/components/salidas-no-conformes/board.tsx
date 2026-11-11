"use client"

import { PackageXIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { DispositionChip, NcOutputStatusBadge } from "@/components/salidas-no-conformes/badges"
import { DISPOSITION_LABELS, NC_OUTPUT_STATUS_LABELS } from "@/components/salidas-no-conformes/labels"
import { NcOutputRowMenu } from "@/components/salidas-no-conformes/manage"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import type { Disposition, NcOutputListItem, NcOutputStatus, NcOutputsSummary } from "@/lib/types"

const PATH = "/app/salidas-no-conformes"
const STATUSES = Object.keys(NC_OUTPUT_STATUS_LABELS) as NcOutputStatus[]
const DISPOSITIONS = Object.keys(DISPOSITION_LABELS) as Disposition[]

export function NcOutputsSummaryBar({ summary }: { summary: NcOutputsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[["Abiertas", summary.open], ["Tratadas", summary.treated], ["Cerradas", summary.closed]].map(([label, n]) => (
        <Card key={label} className="p-4">
          <p className="text-caption text-texto-sec">{label}</p>
          <p className="mt-1 font-display text-h2 tabular-nums text-texto">{n}</p>
        </Card>
      ))}
    </div>
  )
}

export function NcOutputsBoard({ items }: { items: NcOutputListItem[] }) {
  const [status, setStatus] = useState<"todos" | NcOutputStatus>("todos")
  const [disp, setDisp] = useState<"todas" | Disposition>("todas")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [verAnuladas, setVerAnuladas] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => items.filter((i) => {
    if (!verAnuladas && i.status === "anulado") return false
    if (status !== "todos" && i.status !== status) return false
    if (disp !== "todas" && i.disposition !== disp) return false
    if (proceso !== "todos" && i.processName !== proceso) return false
    if (q.trim() && !`${i.code} ${i.description}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }).sort((a, b) => b.code.localeCompare(a.code)), [items, status, disp, proceso, q, verAnuladas])

  const hasFilters = status !== "todos" || disp !== "todas" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setStatus("todos"); setDisp("todas"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="md:w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((x) => <SelectItem key={x} value={x}>{NC_OUTPUT_STATUS_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disp} onValueChange={(v) => setDisp(v as typeof disp)}>
          <SelectTrigger className="md:w-48" aria-label="Disposición"><SelectValue placeholder="Disposición" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda disposición</SelectItem>
            {DISPOSITIONS.map((x) => <SelectItem key={x} value={x}>{DISPOSITION_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar salidas" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verAnuladas} onChange={(e) => setVerAnuladas(e.target.checked)} className="accent-acento" /> Mostrar anuladas
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna salida coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={PackageXIcon} title="Sin salidas no conformes." description="Registra la primera con «Nueva salida»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => (
              <li key={i.id} className={`relative p-4 hover:bg-superficie-alt ${i.status === "anulado" ? "opacity-60" : ""}`}>
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <p className="text-body">{i.description}</p>
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    <NcOutputStatusBadge status={i.status} />
                    {i.disposition && <DispositionChip disposition={i.disposition} />}
                    <NcOutputRowMenu item={i} />
                  </div>
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processName ? `${i.processName} · ` : ""}detectada {formatDate(i.detectedDate)}
                  {i.nonconformityCode ? ` · → ${i.nonconformityCode}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
