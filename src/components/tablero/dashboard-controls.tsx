"use client"

import { PrinterIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DashboardProcessRef } from "@/lib/types"

/** Filtros (proceso, periodo) + imprimir. Escriben en la URL → la página re-consulta en servidor. */
export function DashboardControls({ processes, processId, year }: {
  processes: DashboardProcessRef[]
  processId: string | null
  year: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const now = new Date().getFullYear()
  const years = [now, now - 1, now - 2, now - 3]

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Select value={processId ?? "todos"} onValueChange={(v) => setParam("proceso", v === "todos" ? null : v)}>
        <SelectTrigger className="md:w-52" aria-label="Proceso"><SelectValue placeholder="Proceso" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los procesos</SelectItem>
          {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => setParam("anio", v === String(now) ? null : v)}>
        <SelectTrigger className="md:w-32" aria-label="Periodo"><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => window.print()}><PrinterIcon /> Imprimir / PDF</Button>
    </div>
  )
}
