"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { RecertDecision, type Decision } from "@/components/admin/recert-decision"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { saveRecertDecisions } from "@/lib/data/actions"
import { formatDate } from "@/lib/format"
import type { RecertificationItem } from "@/lib/types"

/** Lista de membresías a recertificar con decisión por fila y guardado en lote. */
export function RecertList({ items }: { items: RecertificationItem[] }) {
  const router = useRouter()
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [pending, startTransition] = useTransition()
  const entries = Object.entries(decisions)
  const n = entries.length

  function save() {
    startTransition(async () => {
      const res = await saveRecertDecisions(entries.map(([membershipId, d]) => ({ membershipId, keep: d === "mantener" })))
      if (!res.ok) return void toast.error(res.error)
      toast.success(`Decisiones de recertificación guardadas (${res.data.count})`)
      setDecisions({})
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-borde">
          {items.map((it) => (
            <li key={it.membershipId} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-6 md:py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{it.fullName}</span>
                  {it.overdue && <Badge tone="error">Vencida</Badge>}
                  {it.isExternal && <Badge tone="neutro" plain>Externo</Badge>}
                </div>
                <span className="truncate text-small text-texto-sec">
                  {it.positionName} · {it.email}
                </span>
                <span className="text-small text-texto-sec">
                  {it.lastRecertifiedAt ? `Última recertificación: ${formatDate(it.lastRecertifiedAt)}` : "Nunca recertificado"} · Fecha límite: {formatDate(it.dueDate)}
                </span>
              </div>
              <RecertDecision
                id={it.membershipId}
                name={it.fullName}
                value={decisions[it.membershipId]}
                disabled={pending}
                onChange={(d) => setDecisions((prev) => ({ ...prev, [it.membershipId]: d }))}
              />
            </li>
          ))}
        </ul>
      </Card>
      <div className="sticky bottom-20 flex flex-col gap-3 rounded-md border border-borde bg-superficie p-4 shadow-md md:static md:flex-row md:items-center md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <p className="text-small text-texto-sec" aria-live="polite">
          {n === 0 ? "Elige Mantener o Revocar en cada persona." : `${n} de ${items.length} decididas`}
        </p>
        <div className="flex gap-3">
          {n > 0 && (
            <Button variant="outline" disabled={pending} onClick={() => setDecisions({})}>
              Limpiar
            </Button>
          )}
          <Button className="flex-1 md:flex-none" disabled={n === 0} loading={pending} onClick={save}>
            Guardar decisiones ({n})
          </Button>
        </div>
      </div>
    </div>
  )
}
