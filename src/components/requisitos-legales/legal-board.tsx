"use client"

import { ScaleIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { ComplianceBadge, SourceChip } from "@/components/requisitos-legales/badges"
import { COMPLIANCE_LABELS, SOURCE_LABELS } from "@/components/requisitos-legales/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, todayIsoDate } from "@/lib/format"
import type { LegalCompliance, LegalRequirementListItem, LegalSource } from "@/lib/types"

const PATH = "/app/requisitos-legales"
const SOURCES = Object.keys(SOURCE_LABELS) as LegalSource[]
const COMPLIANCES = Object.keys(COMPLIANCE_LABELS) as LegalCompliance[]

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}

export function LegalBoard({ items }: { items: LegalRequirementListItem[] }) {
  const today = todayIsoDate()
  const soon = addDaysIso(today, 30)
  const [fuente, setFuente] = useState<"todas" | LegalSource>("todas")
  const [cumpl, setCumpl] = useState<"todos" | LegalCompliance>("todos")
  const [proceso, setProceso] = useState("todos")
  const [venc, setVenc] = useState<"todas" | "vencidas" | "por_vencer">("todas")
  const [q, setQ] = useState("")
  const [verDerogados, setVerDerogados] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const overdue = (i: LegalRequirementListItem) => i.status === "vigente" && i.nextEvalDate !== null && i.nextEvalDate < today
  const dueSoon = (i: LegalRequirementListItem) => i.status === "vigente" && i.nextEvalDate !== null && i.nextEvalDate >= today && i.nextEvalDate <= soon
  const rank = (i: LegalRequirementListItem) => (overdue(i) ? 0 : dueSoon(i) ? 1 : i.compliance === "no_cumple" ? 2 : i.compliance === "parcial" ? 3 : 4)

  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (!verDerogados && i.status === "derogado") return false
      if (fuente !== "todas" && i.sourceType !== fuente) return false
      if (cumpl !== "todos" && i.compliance !== cumpl) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (venc === "vencidas" && !overdue(i)) return false
      if (venc === "por_vencer" && !dueSoon(i)) return false
      if (q.trim() && !`${i.code} ${i.title} ${i.reference}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code))
  }, [items, fuente, cumpl, proceso, venc, q, verDerogados]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = fuente !== "todas" || cumpl !== "todos" || proceso !== "todos" || venc !== "todas" || q.trim() !== ""
  const clear = () => { setFuente("todas"); setCumpl("todos"); setProceso("todos"); setVenc("todas"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={fuente} onValueChange={(v) => setFuente(v as typeof fuente)}>
          <SelectTrigger className="md:w-40" aria-label="Fuente"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda fuente</SelectItem>
            {SOURCES.map((sfx) => <SelectItem key={sfx} value={sfx}>{SOURCE_LABELS[sfx]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cumpl} onValueChange={(v) => setCumpl(v as typeof cumpl)}>
          <SelectTrigger className="md:w-44" aria-label="Cumplimiento"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo cumplimiento</SelectItem>
            {COMPLIANCES.map((c) => <SelectItem key={c} value={c}>{COMPLIANCE_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={venc} onValueChange={(v) => setVenc(v as typeof venc)}>
          <SelectTrigger className="md:w-44" aria-label="Vencimiento"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todo vencimiento</SelectItem>
            <SelectItem value="vencidas">Reevaluación vencida</SelectItem>
            <SelectItem value="por_vencer">Por reevaluar (30 días)</SelectItem>
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-52" aria-label="Buscar requisitos" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verDerogados} onChange={(e) => setVerDerogados(e.target.checked)} className="accent-acento" /> Mostrar derogados
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún requisito coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={ScaleIcon} title="Aún no hay requisitos legales." description="Registra el primero con «Nuevo requisito»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => {
              const realce = overdue(i) || dueSoon(i)
              return (
                <li key={i.id} className={`relative p-4 hover:bg-superficie-alt ${i.status === "derogado" ? "opacity-60" : ""}`}>
                  <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                      <SourceChip source={i.sourceType} />
                      <p className="text-body">{i.title}</p>
                    </div>
                    <ComplianceBadge compliance={i.compliance} />
                  </div>
                  <p className="mt-1 text-caption text-texto-sec">
                    {i.reference}{i.processName ? ` · ${i.processName}` : ""}
                    {i.status === "derogado" ? " · Derogado" : i.nextEvalDate ? (
                      <span className={realce ? " font-medium text-advertencia-texto" : ""}> · Reevaluar {formatDate(i.nextEvalDate)}{overdue(i) ? " (vencida)" : ""}</span>
                    ) : " · Sin evaluar"}
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
