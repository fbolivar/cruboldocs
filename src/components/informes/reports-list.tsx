import { BarChart3Icon } from "lucide-react"
import Link from "next/link"

import { DATASETS, type DatasetKey } from "@/lib/bi/datasets"
import { Badge, Chip } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import type { SavedReportView } from "@/lib/types"

function datasetLabel(k: string) {
  return (DATASETS as Record<string, { label: string }>)[k as DatasetKey]?.label ?? k
}

function ReportGroup({ title, items }: { title: string; items: SavedReportView[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-small font-medium text-texto-sec">{title}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.id}>
            <Link href={`/app/informes/${r.id}`} className="flex flex-col gap-2 rounded-lg border border-borde bg-superficie p-4 hover:bg-superficie-alt">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-body font-medium text-texto">{r.name}</span>
                <Badge tone={r.scope === "compartida" ? "info" : "neutro"}>{r.scope === "compartida" ? "Compartida" : "Privada"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Chip>{datasetLabel(r.dataset)}</Chip>
                {r.config.chart && <span className="inline-flex items-center gap-1 text-caption text-texto-sec"><BarChart3Icon className="size-3.5" /> {r.config.chart}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReportsList({ reports }: { reports: SavedReportView[] }) {
  if (reports.length === 0) {
    return <EmptyState icon={BarChart3Icon} title="Aún no tienes informes" description="Crea el primero con el constructor." />
  }
  return (
    <div className="flex flex-col gap-6">
      <ReportGroup title="Compartidos" items={reports.filter((r) => r.scope === "compartida")} />
      <ReportGroup title="Míos" items={reports.filter((r) => r.scope === "privada")} />
    </div>
  )
}
