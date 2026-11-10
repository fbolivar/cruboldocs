"use client"

import { ClipboardCheckIcon, SearchIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { NcSeverityBadge, NcStatusBadge } from "@/components/no-conformidades/badges"
import { SEVERITY_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/components/no-conformidades/labels"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { NcListItem, NcSeverity, NcSource, NcStatus } from "@/lib/types"

const PATH = "/app/no-conformidades"
const SOURCES = Object.keys(SOURCE_LABELS) as NcSource[]
const SEVERITIES = Object.keys(SEVERITY_LABELS) as NcSeverity[]
const STATUSES = Object.keys(STATUS_LABELS) as NcStatus[]
const CLOSED: NcStatus[] = ["cerrada", "anulada"]

function OverdueMark({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-caption text-error-texto">
      <TriangleAlertIcon className="size-3.5" aria-hidden="true" /> {n} venc.
    </span>
  )
}

/** Lista con filtros del lado del cliente sobre los datos recibidos. El backend moverá el filtro al servidor. */
export function NcBoard({ items }: { items: NcListItem[] }) {
  const [q, setQ] = useState("")
  const [estado, setEstado] = useState<"activas" | "todas" | NcStatus>("activas")
  const [proceso, setProceso] = useState<string>("todos")
  const [origen, setOrigen] = useState<NcSource | "todos">("todos")
  const [severidad, setSeveridad] = useState<NcSeverity | "todas">("todas")

  const procesos = useMemo(
    () => [...new Set(items.map((i) => i.processName).filter((p): p is string => !!p))].sort(),
    [items]
  )

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter((i) => {
      if (term && !i.code.toLowerCase().includes(term) && !i.title.toLowerCase().includes(term)) return false
      if (estado === "activas" && CLOSED.includes(i.status)) return false
      if (estado !== "activas" && estado !== "todas" && i.status !== estado) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (origen !== "todos" && i.source !== origen) return false
      if (severidad !== "todas" && i.severity !== severidad) return false
      return true
    })
  }, [items, q, estado, proceso, origen, severidad])

  const hasFilters = q !== "" || estado !== "activas" || proceso !== "todos" || origen !== "todos" || severidad !== "todas"

  function clear() {
    setQ("")
    setEstado("activas")
    setProceso("todos")
    setOrigen("todos")
    setSeveridad("todas")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o descripción" className="ps-9" aria-label="Buscar" />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activas">Activas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-36" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los procesos</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={origen} onValueChange={(v) => setOrigen(v as typeof origen)}>
          <SelectTrigger className="md:w-44" aria-label="Origen"><SelectValue placeholder="Origen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los orígenes</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severidad} onValueChange={(v) => setSeveridad(v as typeof severidad)}>
          <SelectTrigger className="md:w-40" aria-label="Severidad"><SelectValue placeholder="Severidad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda severidad</SelectItem>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna no conformidad coincide con estos filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={ClipboardCheckIcon} title="Aún no hay no conformidades registradas." description="Usa «Reportar no conformidad» para registrar la primera." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Escritorio */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <Tr>
                  <Th>Código</Th><Th>Descripción</Th><Th>Proceso</Th><Th>Origen</Th><Th>Severidad</Th><Th>Estado</Th>
                </Tr>
              </THead>
              <tbody>
                {filtered.map((i) => (
                  <Tr key={i.id} className="hover:bg-superficie-alt">
                    <Td className="font-mono whitespace-nowrap">
                      <Link href={`${PATH}/${i.code}`} className="font-medium text-acento hover:underline">{i.code}</Link>
                    </Td>
                    <Td className="max-w-md truncate">{i.title}</Td>
                    <Td>{i.processName ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{SOURCE_LABELS[i.source]}</Td>
                    <Td><NcSeverityBadge severity={i.severity} /></Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <NcStatusBadge status={i.status} reopened={i.reopened} />
                        <OverdueMark n={i.overdueActions} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          {/* Móvil */}
          <ul className="divide-y divide-borde md:hidden">
            {filtered.map((i) => (
              <li key={i.id} className="relative p-4">
                <Link href={`${PATH}/${i.code}`} className="absolute inset-0" aria-label={`Abrir ${i.code}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-small">{i.code}</span>
                  <NcStatusBadge status={i.status} reopened={i.reopened} />
                </div>
                <p className="mt-1 line-clamp-2 text-body">{i.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-texto-sec">
                  <span>{i.processName ?? "—"}</span>·<span>{SOURCE_LABELS[i.source]}</span>·<NcSeverityBadge severity={i.severity} />
                  <OverdueMark n={i.overdueActions} />
                </p>
                <p className="mt-1 text-caption text-texto-sec">Detectada {formatDate(i.detectedAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
