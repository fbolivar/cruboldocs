"use client"

import { CheckCircle2Icon, XCircleIcon } from "lucide-react"
import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { submitCourseAttempt } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { todayIsoDate, formatDate } from "@/lib/format"
import type { CourseAttemptResult, CourseToTake } from "@/lib/types"

function Certificate({ course, userName, result }: { course: CourseToTake; userName: string; result: CourseAttemptResult }) {
  const aprobado = result.status === "aprobado"
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-center gap-2">
          {aprobado ? <CheckCircle2Icon className="size-6 text-exito-texto" aria-hidden="true" /> : <XCircleIcon className="size-6 text-error-texto" aria-hidden="true" />}
          <p className="font-display text-h3 text-texto" role="status">
            {aprobado ? "Aprobado" : "No aprobado"} — {result.score}%
          </p>
        </div>
        {!aprobado && <p className="text-small text-texto-sec">Umbral de aprobación: {result.passingScore}%.</p>}
        <div className="rounded-md border border-borde bg-superficie-alt p-4 text-small text-texto-sec">
          <p className="font-medium text-texto">Constancia</p>
          <p className="mt-1">
            <span className="font-mono">{course.code}</span> · {userName} · {formatDate(todayIsoDate())} · {result.score}%
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function CourseTaker({ course, userName }: { course: CourseToTake; userName: string }) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<CourseAttemptResult | null>(null)
  const [pending, start] = useTransition()
  const [errorId, setErrorId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function pick(questionId: string, idx: number) {
    setAnswers((a) => ({ ...a, [questionId]: idx }))
    if (errorId === questionId) setErrorId(null)
  }

  function submit() {
    const missing = course.questions.find((q) => answers[q.id] === undefined)
    if (missing) {
      setErrorId(missing.id)
      toast.error("Responde todas las preguntas antes de enviar.")
      formRef.current?.querySelector<HTMLElement>(`#q-${missing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    start(async () => {
      const r = await submitCourseAttempt(course.id, answers)
      if (!r.ok) { toast.error(r.error); return }
      setResult(r.data)
    })
  }

  function retake() {
    setAnswers({})
    setResult(null)
    setErrorId(null)
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <Certificate course={course} userName={userName} result={result} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={retake}>Tomar de nuevo</Button>
          <Button asChild variant="ghost"><Link href="/app/capacitacion">Volver</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit() }} className="flex flex-col gap-4 md:gap-6">
      {course.content && (
        <Card>
          <CardHeader><CardTitle>Material</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-body text-texto-sec">{course.content}</p></CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Evaluación ({course.questions.length} preguntas)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-5">
          {course.questions.map((q, idx) => (
            <fieldset
              key={q.id}
              id={`q-${q.id}`}
              role="radiogroup"
              aria-required="true"
              className={`flex flex-col gap-2 ${errorId === q.id ? "rounded-md ring-1 ring-error" : ""}`}
            >
              <legend className="text-body text-texto">
                <span className="text-texto-sec">{idx + 1}.</span> {q.text} <span className="text-error-texto">*</span>
              </legend>
              {q.options.map((opt, oidx) => (
                <label key={oidx} className="flex items-center gap-2 text-body text-texto">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === oidx}
                    aria-checked={answers[q.id] === oidx}
                    onChange={() => pick(q.id, oidx)}
                    className="accent-acento"
                  />
                  {opt}
                </label>
              ))}
            </fieldset>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>Enviar evaluación</Button>
      </div>
    </form>
  )
}
