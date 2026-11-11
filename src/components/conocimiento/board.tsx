"use client"

import { BookOpenIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { KNOWLEDGE_CATEGORY_LABELS } from "@/components/conocimiento/labels"
import { ArticleRowMenu } from "@/components/conocimiento/manage"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { KnowledgeCategory, KnowledgeListItem, KnowledgeSummary } from "@/lib/types"

const PATH = "/app/conocimiento"
const CATEGORIES = Object.keys(KNOWLEDGE_CATEGORY_LABELS) as KnowledgeCategory[]

export function KnowledgeSummaryBar({ summary }: { summary: KnowledgeSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Card className="p-4"><p className="text-caption text-texto-sec">Artículos</p><p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.total}</p></Card>
      {CATEGORIES.map((c) => (
        <Card key={c} className="p-4"><p className="text-caption text-texto-sec">{KNOWLEDGE_CATEGORY_LABELS[c]}</p><p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.byCategory[c]}</p></Card>
      ))}
    </div>
  )
}

export function KnowledgeBoard({ items }: { items: KnowledgeListItem[] }) {
  const [cat, setCat] = useState<"todas" | KnowledgeCategory>("todas")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [verArchivados, setVerArchivados] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => items.filter((i) => {
    if (!verArchivados && i.status === "archivado") return false
    if (cat !== "todas" && i.category !== cat) return false
    if (proceso !== "todos" && i.processName !== proceso) return false
    if (q.trim() && !`${i.code} ${i.title}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }).sort((a, b) => b.code.localeCompare(a.code)), [items, cat, proceso, q, verArchivados])

  const hasFilters = cat !== "todas" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setCat("todas"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={cat} onValueChange={(v) => setCat(v as typeof cat)}>
          <SelectTrigger className="md:w-48" aria-label="Categoría"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda categoría</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{KNOWLEDGE_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar artículos" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} className="accent-acento" /> Mostrar archivados
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún artículo coincide." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={BookOpenIcon} title="Aún no hay conocimiento registrado." description="Crea el primer artículo o registra una lección desde una NC o auditoría." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => (
              <li key={i.id} className={`relative p-4 hover:bg-superficie-alt ${i.status === "archivado" ? "opacity-60" : ""}`}>
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <p className="text-body">{i.title}</p>
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    <Chip>{KNOWLEDGE_CATEGORY_LABELS[i.category]}</Chip>
                    <ArticleRowMenu item={i} />
                  </div>
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processName ? `${i.processName}` : "Sin proceso"}
                  {i.sourceNcCode ? ` · → ${i.sourceNcCode}` : i.sourceAuditCode ? ` · → ${i.sourceAuditCode}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
