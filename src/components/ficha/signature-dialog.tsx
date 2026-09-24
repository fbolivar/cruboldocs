"use client"

import { CircleAlertIcon, PenLineIcon } from "lucide-react"
import { type FormEvent, useId, useState } from "react"

import { PasswordInput } from "@/components/auth/password-input"
import { FichaDialogContent, FichaDialogFooter } from "@/components/ficha/ficha-dialog"
import { SIGNATURE_MEANING } from "@/components/ficha/doc-updates"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { signVersion } from "@/lib/data/actions"
import type { SignatureAction } from "@/lib/types"

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  code: string
  title: string
  versionNo: number
  pdfSha256: string
  action: SignatureAction
  onSigned: (signedAt: string) => void
}

const LABEL: Record<SignatureAction, string> = { revision: "Firmar revisión", aprobacion: "Firmar aprobación" }

/** Firma con reautenticación: muestra exactamente qué se firma (ADR-004). */
export function SignatureDialog(props: SignatureDialogProps) {
  const { open, onOpenChange, code, title, versionNo, pdfSha256, action } = props
  const id = useId()
  const [password, setPassword] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; accepted?: string; server?: string }>({})
  const [pending, setPending] = useState(false)

  function reset(next: boolean) {
    if (!next) {
      setPassword("")
      setAccepted(false)
      setErrors({})
    }
    onOpenChange(next)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next = {
      password: password ? undefined : "Escribe tu contraseña para firmar.",
      accepted: accepted ? undefined : "Marca la casilla para registrar la firma.",
    }
    setErrors(next)
    if (next.password || next.accepted) return
    setPending(true)
    const res = await signVersion({ documentId: props.documentId, versionNo, action, password })
    setPending(false)
    if (!res.ok) {
      setErrors({ server: res.error })
      setPassword("")
      return
    }
    props.onSigned(res.data.signedAt)
    reset(false)
  }

  const checkId = `${id}-casilla`
  const checkErrorId = `${checkId}-error`
  return (
    <Dialog open={open} onOpenChange={reset}>
      <FichaDialogContent title={`${LABEL[action]} de ${code} v${versionNo}`}>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
          <dl className="flex flex-col gap-2 rounded-md border border-borde bg-fondo px-4 py-3">
            <div>
              <dt className="text-small text-texto-sec">Documento</dt>
              <dd>
                <span className="font-mono">{code}</span> · {title} · <span className="font-medium">v{versionNo}</span>
              </dd>
            </div>
            <div>
              <dt className="text-small text-texto-sec">Hash del PDF (SHA-256)</dt>
              <dd className="font-mono text-small break-all">{pdfSha256}</dd>
            </div>
          </dl>
          <p className="text-body-lg">«{SIGNATURE_MEANING[action]}»</p>
          {errors.server && (
            <div role="alert" className="flex items-start gap-2 rounded-sm bg-error-suave px-3 py-2 text-small text-error-texto">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{errors.server}</p>
            </div>
          )}
          <Field id={`${id}-clave`} label="Confirma tu contraseña para firmar" error={errors.password} required>
            {(aria) => (
              <PasswordInput
                {...aria}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-3">
              <Checkbox
                id={checkId}
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                aria-invalid={errors.accepted ? true : undefined}
                aria-describedby={errors.accepted ? checkErrorId : undefined}
                aria-required
                className="mt-0.5"
              />
              <label htmlFor={checkId} className="text-small">
                Entiendo que esta firma queda registrada con mi nombre, fecha, hora e IP.
              </label>
            </div>
            {errors.accepted && (
              <p id={checkErrorId} className="text-small text-error-texto">
                {errors.accepted}
              </p>
            )}
          </div>
          <FichaDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending}>
              {!pending && <PenLineIcon aria-hidden="true" />}
              {LABEL[action]}
            </Button>
          </FichaDialogFooter>
        </form>
      </FichaDialogContent>
    </Dialog>
  )
}
