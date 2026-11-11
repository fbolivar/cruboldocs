"use client"

import { SaveIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function SaveReportSheet({
  initialName, initialScope, canShare, pending, onSave,
}: {
  initialName: string
  initialScope: "privada" | "compartida"
  canShare: boolean
  pending: boolean
  onSave: (name: string, scope: "privada" | "compartida") => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [scope, setScope] = useState<"privada" | "compartida">(initialScope)

  const select = "h-11 w-full rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><SaveIcon /> Guardar</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Guardar informe</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-name">Nombre</Label>
            <Input id="rp-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="NC por proceso 2026" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-scope">Ámbito</Label>
            <select id="rp-scope" value={scope} onChange={(e) => setScope(e.target.value as "privada" | "compartida")} className={select} disabled={!canShare}>
              <option value="privada">Privada (solo yo)</option>
              <option value="compartida">Compartida (toda la organización)</option>
            </select>
            {!canShare && <p className="text-caption text-texto-sec">Solo el Líder SIG puede compartir informes.</p>}
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button loading={pending} disabled={name.trim().length < 2} onClick={() => onSave(name.trim(), scope)}>Guardar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
