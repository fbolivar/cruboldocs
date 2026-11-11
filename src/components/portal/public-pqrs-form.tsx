"use client"

import { CheckCircle2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { CAPTCHA_ENABLED, CAPTCHA_PENDING, Turnstile, type TurnstileHandle } from "@/components/auth/turnstile"
import { PQRS_TYPE_LABELS } from "@/components/pqrs/labels"
import { submitPublicPqrs } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { PqrsType } from "@/lib/types"

const TYPES = Object.keys(PQRS_TYPE_LABELS) as PqrsType[]

export function PublicPqrsForm({ token, organization }: { token: string; organization: string }) {
  const [pending, start] = useTransition()
  const [type, setType] = useState<PqrsType>("peticion")
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [description, setDescription] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const captcha = useRef<TurnstileHandle>(null)

  function submit() {
    setError(null)
    if (description.trim().length < 3) { setError("Cuéntanos tu caso."); return }
    if (CAPTCHA_ENABLED && !captchaToken) { setError(CAPTCHA_PENDING); return }
    start(async () => {
      const r = await submitPublicPqrs({
        token, type, customerName: name.trim() || undefined, customerContact: contact.trim() || undefined,
        description: description.trim(), captchaToken: captchaToken ?? "",
      })
      captcha.current?.reset()
      setCaptchaToken(null)
      if (!r.ok) { setError(r.error); return }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2Icon className="size-10 text-exito-texto" />
        <h1 className="text-h3 text-texto">Recibimos tu caso</h1>
        <p className="text-small text-texto-sec">Gracias. {organization} dará respuesta por el medio que nos dejaste.</p>
      </div>
    )
  }

  const field = "flex flex-col gap-1.5"
  const select = "h-11 w-full rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 text-texto">Radica tu petición, queja o reclamo</h1>
        <p className="text-small text-texto-sec">{organization}</p>
      </div>

      <div className={field}>
        <Label htmlFor="pq-type">Tipo</Label>
        <select id="pq-type" value={type} onChange={(e) => setType(e.target.value as PqrsType)} className={select}>
          {TYPES.map((t) => <option key={t} value={t}>{PQRS_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      <div className={field}>
        <Label htmlFor="pq-name">Tu nombre (opcional)</Label>
        <Input id="pq-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={field}>
        <Label htmlFor="pq-contact">Correo o teléfono (opcional)</Label>
        <Input id="pq-contact" value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} />
        <p className="text-caption text-texto-sec">Déjanos un contacto si quieres respuesta.</p>
      </div>

      <div className={field}>
        <Label htmlFor="pq-desc">Cuéntanos</Label>
        <Textarea id="pq-desc" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {CAPTCHA_ENABLED && <Turnstile ref={captcha} action="pqrs_publica" onToken={setCaptchaToken} />}
      {error && <p className="text-small text-error-texto" role="alert">{error}</p>}

      <Button onClick={submit} loading={pending}>Enviar</Button>
      <p className="text-caption text-texto-sec">
        Al enviar, aceptas el <a href="/tratamiento-de-datos" className="underline">tratamiento de tus datos</a>.
      </p>
    </div>
  )
}
