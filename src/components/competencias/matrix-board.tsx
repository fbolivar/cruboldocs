"use client"

import { GraduationCapIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { CompetencyStatusBadge } from "@/components/competencias/badges"
import { COMPETENCY_STATUS_LABELS, levelFraction } from "@/components/competencias/labels"
import { CompetencyStatusCell } from "@/components/competencias/status-cell"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CompetencyMatrix, CompetencyStatus, MatrixRow } from "@/lib/types"

const PATH = "/app/competencias/personas"
const STATUSES = Object.keys(COMPETENCY_STATUS_LABELS) as CompetencyStatus[]

function groupByProcess(rows: MatrixRow[]): [string, MatrixRow[]][] {
  const map = new Map<string, MatrixRow[]>()
  for (const r of rows) {
    const key = r.processName ?? "Sin proceso"
    map.set(key, [...(map.get(key) ?? []), r])
  }
  return [...map.entries()]
}

export function CompetencyMatrixBoard({ matrix }: { matrix: CompetencyMatrix }) {
  const [proceso, setProceso] = useState("todos")
  const [cargo, setCargo] = useState("todos")
  const [estado, setEstado] = useState<"todos" | CompetencyStatus>("todos")
  const [q, setQ] = useState("")

  const procesos = useMemo(() => [...new Set(matrix.rows.map((r) => r.processName ?? "Sin proceso"))].sort(), [matrix.rows])
  const cargos = useMemo(() => [...new Set(matrix.rows.map((r) => r.positionName))].sort(), [matrix.rows])

  const filtered = useMemo(
    () =>
      matrix.rows.filter((r) => {
        if (proceso !== "todos" && (r.processName ?? "Sin proceso") !== proceso) return false
        if (cargo !== "todos" && r.positionName !== cargo) return false
        if (estado !== "todos" && !r.cells.some((c) => c.status === estado)) return false
        if (q.trim() && !r.personName.toLowerCase().includes(q.trim().toLowerCase())) return false
        return true
      }),
    [matrix.rows, proceso, cargo, estado, q],
  )

  const hasFilters = proceso !== "todos" || cargo !== "todos" || estado !== "todos" || q.trim() !== ""
  function clear() {
    setProceso("todos"); setCargo("todos"); setEstado("todos"); setQ("")
  }

  const groups = groupByProcess(filtered)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-52" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cargo} onValueChange={setCargo}>
          <SelectTrigger className="md:w-52" aria-label="Cargo"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo cargo</SelectItem>
            {cargos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-44" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{COMPETENCY_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…" className="md:w-56" aria-label="Buscar persona" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Nadie coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
          ) : (
            <EmptyState icon={GraduationCapIcon} title="Aún no hay competencias evaluadas." description="Define el catálogo y el perfil de los cargos para ver la matriz." />
          )}
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla agrupada por proceso */}
          <div className="hidden md:flex md:flex-col md:gap-4">
            {groups.map(([proc, rows]) => (
              <Card key={proc} className="overflow-hidden">
                <p className="border-b border-borde bg-superficie-alt px-4 py-2 text-caption font-medium text-texto-sec">{proc}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-body">
                    <thead>
                      <tr className="border-b border-borde text-caption text-texto-sec">
                        <th scope="col" className="px-4 py-2 font-medium">Persona / Cargo</th>
                        {matrix.columns.map((c) => (
                          <th key={c.competencyId} scope="col" className="px-3 py-2 font-medium" title={c.competencyName}>
                            <span className="line-clamp-2">{c.competencyName}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.membershipId} className="relative border-b border-borde last:border-0 hover:bg-superficie-alt">
                          <th scope="row" className="px-4 py-3 font-normal">
                            <Link href={`${PATH}/${r.membershipId}`} className="absolute inset-0" aria-label={`Abrir ${r.personName}`} />
                            <span className="block text-body">{r.personName}</span>
                            <span className="block text-caption text-texto-sec">{r.positionName}</span>
                          </th>
                          {matrix.columns.map((col) => {
                            const cell = r.cells.find((c) => c.competencyId === col.competencyId) ?? null
                            return <td key={col.competencyId} className="px-3 py-3">{<CompetencyStatusCell cell={cell} />}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>

          {/* Móvil: lista por persona */}
          <div className="flex flex-col gap-4 md:hidden">
            {groups.map(([proc, rows]) => (
              <div key={proc} className="flex flex-col gap-2">
                <p className="text-caption font-medium text-texto-sec">{proc}</p>
                {rows.map((r) => (
                  <Card key={r.membershipId} className="relative p-4">
                    <Link href={`${PATH}/${r.membershipId}`} className="absolute inset-0" aria-label={`Abrir ${r.personName}`} />
                    <p className="text-body">{r.personName}</p>
                    <p className="text-caption text-texto-sec">{r.positionName}</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {r.cells.map((c) => {
                        const col = matrix.columns.find((x) => x.competencyId === c.competencyId)
                        return (
                          <li key={c.competencyId} className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-small">{col?.competencyName}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="text-caption text-texto-sec tabular-nums">{levelFraction(c.assessedLevel, c.requiredLevel)}</span>
                              <CompetencyStatusBadge status={c.status} />
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
