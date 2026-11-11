"use client"

import { ClipboardListIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { FormCategoryChip, FormStatusBadge } from "@/components/formularios/badges"
import { FORM_CATEGORY_LABELS, FORM_STATUS_LABELS } from "@/components/formularios/labels"
import { TemplateRowMenu } from "@/components/formularios/forms-manage"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FormCategory, FormsSummary, FormStatus, FormTemplateListItem } from "@/lib/types"

const PATH = "/app/formularios"
const CATEGORIES = Object.keys(FORM_CATEGORY_LABELS) as FormCategory[]
const STATUSES = Object.keys(FORM_STATUS_LABELS) as FormStatus[]

export function FormsSummaryBar({ summary }: { summary: FormsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Plantillas</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.total}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Publicadas</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.published}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Respuestas (mes)</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.submissionsThisMonth}</p>
      </Card>
    </div>
  )
}

export function FormsBoard({ items }: { items: FormTemplateListItem[] }) {
  const [cat, setCat] = useState<"todas" | FormCategory>("todas")
  const [status, setStatus] = useState<"todos" | FormStatus>("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [verArchivadas, setVerArchivadas] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (!verArchivadas && i.status === "archivado") return false
      if (cat !== "todas" && i.category !== cat) return false
      if (status !== "todos" && i.status !== status) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (q.trim() && !`${i.code} ${i.title}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => b.code.localeCompare(a.code))
  }, [items, cat, status, proceso, q, verArchivadas])

  const hasFilters = cat !== "todas" || status !== "todos" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setCat("todas"); setStatus("todos"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={cat} onValueChange={(v) => setCat(v as typeof cat)}>
          <SelectTrigger className="md:w-48" aria-label="Categoría"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda categoría</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{FORM_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="md:w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((x) => <SelectItem key={x} value={x}>{FORM_STATUS_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar plantillas" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verArchivadas} onChange={(e) => setVerArchivadas(e.target.checked)} className="accent-acento" /> Mostrar archivadas
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna plantilla coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={ClipboardListIcon} title="Aún no tienes plantillas." description="Crea la primera con «Nueva plantilla»." />
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
                    <FormCategoryChip category={i.category} />
                    <p className="text-body">{i.title}</p>
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    <FormStatusBadge status={i.status} version={i.version} />
                    {i.status === "publicado" ? (
                      <Link href={`${PATH}/${i.code}/responder`} className="text-small font-medium text-acento hover:underline">Diligenciar</Link>
                    ) : i.status === "borrador" && i.canManage ? (
                      <Link href={`${PATH}/${i.code}/disenar`} className="text-small font-medium text-acento hover:underline">Diseñar</Link>
                    ) : null}
                    <TemplateRowMenu item={i} />
                  </div>
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processName ? `${i.processName} · ` : ""}{i.fieldCount} campos · {i.submissionCount} respuestas
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
