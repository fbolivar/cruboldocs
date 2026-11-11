"use client"

import { GraduationCapIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { CourseStatusBadge } from "@/components/capacitacion/badges"
import { COURSE_STATUS_LABELS } from "@/components/capacitacion/labels"
import { CourseRowMenu } from "@/components/capacitacion/courses-manage"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CourseListItem, CoursesSummary, CourseStatus } from "@/lib/types"

const PATH = "/app/capacitacion"
const STATUSES = Object.keys(COURSE_STATUS_LABELS) as CourseStatus[]

export function CoursesSummaryBar({ summary }: { summary: CoursesSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Cursos</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.total}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Publicados</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.published}</p>
      </Card>
      <Card className="p-4">
        <p className="text-caption text-texto-sec">Aprobaciones (mes)</p>
        <p className="mt-1 font-display text-h2 tabular-nums text-texto">{summary.approvedThisMonth}</p>
      </Card>
    </div>
  )
}

export function CoursesBoard({ items }: { items: CourseListItem[] }) {
  const [status, setStatus] = useState<"todos" | CourseStatus>("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [verArchivados, setVerArchivados] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (!verArchivados && i.status === "archivado") return false
      if (status !== "todos" && i.status !== status) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (q.trim() && !`${i.code} ${i.title}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => b.code.localeCompare(a.code))
  }, [items, status, proceso, q, verArchivados])

  const hasFilters = status !== "todos" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setStatus("todos"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="md:w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((x) => <SelectItem key={x} value={x}>{COURSE_STATUS_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar cursos" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} className="accent-acento" /> Mostrar archivados
        </label>
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún curso coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={GraduationCapIcon} title="Aún no hay cursos." description="Crea el primero con «Nuevo curso»." />
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
                    <CourseStatusBadge status={i.status} />
                    <span className="text-caption text-texto-sec">Aprob. {i.passingScore}%</span>
                    {i.status === "publicado" ? (
                      <Link href={`${PATH}/${i.code}/tomar`} className="text-small font-medium text-acento hover:underline">Tomar</Link>
                    ) : i.status === "borrador" && i.canManage ? (
                      <Link href={`${PATH}/${i.code}`} className="text-small font-medium text-acento hover:underline">Diseñar</Link>
                    ) : null}
                    <CourseRowMenu item={i} />
                  </div>
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processName ? `${i.processName} · ` : ""}{i.questionCount} preguntas · {i.approvedCount} aprobados
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
