"use client"

import { NotebookPenIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { MeetingTypeChip, MinuteStatusBadge } from "@/components/actas/badges"
import { MINUTE_STATUS_LABELS } from "@/components/actas/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import type { MinuteListItem, MinuteStatus } from "@/lib/types"

const PATH = "/app/actas"
const STATUSES = Object.keys(MINUTE_STATUS_LABELS) as MinuteStatus[]

export function MinutesBoard({ items }: { items: MinuteListItem[] }) {
  const [tipo, setTipo] = useState("todos")
  const [estado, setEstado] = useState<"todos" | MinuteStatus>("todos")
  const [anio, setAnio] = useState("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")

  const tipos = useMemo(() => [...new Set(items.map((i) => i.meetingType))].sort(), [items])
  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])
  const anios = useMemo(() => [...new Set(items.map((i) => i.meetingDate.slice(0, 4)))].sort().reverse(), [items])
  // Borradores primero, luego por fecha de reunión reciente.
  const rank = (i: MinuteListItem) => (i.status === "borrador" ? 0 : 1)

  const filtered = useMemo(() => {
    const out = items.filter((i) => {
      if (tipo !== "todos" && i.meetingType !== tipo) return false
      if (estado !== "todos" && i.status !== estado) return false
      if (anio !== "todos" && i.meetingDate.slice(0, 4) !== anio) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (q.trim() && !`${i.code} ${i.title}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
    return out.sort((a, b) => rank(a) - rank(b) || b.meetingDate.localeCompare(a.meetingDate))
  }, [items, tipo, estado, anio, proceso, q])

  const hasFilters = tipo !== "todos" || estado !== "todos" || anio !== "todos" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setTipo("todos"); setEstado("todos"); setAnio("todos"); setProceso("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="md:w-40" aria-label="Tipo"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo tipo</SelectItem>
            {tipos.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{MINUTE_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={anio} onValueChange={setAnio}>
          <SelectTrigger className="md:w-32" aria-label="Año"><SelectValue placeholder="Año" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo año</SelectItem>
            {anios.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-52" aria-label="Buscar actas" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna acta coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={NotebookPenIcon} title="Aún no hay actas." description="Crea la primera con «Nueva acta»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((i) => (
              <li key={i.id} className="relative p-4 hover:bg-superficie-alt">
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <MeetingTypeChip type={i.meetingType} />
                    <p className="text-body">{i.title}</p>
                  </div>
                  <MinuteStatusBadge status={i.status} />
                </div>
                <p className="mt-1 text-caption text-texto-sec">
                  {formatDate(i.meetingDate)}
                  {i.processName ? ` · ${i.processName}` : ""}
                  {" · "}
                  <span>{i.commitmentCount} {i.commitmentCount === 1 ? "compromiso" : "compromisos"}</span>
                  {i.pendingCount > 0 && <span className="font-medium text-advertencia-texto"> ({i.pendingCount} {i.pendingCount === 1 ? "pendiente" : "pendientes"})</span>}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
