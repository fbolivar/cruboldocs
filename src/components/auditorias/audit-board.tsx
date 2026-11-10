"use client"

import { ClipboardListIcon, SearchIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { AuditStatusBadge } from "@/components/auditorias/badges"
import { AUDIT_STATUS_LABELS } from "@/components/auditorias/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { AuditListItem, AuditStatus } from "@/lib/types"

const PATH = "/app/auditorias"
const STATUSES = Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]

/** Lista con filtros del lado del cliente. El backend moverá el filtro al servidor. */
export function AuditBoard({ items }: { items: AuditListItem[] }) {
  const [q, setQ] = useState("")
  const [estado, setEstado] = useState<"vigentes" | "todas" | AuditStatus>("vigentes")
  const [proceso, setProceso] = useState<string>("todos")
  const [anio, setAnio] = useState<string>("todos")

  const procesos = useMemo(() => [...new Set(items.flatMap((i) => i.processNames))].sort(), [items])
  const anios = useMemo(() => [...new Set(items.map((i) => i.plannedDate.slice(0, 4)))].sort().reverse(), [items])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter((i) => {
      if (term && !i.code.toLowerCase().includes(term) && !i.title.toLowerCase().includes(term)) return false
      if (estado === "vigentes" && i.status === "cancelada") return false
      if (estado !== "vigentes" && estado !== "todas" && i.status !== estado) return false
      if (proceso !== "todos" && !i.processNames.includes(proceso)) return false
      if (anio !== "todos" && i.plannedDate.slice(0, 4) !== anio) return false
      return true
    })
  }, [items, q, estado, proceso, anio])

  const hasFilters = q !== "" || estado !== "vigentes" || proceso !== "todos" || anio !== "todos"

  function clear() {
    setQ("")
    setEstado("vigentes")
    setProceso("todos")
    setAnio("todos")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o título" className="ps-9" aria-label="Buscar" />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vigentes">Vigentes</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{AUDIT_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-36" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los procesos</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
            <EmptyState icon={SearchXIcon} title="Ninguna auditoría coincide con estos filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={ClipboardListIcon} title="Aún no hay auditorías." description="Usa «Planificar auditoría» para programar la primera." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <THead>
                <Tr>
                  <Th>Código</Th><Th>Título</Th><Th>Procesos</Th><Th>Líder auditor</Th><Th>Fecha</Th><Th>Estado</Th>
                </Tr>
              </THead>
              <tbody>
                {filtered.map((i) => (
                  <Tr key={i.id} className="hover:bg-superficie-alt">
                    <Td className="font-mono whitespace-nowrap">
                      <Link href={`${PATH}/${i.code}`} className="font-medium text-acento hover:underline">{i.code}</Link>
                    </Td>
                    <Td className="max-w-md truncate">{i.title}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{i.processNames.join(", ") || "—"}</Td>
                    <Td className="whitespace-nowrap">{i.leadAuditorName ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{formatDate(i.plannedDate)}</Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <AuditStatusBadge status={i.status} />
                        {i.findingCount > 0 && <span className="text-caption text-texto-sec">{i.findingCount} hallazgos</span>}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          <ul className="divide-y divide-borde md:hidden">
            {filtered.map((i) => (
              <li key={i.id} className="relative p-4">
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-small">{i.code}</span>
                  <AuditStatusBadge status={i.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-body">{i.title}</p>
                <p className="mt-1 text-caption text-texto-sec">
                  {i.processNames.join(", ") || "—"} · {i.leadAuditorName ?? "—"} · {formatDate(i.plannedDate)}
                  {i.findingCount > 0 ? ` · ${i.findingCount} hallazgos` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
