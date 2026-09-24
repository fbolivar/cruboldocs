"use client"

import { ChevronDownIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useUrlState } from "@/lib/use-url-state"
import type { Process, ProcessType } from "@/lib/types"
import { cn } from "@/lib/utils"

const GROUPS: { type: ProcessType; label: string }[] = [
  { type: "estrategico", label: "Estratégicos" },
  { type: "misional", label: "Misionales" },
  { type: "apoyo", label: "Apoyo" },
  { type: "evaluacion", label: "Evaluación" },
]

const STORAGE_KEY = "cruboldocs.documentos.mapa-abierto"
const DESKTOP = "(min-width: 768px)"

function readPreference(): boolean | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === null ? null : v === "1"
  } catch {
    return null
  }
}

function savePreference(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0")
  } catch {
    // Almacenamiento bloqueado: la preferencia solo dura la sesión.
  }
}

/**
 * Mapa de procesos estático agrupado por tipo. Cada chip filtra la tabla por su proceso.
 * Abierto por defecto en escritorio y colapsado en móvil; la preferencia se recuerda.
 * `open === null` = sin preferencia aún: el CSS decide por tamaño de pantalla (sin salto al hidratar).
 */
export function ProcessMap({ processes }: { processes: Process[] }) {
  const { params, set } = useUrlState()
  const active = params.get("proceso")
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    const pref = readPreference()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el cliente
    if (pref !== null) setOpen(pref)
  }, [])

  const toggle = () => {
    const current = open ?? window.matchMedia(DESKTOP).matches
    setOpen(!current)
    savePreference(!current)
  }

  const label =
    open === null ? (
      <>
        <span className="md:hidden">Mostrar</span>
        <span className="hidden md:inline">Ocultar</span>
      </>
    ) : open ? (
      "Ocultar"
    ) : (
      "Mostrar"
    )

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-h3">Mapa de procesos</h2>
        <Button variant="ghost" size="sm" onClick={toggle} aria-expanded={open ?? undefined} aria-controls="mapa-procesos">
          {label}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "transition-transform duration-150 motion-reduce:transition-none",
              open === null ? "md:rotate-180" : open && "rotate-180"
            )}
          />
        </Button>
      </div>
      <div
        id="mapa-procesos"
        className={cn("mt-4 flex-col gap-3", open === null ? "hidden md:flex" : open ? "flex" : "hidden")}
      >
        {GROUPS.map((g) => {
          const items = processes.filter((p) => p.type === g.type)
          if (items.length === 0) return null
          return (
            <div key={g.type} className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <span className="text-caption text-texto-sec uppercase md:w-30 md:shrink-0">{g.label}</span>
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
                {items.map((p) => (
                  <li key={p.id} className="shrink-0">
                    <ProcessChip
                      process={p}
                      active={active === p.id}
                      onClick={() => set({ proceso: active === p.id ? null : p.id })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ProcessChip({ process, active, onClick }: { process: Process; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-sm border px-3 text-label whitespace-nowrap transition-colors duration-150 md:h-8",
        active ? "border-acento bg-acento-suave text-acento" : "border-borde bg-superficie text-texto hover:bg-superficie-alt"
      )}
    >
      {process.name}
      <span className={cn("font-normal", active ? "text-acento" : "text-texto-sec")}>
        {process.documentCount}
        <span className="sr-only"> documentos</span>
      </span>
    </button>
  )
}
