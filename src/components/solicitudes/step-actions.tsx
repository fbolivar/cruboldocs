"use client"

import { CheckIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { cancelApprovalRequest, decideApprovalStep } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

function DecideSheet({ requestId, approve }: { requestId: string; approve: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState("")

  function submit() {
    if (!approve && comment.trim().length < 1) { toast.error("Indica el motivo del rechazo."); return }
    start(async () => {
      const r = await decideApprovalStep({ requestId, approve, comment: comment.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success(approve ? "Paso aprobado." : "Solicitud rechazada.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={approve ? "default" : "outline"}>
          {approve ? <CheckIcon /> : <XIcon />} {approve ? "Aprobar" : "Rechazar"}
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{approve ? "Aprobar paso" : "Rechazar solicitud"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dc-comment">Comentario{approve ? " (opcional)" : ""}</Label>
            <Textarea id="dc-comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          {!approve && <p className="text-caption text-texto-sec">Rechazar cierra la solicitud.</p>}
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit} loading={pending} variant={approve ? "default" : "destructive"}>
            {approve ? "Confirmar aprobación" : "Confirmar rechazo"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function StepActions({ requestId, canDecide, canCancel }: { requestId: string; canDecide: boolean; canCancel: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function cancel() {
    start(async () => {
      const r = await cancelApprovalRequest(requestId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Solicitud anulada.")
      router.refresh()
    })
  }

  if (!canDecide && !canCancel) return null
  return (
    <div className="flex flex-wrap gap-2">
      {canDecide && <DecideSheet requestId={requestId} approve />}
      {canDecide && <DecideSheet requestId={requestId} approve={false} />}
      {canCancel && <Button variant="ghost" loading={pending} onClick={cancel}>Anular</Button>}
    </div>
  )
}
