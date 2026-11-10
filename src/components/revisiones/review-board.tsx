"use client"

import { ClipboardPenIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { ReviewStatusBadge } from "@/components/revisiones/badges"
import { REVIEW_STATUS_LABELS } from "@/components/revisiones/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import type { ReviewListItem, ReviewStatus } from "@/lib/types"

const PATH = "/app/revisiones"
const STATUSES = Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function periodo(start: string, end: string): string {
  const m = (iso: string) => MESES[Number(iso.slice(5, 7)) - 1]
  return `${m(start)}–${m(end)} ${end.slice(0, 4)}`
}

/** Lista con filtros del lado del cliente. El backend moverá el filtro al servidor. */
export function ReviewBoard({ items }: { items: ReviewListItem[] }) {
  const [estado, setEstado] = useState<"todas" | ReviewStatus>("todas")
  const [anio, setAnio] = useState("todos")

  const anios = useMemo(() => [...new Set(items.map((i) => i.meetingDate.slice(0, 4)))].sort().reverse(), [items])

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (estado !== "todas" && i.status !== estado) return false
        if (anio !== "todos" && i.meetingDate.slice(0, 4) !== anio) return false
        return true
      }),
    [items, estado, anio],
  )

  const hasFilters = estado !== "todas" || anio !== "todos"

  function clear() {
    setEstado("todas")
    setAnio("todos")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{REVIEW_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={anio} onValueChange={setAnio}>
          <SelectTrigger className="md:w-28" aria-label="Año"><SelectValue placeholder="Año" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo año</SelectItem>
            {anios.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna acta coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={ClipboardPenIcon} title="Aún no hay revisiones por la dirección." description="Crea la primera acta del periodo con «Nueva revisión»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => (
              <li key={i.id} className="relative p-4 hover:bg-superficie-alt">
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <p className="mt-0.5 text-body">{i.title}</p>
                  </div>
                  <ReviewStatusBadge status={i.status} />
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  Periodo {periodo(i.periodStart, i.periodEnd)} · Reunión {formatDate(i.meetingDate)} · {i.outputCount} decisiones
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
