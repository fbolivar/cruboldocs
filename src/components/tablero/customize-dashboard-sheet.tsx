"use client"

import { ChevronDownIcon, ChevronUpIcon, SlidersHorizontalIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setDashboardLayout } from "@/lib/data/actions"
import { DASHBOARD_BLOCKS, blockLabel } from "@/lib/domain/dashboard-blocks"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { DashboardBlock } from "@/lib/types"

export function CustomizeDashboardSheet({ initial }: { initial: DashboardBlock[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [blocks, setBlocks] = useState<DashboardBlock[]>(initial)

  // Reinicia el formulario a la preferencia vigente al abrir.
  function onOpenChange(v: boolean) {
    if (v) setBlocks(initial)
    setOpen(v)
  }

  function toggle(key: string) {
    setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, visible: !b.visible } : b)))
  }
  function move(idx: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const j = idx + dir
      if (j < 0 || j >= bs.length) return bs
      const copy = bs.slice()
      ;[copy[idx], copy[j]] = [copy[j], copy[idx]]
      return copy
    })
  }
  function reset() {
    setBlocks(DASHBOARD_BLOCKS.map((b) => ({ key: b.key, visible: true })))
  }
  function save() {
    start(async () => {
      const r = await setDashboardLayout(blocks)
      if (!r.ok) { toast.error(r.error); return }
      setOpen(false)
      toast.success("Tablero actualizado."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><SlidersHorizontalIcon /> Personalizar</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="flex-row items-center justify-between border-b border-borde">
          <SheetTitle>Personalizar tablero</SheetTitle>
          <Button variant="ghost" size="sm" onClick={reset}>Restablecer</Button>
        </SheetHeader>
        <ul className="flex flex-1 flex-col divide-y divide-borde overflow-y-auto">
          {blocks.map((b, idx) => (
            <li key={b.key} className="flex items-center gap-3 p-3">
              <label className="flex flex-1 items-center gap-2 text-body text-texto">
                <input type="checkbox" checked={b.visible} onChange={() => toggle(b.key)} className="accent-acento" />
                {blockLabel(b.key)}
              </label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={`Subir ${blockLabel(b.key)}`}>
                  <ChevronUpIcon aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1} aria-label={`Bajar ${blockLabel(b.key)}`}>
                  <ChevronDownIcon aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <SheetFooter className="border-t border-borde"><Button onClick={save} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
