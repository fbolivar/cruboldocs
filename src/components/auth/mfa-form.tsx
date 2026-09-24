"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type * as React from "react"

import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type MfaEnrollment, startMfaEnrollment, verifyMfa } from "@/lib/data/actions"

const CODE_ERROR = "Escribe el código de 6 dígitos de tu app de autenticación."

/**
 * Sin factor registrado: primero muestra el QR y la clave para la app; después pide el código.
 * Con factor: pide el código directamente.
 */
export function MfaForm({ factorId }: { factorId: string | null }) {
  const router = useRouter()
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const activeFactor = factorId ?? enrollment?.factorId ?? null

  function enroll() {
    setFormError(null)
    startTransition(async () => {
      const res = await startMfaEnrollment()
      if (res.ok) setEnrollment(res.data)
      else setFormError(res.error)
    })
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeFactor) return
    const value = code.replace(/\s/g, "")
    if (!/^\d{6}$/.test(value)) {
      setCodeError(CODE_ERROR)
      document.getElementById("mfa-code")?.focus()
      return
    }
    setCodeError(null)
    setFormError(null)
    startTransition(async () => {
      const res = await verifyMfa(activeFactor, value)
      if (!res.ok) {
        setFormError(res.error)
        setCode("")
        return
      }
      router.replace("/app")
      router.refresh()
    })
  }

  if (!activeFactor) {
    return (
      <div className="flex flex-col gap-4">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <Button type="button" loading={pending} className="w-full" onClick={enroll}>
          {pending ? "Preparando…" : "Registrar app de autenticación"}
        </Button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      {enrollment && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-borde p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG en data URI generado por Supabase Auth */}
          <img src={enrollment.qrCode} alt="Código QR para tu app de autenticación" width={180} height={180} />
          <p className="text-small text-texto-sec">
            Escanéalo con tu app o escribe esta clave:{" "}
            <span className="font-mono break-all text-texto">{enrollment.secret}</span>
          </p>
        </div>
      )}
      <Field id="mfa-code" label="Código de verificación" error={codeError}>
        {(aria) => (
          <Input
            {...aria}
            name="code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Verificando…" : "Verificar"}
      </Button>
    </form>
  )
}
