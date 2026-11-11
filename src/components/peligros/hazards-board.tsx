"use client"

import { HardHatIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { HazardClassChip, RiskLevelBadge } from "@/components/peligros/badges"
import { CLASS_LABELS, RISK_LEVEL_LABELS } from "@/components/peligros/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { HazardClass, HazardListItem, HazardRiskLevel } from "@/lib/types"

const PATH = "/app/peligros"
const CLASSES = Object.keys(CLASS_LABELS) as HazardClass[]
const LEVELS = Object.keys(RISK_LEVEL_LABELS) as HazardRiskLevel[]
const rank: Record<HazardRiskLevel, number> = { I: 0, II: 1, III: 2, IV: 3 }

export function HazardsBoard({ items }: { items: HazardListItem[] }) {
  const [proceso, setProceso] = useState("todos")
  const [clase, setClase] = useState<"todas" | HazardClass>("todas")
  const [nivel, setNivel] = useState<"todos" | HazardRiskLevel>("todos")
  const [q, setQ] = useState("")
  const [verInactivos, setVerInactivos] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (!verInactivos && i.status === "inactivo") return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (clase !== "todas" && i.classification !== clase) return false
      if (nivel !== "todos" && i.riskLevel !== nivel) return false
      if (q.trim() && !`${i.code} ${i.hazard}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => rank[a.riskLevel] - rank[b.riskLevel] || b.nr - a.nr)
  }, [items, proceso, clase, nivel, q, verInactivos])

  const hasFilters = proceso !== "todos" || clase !== "todas" || nivel !== "todos" || q.trim() !== ""
  const clear = () => { setProceso("todos"); setClase("todas"); setNivel("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clase} onValueChange={(v) => setClase(v as typeof clase)}>
          <SelectTrigger className="md:w-52" aria-label="Clasificación"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda clasificación</SelectItem>
            {CLASSES.map((c) => <SelectItem key={c} value={c}>{CLASS_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={nivel} onValueChange={(v) => setNivel(v as typeof nivel)}>
          <SelectTrigger className="md:w-36" aria-label="Nivel"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo nivel</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={l}>{RISK_LEVEL_LABELS[l]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar peligros" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} className="accent-acento" /> Mostrar inactivos
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún peligro coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={HardHatIcon} title="Aún no hay peligros identificados." description="Registra el primero con «Nuevo peligro»." />
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
                    <HazardClassChip classification={i.classification} />
                    <p className="text-body">{i.hazard}</p>
                  </div>
                  <RiskLevelBadge level={i.riskLevel} />
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processName ? `Proceso ${i.processName}` : "Sin proceso"}{i.area ? ` · ${i.area}` : ""} · NR {i.nr}{i.status === "inactivo" ? " · Inactivo" : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
