"use client"

import { MicroscopeIcon, SearchXIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { DispositionBadge, InspectionTypeChip } from "@/components/inspecciones/badges"
import { DISPOSITION_LABELS, INSPECTION_TYPE_LABELS } from "@/components/inspecciones/labels"
import { InspectionPlanManager } from "@/components/inspecciones/plan-manager"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from "@/lib/format"
import type { InspectionDisposition, InspectionListItem, InspectionPlanView, InspectionType } from "@/lib/types"

type Option = { id: string; name: string }
const PATH = "/app/inspecciones"
const TYPES = Object.keys(INSPECTION_TYPE_LABELS) as InspectionType[]
const DISPS = Object.keys(DISPOSITION_LABELS) as InspectionDisposition[]

function InspectionList({ items }: { items: InspectionListItem[] }) {
  const [tipo, setTipo] = useState<"todos" | InspectionType>("todos")
  const [disp, setDisp] = useState<"todas" | InspectionDisposition>("todas")
  const [plan, setPlan] = useState("todos")
  const [q, setQ] = useState("")

  const planes = useMemo(() => [...new Set(items.map((i) => i.planName).filter(Boolean))].sort(), [items])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (tipo !== "todos" && i.type !== tipo) return false
      if (disp !== "todas" && i.disposition !== disp) return false
      if (plan !== "todos" && i.planName !== plan) return false
      if (q.trim() && !`${i.code} ${i.planName} ${i.supplierName ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
  }, [items, tipo, disp, plan, q])

  const hasFilters = tipo !== "todos" || disp !== "todas" || plan !== "todos" || q.trim() !== ""
  const clear = () => { setTipo("todos"); setDisp("todas"); setPlan("todos"); setQ("") }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="md:w-44" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo tipo</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{INSPECTION_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disp} onValueChange={(v) => setDisp(v as typeof disp)}>
          <SelectTrigger className="md:w-44" aria-label="Disposición"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda disposición</SelectItem>
            {DISPS.map((d) => <SelectItem key={d} value={d}>{DISPOSITION_LABELS[d]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="md:w-48" aria-label="Plan"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo plan</SelectItem>
            {planes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-56" aria-label="Buscar inspección" />
        {hasFilters && <button onClick={clear} className="self-start text-small font-medium text-acento hover:underline md:self-auto">Limpiar filtros</button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters
            ? <EmptyState icon={SearchXIcon} title="Ninguna inspección coincide con los filtros." action={<button onClick={clear} className="text-small font-medium text-acento hover:underline">Limpiar filtros</button>} />
            : <EmptyState icon={MicroscopeIcon} title="Aún no hay inspecciones." description="Registra la primera con «Nueva inspección»." />}
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
                    <p className="mt-0.5 text-body">{i.planName}</p>
                  </div>
                  <DispositionBadge disposition={i.disposition} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-texto-sec">
                  <InspectionTypeChip type={i.type} />
                  {i.supplierName && <span>· {i.supplierName}</span>}
                  {i.processName && <span>· {i.processName}</span>}
                  <span>· {formatDate(i.inspectedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export function InspectionsBoard({
  items, plans, processes, canManage,
}: {
  items: InspectionListItem[]
  plans: InspectionPlanView[]
  processes: Option[]
  canManage: boolean
}) {
  return (
    <Tabs defaultValue="inspecciones" className="w-full">
      <TabsList>
        <TabsTrigger value="inspecciones">Inspecciones</TabsTrigger>
        {canManage && <TabsTrigger value="planes">Planes</TabsTrigger>}
      </TabsList>
      <TabsContent value="inspecciones" className="mt-4">
        <InspectionList items={items} />
      </TabsContent>
      {canManage && (
        <TabsContent value="planes" className="mt-4">
          <InspectionPlanManager plans={plans} processes={processes} canManage={canManage} />
        </TabsContent>
      )}
    </Tabs>
  )
}
