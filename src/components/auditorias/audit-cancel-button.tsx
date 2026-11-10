"use client"

import { XCircleIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

/** Cancela la auditoría con motivo (Líder SIG). Stub; se conecta en backend. */
export function AuditCancelButton({ auditId }: { auditId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  function submit() {
    if (reason.trim().length < 5) {
      toast.error("Indica el motivo de la cancelación.")
      return
    }
    // TODO(backend): server action cancelAudit.
    toast.success("Auditoría cancelada.")
    void auditId
    setOpen(false)
    setReason("")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircleIcon /> Cancelar
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Cancelar auditoría</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Label htmlFor="aud-cancel-reason">Motivo</Label>
          <Textarea id="aud-cancel-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Por qué se cancela" />
        </div>
        <SheetFooter className="border-t border-borde">
          <Button variant="destructive" onClick={submit}>Cancelar auditoría</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
