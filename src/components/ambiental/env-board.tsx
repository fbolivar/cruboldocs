"use client"

import { LeafIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { ConditionChip, SignificanceBadge } from "@/components/ambiental/badges"
import { CONDITION_LABELS, SIGNIFICANCE_LABELS } from "@/components/ambiental/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EnvAspectListItem, EnvCondition, EnvSignificance } from "@/lib/types"

const PATH = "/app/aspectos-ambientales"
const CONDITIONS = Object.keys(CONDITION_LABELS) as EnvCondition[]
const SIGS = Object.keys(SIGNIFICANCE_LABELS) as EnvSignificance[]

export function EnvBoard({ items }: { items: EnvAspectListItem[] }) {
  const [cond, setCond] = useState<"todas" | EnvCondition>("todas")
  const [sig, setSig] = useState<"todas" | EnvSignificance>("todas")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [verInactivos, setVerInactivos] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (!verInactivos && i.status === "inactivo") return false
      if (cond !== "todas" && i.condition !== cond) return false
      if (sig !== "todas" && i.significance !== sig) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (q.trim() && !`${i.code} ${i.aspect} ${i.impact}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => (a.significance === b.significance ? a.code.localeCompare(b.code) : a.significance === "significativo" ? -1 : 1))
  }, [items, cond, sig, proceso, q, verInactivos])

  const hasFilters = cond !== "todas" || sig !== "todas" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setCond("todas"); setSig("todas"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={cond} onValueChange={(v) => setCond(v as typeof cond)}>
          <SelectTrigger className="md:w-40" aria-label="Condición"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda condición</SelectItem>
            {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sig} onValueChange={(v) => setSig(v as typeof sig)}>
          <SelectTrigger className="md:w-48" aria-label="Significancia"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda significancia</SelectItem>
            {SIGS.map((x) => <SelectItem key={x} value={x}>{SIGNIFICANCE_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar aspectos" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} className="accent-acento" /> Mostrar inactivos
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún aspecto coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={LeafIcon} title="Aún no hay aspectos ambientales." description="Registra el primero con «Nuevo aspecto»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => (
              <li key={i.id} className={`relative p-4 hover:bg-superficie-alt ${i.status === "inactivo" ? "opacity-60" : ""}`}>
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <ConditionChip condition={i.condition} />
                    <p className="text-body">{i.aspect}</p>
                  </div>
                  <SignificanceBadge significance={i.significance} />
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processName ? `${i.processName} · ` : ""}Impacto: {i.impact} · Índice {i.score}{i.status === "inactivo" ? " · Inactivo" : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
