"use client"

import { ChartLineIcon, SearchIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { ComplianceBadge } from "@/components/indicadores/badges"
import { COMPLIANCE_LABELS, FREQUENCY_LABELS, formatPeriod, formatTarget, formatValue } from "@/components/indicadores/labels"
import { Sparkline } from "@/components/indicadores/sparkline"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import type { ComplianceStatus, IndicatorFrequency, IndicatorListItem } from "@/lib/types"

const PATH = "/app/indicadores"
type EstadoFiltro = "todos" | ComplianceStatus | "sin_medicion"

/** Lista con filtros del lado del cliente. El backend moverá el filtro al servidor. */
export function IndicatorBoard({ items }: { items: IndicatorListItem[] }) {
  const [q, setQ] = useState("")
  const [proceso, setProceso] = useState("todos")
  const [estado, setEstado] = useState<EstadoFiltro>("todos")
  const [frecuencia, setFrecuencia] = useState<"todas" | IndicatorFrequency>("todas")
  const [verArchivados, setVerArchivados] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter((i) => {
      if (!verArchivados && i.status === "archivado") return false
      if (term && !i.code.toLowerCase().includes(term) && !i.name.toLowerCase().includes(term)) return false
      if (proceso !== "todos" && i.processName !== proceso) return false
      if (estado === "sin_medicion" && i.lastCompliance !== null) return false
      if (estado !== "todos" && estado !== "sin_medicion" && i.lastCompliance !== estado) return false
      if (frecuencia !== "todas" && i.frequency !== frecuencia) return false
      return true
    })
  }, [items, q, proceso, estado, frecuencia, verArchivados])

  const hasFilters = q !== "" || proceso !== "todos" || estado !== "todos" || frecuencia !== "todas"

  function clear() {
    setQ(""); setProceso("todos"); setEstado("todos"); setFrecuencia("todas")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-60">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o nombre" className="ps-9" aria-label="Buscar" />
        </div>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-36" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los procesos</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={(v) => setEstado(v as EstadoFiltro)}>
          <SelectTrigger className="md:w-40" aria-label="Estado de cumplimiento"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            <SelectItem value="cumple">{COMPLIANCE_LABELS.cumple}</SelectItem>
            <SelectItem value="en_riesgo">{COMPLIANCE_LABELS.en_riesgo}</SelectItem>
            <SelectItem value="no_cumple">{COMPLIANCE_LABELS.no_cumple}</SelectItem>
            <SelectItem value="sin_medicion">Sin medición</SelectItem>
          </SelectContent>
        </Select>
        <Select value={frecuencia} onValueChange={(v) => setFrecuencia(v as typeof frecuencia)}>
          <SelectTrigger className="md:w-36" aria-label="Frecuencia"><SelectValue placeholder="Frecuencia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda frecuencia</SelectItem>
            {(Object.keys(FREQUENCY_LABELS) as IndicatorFrequency[]).map((f) => (
              <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-small text-texto-sec md:ml-auto">
          <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} className="size-4 accent-acento" />
          Ver archivados
        </label>
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ningún indicador coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={ChartLineIcon} title="Aún no hay indicadores." description="Define el primer KPI de un proceso con «Nuevo indicador»." />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Escritorio */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <Tr><Th>Código</Th><Th>Indicador</Th><Th>Proceso</Th><Th>Meta</Th><Th>Último</Th><Th>Tendencia</Th><Th>Estado</Th></Tr>
              </THead>
              <tbody>
                {filtered.map((i) => (
                  <Tr key={i.id} className="hover:bg-superficie-alt">
                    <Td className="font-mono whitespace-nowrap">
                      <Link href={`${PATH}/${i.code}`} className="font-medium text-acento hover:underline">{i.code}</Link>
                    </Td>
                    <Td className="max-w-xs truncate">{i.name}{i.status === "archivado" && <span className="ml-2 text-caption text-texto-sec">(archivado)</span>}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{i.processName ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-texto-sec">{formatTarget(i.direction, i.target, i.targetMax, i.unit)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {i.lastValue === null ? "—" : formatValue(i.lastValue, i.unit)}
                      {i.lastPeriod && <span className="ml-1 text-caption text-texto-sec">{formatPeriod(i.lastPeriod)}</span>}
                    </Td>
                    <Td><Sparkline points={i.trend} unit={i.unit} /></Td>
                    <Td><ComplianceBadge status={i.lastCompliance} /></Td>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-caption text-texto-sec">{i.code}</p>
                    <p className="mt-0.5 line-clamp-2 text-body">{i.name}</p>
                  </div>
                  <ComplianceBadge status={i.lastCompliance} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-caption text-texto-sec">
                    {i.processName ?? "—"} · meta {formatTarget(i.direction, i.target, i.targetMax, i.unit)} · último{" "}
                    {i.lastValue === null ? "—" : formatValue(i.lastValue, i.unit)}
                  </p>
                  <Sparkline points={i.trend} unit={i.unit} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
