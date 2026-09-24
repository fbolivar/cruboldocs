"use client"

import { CircleAlertIcon } from "lucide-react"
import { type FormEvent, useId, useState } from "react"

import { FichaDialogContent, FichaDialogFooter } from "@/components/ficha/ficha-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import type { Result } from "@/lib/types"

export interface ReasonDialogConfig {
  title: string
  description: string
  label: string
  confirmLabel: string
  destructive?: boolean
}

interface ReasonDialogProps extends ReasonDialogConfig {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => Promise<Result<unknown>>
  onDone: (reason: string) => void
}

const MIN = 10

/** Motivo obligatorio para rechazar, devolver, solicitar actualización o rechazar una solicitud. */
export function ReasonDialog({ open, onOpenChange, onSubmit, onDone, ...c }: ReasonDialogProps) {
  const id = useId()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function change(next: boolean) {
    if (!next) {
      setReason("")
      setError(null)
      setServerError(null)
    }
    onOpenChange(next)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = reason.trim()
    if (text.length < MIN) {
      setError(`Explica el motivo en al menos ${MIN} caracteres.`)
      return
    }
    setError(null)
    setPending(true)
    const res = await onSubmit(text)
    setPending(false)
    if (!res.ok) {
      setServerError(res.error)
      return
    }
    onDone(text)
    change(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <FichaDialogContent title={c.title} description={c.description}>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
          {serverError && (
            <div role="alert" className="flex items-start gap-2 rounded-sm bg-error-suave px-3 py-2 text-small text-error-texto">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{serverError}</p>
            </div>
          )}
          <Field id={`${id}-motivo`} label={c.label} help="Queda registrado en el historial del documento." error={error} required>
            {(aria) => (
              <Textarea {...aria} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus className="min-h-28" />
            )}
          </Field>
          <FichaDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant={c.destructive ? "destructive" : "default"} loading={pending}>
              {c.confirmLabel}
            </Button>
          </FichaDialogFooter>
        </form>
      </FichaDialogContent>
    </Dialog>
  )
}
