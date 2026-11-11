"use client"

import { CheckCircle2Icon, StarIcon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { CAPTCHA_ENABLED, CAPTCHA_PENDING, Turnstile, type TurnstileHandle } from "@/components/auth/turnstile"
import { submitSurveyResponse } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SurveyScale } from "@/lib/types"

/** Control de puntaje según la escala; el valor seleccionado siempre es visible. */
function ScoreInput({ scale, value, onChange }: { scale: SurveyScale; value: number | null; onChange: (v: number) => void }) {
  if (scale === "1_5") {
    return (
      <div role="radiogroup" aria-label="Puntaje" className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} de 5`}
            onClick={() => onChange(n)}
            className={`rounded-md p-1 ${value !== null && n <= value ? "text-advertencia-texto" : "text-borde-fuerte"} hover:scale-110`}>
            <StarIcon className="size-8" fill={value !== null && n <= value ? "currentColor" : "none"} />
          </button>
        ))}
        <span className="ml-2 text-small text-texto-sec">{value !== null ? `${value}/5` : ""}</span>
      </div>
    )
  }
  if (scale === "nps_0_10") {
    return (
      <div role="radiogroup" aria-label="Puntaje" className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={String(n)}
            onClick={() => onChange(n)}
            className={`size-9 rounded-md border text-small font-medium ${value === n ? "border-acento bg-acento-suave text-acento" : "border-borde text-texto-sec hover:border-borde-fuerte"}`}>
            {n}
          </button>
        ))}
      </div>
    )
  }
  // 0_100
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={0} max={100} step={1} value={value ?? 50} onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Puntaje de 0 a 100" className="flex-1 accent-acento" />
      <span className="w-12 text-right font-display text-h3 tabular-nums text-texto">{value ?? "—"}</span>
    </div>
  )
}

export function SurveyForm({ token, title, scale }: { token: string; title: string; scale: SurveyScale }) {
  const [pending, start] = useTransition()
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const captcha = useRef<TurnstileHandle>(null)

  function submit() {
    setError(null)
    if (score === null) { setError("Indica tu puntaje."); return }
    if (CAPTCHA_ENABLED && !captchaToken) { setError(CAPTCHA_PENDING); return }
    start(async () => {
      const r = await submitSurveyResponse({ token, raw: score, comment: comment.trim() || undefined, captchaToken: captchaToken ?? "" })
      captcha.current?.reset()
      if (!r.ok) { setError(r.error); return }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2Icon className="size-10 text-exito-texto" />
        <h1 className="text-h3 text-texto">¡Gracias!</h1>
        <p className="text-small text-texto-sec">Registramos tu respuesta. Tu opinión nos ayuda a mejorar.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 text-texto">{title}</h1>
        <p className="text-small text-texto-sec">Tu opinión nos ayuda a mejorar. Es anónima.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>¿Qué tan satisfecho estás?</Label>
        <ScoreInput scale={scale} value={score} onChange={setScore} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sv-comment">Comentario (opcional)</Label>
        <Textarea id="sv-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
        <p className="text-caption text-texto-sec">No incluyas datos personales.</p>
      </div>

      {CAPTCHA_ENABLED && <Turnstile ref={captcha} action="encuesta" onToken={setCaptchaToken} />}
      {error && <p className="text-small text-error-texto">{error}</p>}

      <Button onClick={submit} loading={pending} disabled={score === null}>Enviar</Button>
    </div>
  )
}
