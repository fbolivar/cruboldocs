"use client"

import { SearchXIcon, TargetIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { ObjectiveStatusBadge, PerspectiveChip } from "@/components/objetivos/badges"
import { OBJECTIVE_STATUS_LABELS, PERSPECTIVE_LABELS, PERSPECTIVE_ORDER } from "@/components/objetivos/labels"
import { ObjectiveProgress } from "@/components/objetivos/objective-progress"
import { EditObjectiveSheet } from "@/components/objetivos/objective-sheet"
import { NormCell } from "@/components/multinorma/norm-cell"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NormOption, ObjectiveCardView, ObjectiveIndicatorRef, ObjectiveStatus, Perspective } from "@/lib/types"

type Option = { id: string; name: string }
const STATUSES = Object.keys(OBJECTIVE_STATUS_LABELS) as ObjectiveStatus[]

export function ObjectivesBoard({ items, indicators, processes, allNorms = [], normsByEntity, canTag = false }: {
  items: ObjectiveCardView[]
  indicators: ObjectiveIndicatorRef[]
  processes: Option[]
  allNorms?: NormOption[]
  normsByEntity?: Map<string, NormOption[]>
  canTag?: boolean
}) {
  const [persp, setPersp] = useState<"todas" | Perspective>("todas")
  const [estado, setEstado] = useState<"todos" | ObjectiveStatus>("todos")
  const [proceso, setProceso] = useState("todos")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<ObjectiveCardView | null>(null)
  const [open, setOpen] = useState(false)

  const procesos = useMemo(() => [...new Set(items.map((i) => i.processName).filter((x): x is string => !!x))].sort(), [items])

  const filtered = useMemo(() => items.filter((i) => {
    if (persp !== "todas" && i.perspective !== persp) return false
    if (estado !== "todos" && i.status !== estado) return false
    if (proceso !== "todos" && i.processName !== proceso) return false
    if (q.trim() && !`${i.code} ${i.description}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }), [items, persp, estado, proceso, q])

  const hasFilters = persp !== "todas" || estado !== "todos" || proceso !== "todos" || q.trim() !== ""
  const clear = () => { setPersp("todas"); setEstado("todos"); setProceso("todos"); setQ("") }
  const visiblePerspectives = persp === "todas" ? PERSPECTIVE_ORDER : [persp]

  function openEdit(o: ObjectiveCardView) { setEditing(o); setOpen(true) }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={persp} onValueChange={(v) => setPersp(v as typeof persp)}>
          <SelectTrigger className="md:w-52" aria-label="Perspectiva"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda perspectiva</SelectItem>
            {PERSPECTIVE_ORDER.map((p) => <SelectItem key={p} value={p}>{PERSPECTIVE_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <SelectTrigger className="md:w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estado</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{OBJECTIVE_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proceso} onValueChange={setProceso}>
          <SelectTrigger className="md:w-44" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo proceso</SelectItem>
            {procesos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-52" aria-label="Buscar objetivos" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon={TargetIcon} title="Aún no hay objetivos de calidad." description="Define el primero con «Nuevo objetivo»." /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={SearchXIcon} title="Ningún objetivo coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visiblePerspectives.map((p) => {
            const group = filtered.filter((i) => i.perspective === p)
            return (
              <section key={p} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <PerspectiveChip perspective={p} />
                  <span className="text-caption text-texto-sec">{group.length}</span>
                </div>
                {group.length === 0 ? (
                  <Card className="p-4"><p className="text-small text-texto-sec">Sin objetivos en esta perspectiva.</p></Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {group.map((o) => (
                      <Card key={o.id} className="p-4">
                        <button
                          type="button"
                          onClick={() => o.canManage && openEdit(o)}
                          disabled={!o.canManage}
                          className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
                          aria-label={o.canManage ? `Editar ${o.code}` : o.code}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-mono text-caption text-texto-sec">{o.code}</p>
                            <ObjectiveStatusBadge status={o.status} />
                          </div>
                          <p className="text-body">{o.description}</p>
                          <p className="text-caption text-texto-sec">
                            {o.targetText ? `Meta: ${o.targetText}` : "Sin meta definida"}
                            {o.horizonYear ? ` · ${o.horizonYear}` : ""}
                            {` · ${o.indicatorCount} ${o.indicatorCount === 1 ? "indicador" : "indicadores"}`}
                          </p>
                          <ObjectiveProgress pct={o.progressPct} />
                        </button>
                        {allNorms.length > 0 && (
                          <div className="mt-2 border-t border-borde pt-2">
                            <NormCell entityType="objetivo" entityId={o.id} allNorms={allNorms} tagged={normsByEntity?.get(o.id) ?? []} canManage={canTag} />
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <EditObjectiveSheet objective={editing} indicators={indicators} processes={processes} open={open} onOpenChange={setOpen} />
    </div>
  )
}
