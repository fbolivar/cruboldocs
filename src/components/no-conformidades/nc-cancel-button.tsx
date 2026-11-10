"use client"

import { XCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { cancelNc } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

/** Anular la no conformidad (gestor), con motivo. */
export function NcCancelButton({ ncId }: { ncId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  function submit() {
    if (reason.trim().length < 5) {
      toast.error("Indica el motivo de la anulación.")
      return
    }
    start(async () => {
      const r = await cancelNc(ncId, reason)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success("No conformidad anulada.")
      setOpen(false)
      setReason("")
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircleIcon /> Anular
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Anular no conformidad</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Label htmlFor="nc-cancel-reason">Motivo</Label>
          <Textarea
            id="nc-cancel-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por qué no procede (p. ej. duplicada, fuera de alcance)"
          />
        </div>
        <SheetFooter className="border-t border-borde">
          <Button variant="destructive" onClick={submit} loading={pending}>Anular</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
