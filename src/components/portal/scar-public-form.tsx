"use client"

import { CheckCircle2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { CAPTCHA_ENABLED, CAPTCHA_PENDING, Turnstile, type TurnstileHandle } from "@/components/auth/turnstile"
import { submitScarResponse } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ScarPublicForm({
  token, organization, supplier, title, description, dueDate,
}: {
  token: string; organization: string; supplier: string; title: string; description: string; dueDate: string | null
}) {
  const [pending, start] = useTransition()
  const [rootCause, setRootCause] = useState("")
  const [actions, setActions] = useState("")
  const [commitDate, setCommitDate] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const captcha = useRef<TurnstileHandle>(null)

  function submit() {
    setError(null)
    if (rootCause.trim().length < 3 || actions.trim().length < 3) { setError("Completa la causa raíz y las acciones."); return }
    if (CAPTCHA_ENABLED && !captchaToken) { setError(CAPTCHA_PENDING); return }
    start(async () => {
      const r = await submitScarResponse({ token, rootCause: rootCause.trim(), actions: actions.trim(), commitDate: commitDate || undefined, captchaToken: captchaToken ?? "" })
      captcha.current?.reset(); setCaptchaToken(null)
      if (!r.ok) { setError(r.error); return }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2Icon className="size-10 text-exito-texto" />
        <h1 className="text-h3 text-texto">Gracias</h1>
        <p className="text-small text-texto-sec">Recibimos tu respuesta. {organization} la revisará.</p>
      </div>
    )
  }

  const field = "flex flex-col gap-1.5"
  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 text-texto">Solicitud de acción correctiva</h1>
        <p className="text-small text-texto-sec">{supplier} · {organization}</p>
      </div>
      <div className="rounded-md border border-borde bg-fondo p-3">
        <p className="text-body font-medium text-texto">{title}</p>
        <p className="mt-1 whitespace-pre-wrap text-small text-texto-sec">{description}</p>
        {dueDate && <p className="mt-1 text-caption text-texto-sec">Plazo: {dueDate}</p>}
      </div>

      <div className={field}>
        <Label htmlFor="sc-cause">Causa raíz</Label>
        <Textarea id="sc-cause" rows={3} maxLength={4000} value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
      </div>
      <div className={field}>
        <Label htmlFor="sc-act">Acciones correctivas</Label>
        <Textarea id="sc-act" rows={3} maxLength={4000} value={actions} onChange={(e) => setActions(e.target.value)} />
      </div>
      <div className={field}>
        <Label htmlFor="sc-date">Fecha compromiso (opcional)</Label>
        <input id="sc-date" type="date" value={commitDate} onChange={(e) => setCommitDate(e.target.value)} className={dateInput} />
      </div>

      {CAPTCHA_ENABLED && <Turnstile ref={captcha} action="scar" onToken={setCaptchaToken} />}
      {error && <p className="text-small text-error-texto" role="alert">{error}</p>}
      <Button onClick={submit} loading={pending}>Enviar</Button>
    </div>
  )
}
