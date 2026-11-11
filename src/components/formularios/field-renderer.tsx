"use client"

import { CheckCircle2Icon } from "lucide-react"
import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { saveSubmissionDraft, submitNewSubmission, submitSubmission } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { FieldValue, FormFieldView, PublishedForm } from "@/lib/types"

const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"

/** Renderiza un campo según su tipo. Compartido por «Diligenciar» y la vista de una respuesta. */
export function FieldRenderer({
  field, value, onChange, readOnly = false, error,
}: {
  field: FormFieldView
  value: FieldValue
  onChange?: (v: FieldValue) => void
  readOnly?: boolean
  error?: string
}) {
  const id = `f-${field.id}`
  if (field.type === "seccion") {
    return (
      <div className="pt-2">
        <p className="border-b border-borde pb-1 text-small font-semibold uppercase tracking-wide text-texto-sec">{field.label}</p>
        {field.help && <p className="mt-1 text-caption text-texto-sec">{field.help}</p>}
      </div>
    )
  }

  const describedBy = error ? `${id}-err` : field.help ? `${id}-help` : undefined

  function control() {
    const common = { id, "aria-required": field.required, "aria-describedby": describedBy, "aria-invalid": !!error }
    if (readOnly) {
      return <p className="whitespace-pre-wrap text-body">{displayValue(field, value)}</p>
    }
    switch (field.type) {
      case "texto":
        return <Input {...common} value={(value as string) ?? ""} onChange={(e) => onChange?.(e.target.value)} />
      case "texto_largo":
        return <Textarea {...common} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange?.(e.target.value)} />
      case "numero":
      case "puntaje": {
        const min = field.config?.min
        const max = field.config?.max ?? (field.type === "puntaje" ? 100 : undefined)
        return (
          <Input
            {...common} type="number" inputMode="numeric"
            min={field.type === "puntaje" ? (min ?? 0) : min} max={max}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => onChange?.(e.target.value === "" ? null : Number(e.target.value))}
          />
        )
      }
      case "fecha":
        return <input {...common} type="date" className={dateInput} value={(value as string) ?? ""} onChange={(e) => onChange?.(e.target.value)} />
      case "si_no":
        return (
          <div role="radiogroup" aria-label={field.label} className="flex gap-2">
            {[["Sí", true], ["No", false]].map(([lbl, val]) => (
              <Button
                key={String(val)} type="button" variant={value === val ? "default" : "outline"} size="sm"
                role="radio" aria-checked={value === val} onClick={() => onChange?.(val as boolean)}
              >{lbl}</Button>
            ))}
          </div>
        )
      case "seleccion":
        return (
          <Select value={(value as string) ?? ""} onValueChange={(v) => onChange?.(v)}>
            <SelectTrigger id={id} aria-describedby={describedBy} aria-invalid={!!error}><SelectValue placeholder="Elige una opción" /></SelectTrigger>
            <SelectContent>{(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        )
      case "multiseleccion": {
        const sel = Array.isArray(value) ? (value as string[]) : []
        const toggle = (o: string) => onChange?.(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])
        return (
          <div className="flex flex-col gap-1.5">
            {(field.options ?? []).map((o) => (
              <label key={o} className="inline-flex items-center gap-2 text-body">
                <input type="checkbox" checked={sel.includes(o)} onChange={() => toggle(o)} className="size-4 accent-acento" /> {o}
              </label>
            ))}
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.type === "si_no" || field.type === "multiseleccion" ? undefined : id}>
        {field.label}{field.required && <span className="text-error-texto"> *</span>}
      </Label>
      {field.help && !error && <p id={`${id}-help`} className="text-caption text-texto-sec">{field.help}</p>}
      {control()}
      {error && <p id={`${id}-err`} className="text-caption text-error-texto">{error}</p>}
    </div>
  )
}

function displayValue(field: FormFieldView, value: FieldValue): string {
  if (value === null || value === undefined || value === "") return "—"
  if (field.type === "si_no") return value === true || value === "si" || value === "sí" ? "Sí" : "No"
  if (field.type === "multiseleccion" && Array.isArray(value)) return value.length ? value.join(", ") : "—"
  return String(value)
}

function isEmpty(v: FieldValue): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)
}

/** Diligenciar: compone los FieldRenderer + guardar borrador / enviar + validación en vivo. */
export function SubmissionForm({
  form, submissionId: initialSubmissionId, initialValues,
}: {
  form: PublishedForm
  submissionId?: string
  initialValues?: Record<string, FieldValue>
}) {
  const [values, setValues] = useState<Record<string, FieldValue>>(initialValues ?? {})
  const [submissionId, setSubmissionId] = useState<string | null>(initialSubmissionId ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [savingDraft, startDraft] = useTransition()
  const [sending, startSend] = useTransition()

  const dataFields = useMemo(() => form.fields.filter((f) => f.type !== "seccion"), [form.fields])
  const set = (fid: string, v: FieldValue) => setValues((p) => ({ ...p, [fid]: v }))

  function validate(): boolean {
    const next: Record<string, string> = {}
    for (const f of dataFields) {
      if (f.required && isEmpty(values[f.id] ?? null)) next[f.id] = "Este campo es obligatorio."
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      const first = dataFields.find((f) => next[f.id])
      if (first) document.getElementById(`f-${first.id}`)?.focus()
      return false
    }
    return true
  }

  function saveDraft() {
    startDraft(async () => {
      const r = await saveSubmissionDraft(submissionId, form.id, values)
      if (!r.ok) { toast.error(r.error); return }
      setSubmissionId(r.data.id)
      toast.success("Borrador guardado.")
    })
  }

  function send() {
    if (!validate()) { toast.error("Revisa los campos obligatorios."); return }
    startSend(async () => {
      const r = submissionId
        ? await submitSubmission(submissionId, values)
        : await submitNewSubmission(form.id, values)
      if (!r.ok) { toast.error(r.error); return }
      setDone(true)
    })
  }

  if (done) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2Icon className="size-10 text-exito-texto" aria-hidden="true" />
        <p className="font-display text-h3 text-texto">Respuesta enviada</p>
        <p className="text-body text-texto-sec">Gracias. Tu respuesta a {form.title} quedó registrada.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => { setValues({}); setSubmissionId(null); setErrors({}); setDone(false) }}>Responder otra</Button>
          <Button asChild><Link href={`/app/formularios/${form.code}`}>Volver a la plantilla</Link></Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-5 p-4 md:p-6">
      {form.fields.map((f) => (
        <FieldRenderer key={f.id} field={f} value={values[f.id] ?? null} onChange={(v) => set(f.id, v)} error={errors[f.id]} />
      ))}
      <div className="flex flex-col gap-2 border-t border-borde pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={saveDraft} loading={savingDraft}>Guardar borrador</Button>
        <Button onClick={send} loading={sending}>Enviar</Button>
      </div>
    </Card>
  )
}
