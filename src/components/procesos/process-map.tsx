"use client"

import { DownloadIcon, NetworkIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { PROCESS_TYPE_LABELS, PROCESS_TYPE_ORDER } from "@/components/procesos/labels"
import { exportProcessesCsv } from "@/lib/data/actions"
import { downloadCsv } from "@/lib/csv"
import { todayIsoDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import type { ProcessMapItem, ProcessMapSummary } from "@/lib/types"

const PATH = "/app/procesos"

function CharacterizedBadge({ on }: { on: boolean }) {
  return on ? <Badge tone="exito">Caracterizado</Badge> : <Badge tone="neutro">Sin caracterizar</Badge>
}

export function ProcessMap({ summary, items }: { summary: ProcessMapSummary; items: ProcessMapItem[] }) {
  const [q, setQ] = useState("")
  const [exporting, startExport] = useTransition()
  const filtered = useMemo(() => items.filter((i) =>
    !q.trim() || `${i.code} ${i.name}`.toLowerCase().includes(q.trim().toLowerCase()),
  ), [items, q])

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={NetworkIcon} title="Aún no hay procesos."
          description="Crea los procesos en Administración; aquí podrás caracterizarlos." />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[["Procesos", summary.total], ["Caracterizados", summary.characterized], ["Sin caracterizar", summary.uncharacterized]].map(([label, n]) => (
          <Card key={label} className="p-4">
            <p className="text-caption text-texto-sec">{label}</p>
            <p className="mt-1 font-display text-h2 tabular-nums text-texto">{n}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proceso…" className="md:w-72" aria-label="Buscar proceso" />
        <Button variant="outline" size="sm" loading={exporting} className="md:ml-auto" onClick={() => startExport(async () => {
          try { downloadCsv(`procesos-${todayIsoDate()}.csv`, await exportProcessesCsv()) }
          catch { toast.error("No pudimos exportar el CSV.") }
        })}><DownloadIcon /> Exportar CSV</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={NetworkIcon} title="Ningún proceso coincide." /></Card>
      ) : (
        <div className="flex flex-col gap-5">
          {PROCESS_TYPE_ORDER.map((type) => {
            const group = filtered.filter((i) => i.type === type)
            if (group.length === 0) return null
            return (
              <section key={type} className="flex flex-col gap-2">
                <h2 className="text-caption font-medium uppercase tracking-wide text-texto-sec">{PROCESS_TYPE_LABELS[type]}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((p) => (
                    <Link key={p.id} href={`${PATH}/${p.code}`}
                      className="flex flex-col gap-2 rounded-md border border-borde p-4 hover:bg-superficie-alt">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-caption text-texto-sec">{p.code}</p>
                          <p className="text-body text-texto">{p.name}</p>
                        </div>
                        <CharacterizedBadge on={p.characterized} />
                      </div>
                      <p className="text-caption text-texto-sec">Líder: {p.leaderName ?? "—"}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
