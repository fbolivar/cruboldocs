"use client"

import { CheckCircle2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { CAPTCHA_ENABLED, CAPTCHA_PENDING, Turnstile, type TurnstileHandle } from "@/components/auth/turnstile"
import { submitSupplierSelfAssessment } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function SupplierSelfAssessmentForm({ token, supplier, organization }: { token: string; supplier: string; organization: string }) {
  const [pending, start] = useTransition()
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const captcha = useRef<TurnstileHandle>(null)

  function submit() {
    setError(null)
    if (score === null || score < 0 || score > 100) { setError("Indica un puntaje de 0 a 100."); return }
    if (CAPTCHA_ENABLED && !captchaToken) { setError(CAPTCHA_PENDING); return }
    start(async () => {
      const r = await submitSupplierSelfAssessment({ token, score, comment: comment.trim() || undefined, captchaToken: captchaToken ?? "" })
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
        <h1 className="text-h3 text-texto">Gracias</h1>
        <p className="text-small text-texto-sec">Recibimos tu autoevaluación. {organization} la revisará.</p>
      </div>
    )
  }

  const field = "flex flex-col gap-1.5"
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 text-texto">Autoevaluación de proveedor</h1>
        <p className="text-small text-texto-sec">{supplier} · {organization}</p>
      </div>

      <div className={field}>
        <Label>Tu puntaje (0 a 100)</Label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} step={1} value={score ?? 50} onChange={(e) => setScore(Number(e.target.value))}
            aria-label="Puntaje de 0 a 100" className="flex-1 accent-acento" />
          <span className="w-12 text-right font-display text-h3 tabular-nums text-texto">{score ?? "—"}</span>
        </div>
      </div>

      <div className={field}>
        <Label htmlFor="sa-comment">Comentarios (opcional)</Label>
        <Textarea id="sa-comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      {CAPTCHA_ENABLED && <Turnstile ref={captcha} action="proveedor" onToken={setCaptchaToken} />}
      {error && <p className="text-small text-error-texto" role="alert">{error}</p>}

      <Button onClick={submit} loading={pending} disabled={score === null}>Enviar</Button>
    </div>
  )
}
