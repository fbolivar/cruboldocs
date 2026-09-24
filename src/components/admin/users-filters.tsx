"use client"

import { SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { MEMBER_STATUS_META } from "@/components/admin/labels"
import { OptionSelect } from "@/components/admin/option-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUrlState } from "@/lib/use-url-state"
import type { MembershipStatus } from "@/lib/types"

const ALL = "todos"
const STATUS_OPTIONS = [
  { value: ALL, label: "Todos los estados" },
  ...(Object.keys(MEMBER_STATUS_META) as MembershipStatus[]).map((s) => ({ value: s, label: MEMBER_STATUS_META[s].label })),
]

/** Filtros de Usuarios sincronizados con la URL: texto (con espera), estado y solo externos. */
export function UsersFilters() {
  const { params, set } = useUrlState()
  const urlQ = params.get("q") ?? ""
  const [q, setQ] = useState(urlQ)
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ)
  // "Limpiar filtros" borra `q` de la URL: el campo se vacía también.
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ)
    if (urlQ === "") setQ("")
  }

  useEffect(() => {
    if (q === urlQ) return
    const t = setTimeout(() => set({ q }), 300)
    return () => clearTimeout(t)
  }, [q, urlQ, set])

  return (
    <>
      <div className="relative w-full md:w-80">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
        <Input type="search" aria-label="Buscar por nombre o correo" placeholder="Nombre o correo" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <OptionSelect
        aria-label="Estado"
        className="flex-1 md:w-48 md:flex-none"
        options={STATUS_OPTIONS}
        value={params.get("estado") ?? ALL}
        onChange={(v) => set({ estado: v === ALL ? null : v })}
      />
      <div className="flex min-h-11 items-center gap-2 md:min-h-9">
        <Checkbox id="solo-externos" checked={params.get("externos") === "1"} onCheckedChange={(v) => set({ externos: v === true ? "1" : null })} />
        <Label htmlFor="solo-externos" className="text-body">
          Solo externos
        </Label>
      </div>
    </>
  )
}

export function ClearFiltersButton({ keys }: { keys: string[] }) {
  const { set, pending } = useUrlState()
  return (
    <Button variant="outline" loading={pending} onClick={() => set(Object.fromEntries(keys.map((k) => [k, null])))}>
      Limpiar filtros
    </Button>
  )
}
