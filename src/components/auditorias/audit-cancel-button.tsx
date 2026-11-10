"use client"

import { XCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { cancelAudit } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

/** Cancela la auditoría con motivo (Líder SIG). */
export function AuditCancelButton({ auditId }: { auditId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  function submit() {
    if (reason.trim().length < 5) {
      toast.error("Indica el motivo de la cancelación.")
      return
    }
    start(async () => {
      const r = await cancelAudit(auditId, reason)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("Auditoría cancelada.")
      setOpen(false)
      setReason("")
      router.refresh()
    })
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
          <Button variant="destructive" onClick={submit} loading={pending}>Cancelar auditoría</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
