"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setEntityNorms } from "@/lib/data/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { NormEntityType, NormOption } from "@/lib/types"

/** Multi-select de normas para etiquetar una entidad. Guarda al confirmar (controlado por el padre),
 *  o expone el set vía onChange para integrarse en un Sheet existente. */
export function NormPicker({ norms, value, onChange }: {
  norms: NormOption[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }
  if (norms.length === 0) {
    return <p className="text-caption text-texto-sec">Activa normas en Administración → Normas para poder etiquetar.</p>
  }
  return (
    <div className="flex flex-col gap-1 rounded-md border border-borde p-2">
      {norms.map((n) => (
        <label key={n.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1.5 hover:bg-superficie-alt">
          <Checkbox checked={value.includes(n.id)} onCheckedChange={() => toggle(n.id)} />
          <span className="text-body"><span className="font-mono text-texto-sec">{n.code}</span> {n.name}</span>
        </label>
      ))}
    </div>
  )
}

/** Variante autónoma: guarda el etiquetado de una entidad al confirmar. */
export function NormTagger({ entityType, entityId, norms, initial }: {
  entityType: NormEntityType
  entityId: string
  norms: NormOption[]
  initial: string[]
}) {
  const [value, setValue] = useState<string[]>(initial)
  const [pending, start] = useTransition()
  const dirty = value.slice().sort().join(",") !== initial.slice().sort().join(",")
  function save() {
    start(async () => {
      const r = await setEntityNorms(entityType, entityId, value)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Normas actualizadas.")
    })
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>Normas</Label>
      <NormPicker norms={norms} value={value} onChange={setValue} />
      {dirty && (
        <button onClick={save} disabled={pending} className="self-start text-small font-medium text-acento hover:underline disabled:opacity-50">
          Guardar normas
        </button>
      )}
    </div>
  )
}
