"use client"

import { TagIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { NormChips } from "@/components/multinorma/norm-chip"
import { NormPicker } from "@/components/multinorma/norm-picker"
import { setEntityNorms } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { NormEntityType, NormOption } from "@/lib/types"

/** Chips de las normas etiquetadas + botón para editarlas (si gestiona). Reutilizable en listas y fichas. */
export function NormCell({ entityType, entityId, allNorms, tagged, canManage }: {
  entityType: NormEntityType
  entityId: string
  allNorms: NormOption[]
  tagged: NormOption[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string[]>(tagged.map((t) => t.id))

  function save() {
    start(async () => {
      const r = await setEntityNorms(entityType, entityId, value)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Normas actualizadas."); setOpen(false); router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <NormChips norms={tagged} />
      {tagged.length === 0 && <span className="text-caption text-texto-sec">—</span>}
      {canManage && allNorms.length > 0 && (
        <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) setValue(tagged.map((t) => t.id)) }}>
          <SheetTrigger asChild>
            <button className="inline-flex items-center gap-1 text-caption font-medium text-acento hover:underline" aria-label="Etiquetar por norma">
              <TagIcon className="size-3.5" /> Normas
            </button>
          </SheetTrigger>
          <SheetContent size="sm" className="gap-0 p-0">
            <SheetHeader className="border-b border-borde"><SheetTitle>Etiquetar por norma</SheetTitle></SheetHeader>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <NormPicker norms={allNorms} value={value} onChange={setValue} />
            </div>
            <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending}>Guardar normas</Button></SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </span>
  )
}
