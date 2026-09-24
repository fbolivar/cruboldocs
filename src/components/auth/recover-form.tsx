"use client"

import { ArrowLeftIcon, MailCheckIcon } from "lucide-react"
import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import type * as React from "react"

import { FormAlert } from "@/components/auth/form-alert"
import { CAPTCHA_ENABLED, CAPTCHA_PENDING, Turnstile, type TurnstileHandle } from "@/components/auth/turnstile"
import { validateEmail } from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { HexIcon } from "@/components/ui/hex-icon"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/lib/data/actions"

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-1 self-start text-small font-medium text-acento underline-offset-4 hover:underline"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Volver a ingresar
    </Link>
  )
}

/** Recuperar contraseña: la respuesta es siempre genérica (no revela si el correo existe). */
export function RecoverForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const captcha = useRef<TurnstileHandle>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const err = validateEmail(email)
    setError(err)
    if (err) {
      document.getElementById("recover-email")?.focus()
      return
    }
    if (CAPTCHA_ENABLED && !captchaToken) {
      setFormError(CAPTCHA_PENDING)
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await requestPasswordReset(email.trim(), captchaToken ?? "")
      if (res.ok) {
        setSent(true)
        return
      }
      setFormError(res.error)
      captcha.current?.reset()
    })
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <HexIcon icon={MailCheckIcon} size="lg" />
        <h1>Revisa tu correo</h1>
        <p className="text-body-lg text-texto-sec">
          Si el correo está registrado, recibirás un enlace en unos minutos.
        </p>
        <BackToLogin />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1>Recupera tu contraseña</h1>
        <p className="text-texto-sec">Escribe el correo con el que ingresas y te enviaremos un enlace para crear una nueva.</p>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <Field id="recover-email" label="Correo" error={error}>
          {(aria) => (
            <Input
              {...aria}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && setError(validateEmail(email))}
            />
          )}
        </Field>
        <Turnstile ref={captcha} action="recuperar" onToken={setCaptchaToken} />
        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
      <BackToLogin />
    </>
  )
}
