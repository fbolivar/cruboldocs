"use client"

import { PenLineIcon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const MEANING = "Apruebo esta acta de revisión por la dirección."

/** Cierra y firma el acta con reautenticación (patrón ADR-004). Stub; backend. */
export function CloseReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")

  function submit() {
    if (password.length < 1) {
      toast.error("Escribe tu contraseña para firmar.")
      return
    }
    // TODO(backend): reautenticar + server action closeReview (registra hash + IP).
    toast.success("Acta cerrada y firmada.")
    void reviewId
    setOpen(false)
    setPassword("")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><PenLineIcon /> Cerrar y firmar</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Cerrar y firmar el acta</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <p className="rounded-md bg-superficie-alt p-3 text-small text-texto-sec">{MEANING}</p>
          <p className="text-small text-texto-sec">Confirma tu identidad para firmar. El acta quedará cerrada e inmutable.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rev-pass">Contraseña</Label>
            <Input id="rev-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Firmar y cerrar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Cancela el acta con motivo (Líder SIG, en borrador). Stub; backend. */
export function CancelReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  function submit() {
    if (reason.trim().length < 5) {
      toast.error("Indica el motivo de la cancelación.")
      return
    }
    // TODO(backend): server action cancelReview.
    toast.success("Acta cancelada.")
    void reviewId
    setOpen(false)
    setReason("")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><XCircleIcon /> Cancelar</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Cancelar acta</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Label htmlFor="rev-cancel">Motivo</Label>
          <Textarea id="rev-cancel" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Por qué se cancela" />
        </div>
        <SheetFooter className="border-t border-borde">
          <Button variant="destructive" onClick={submit}>Cancelar acta</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
