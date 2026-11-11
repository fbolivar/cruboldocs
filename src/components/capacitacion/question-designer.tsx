"use client"

import { PlusIcon, Trash2Icon, PencilIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { addCourseQuestion, removeCourseQuestion, updateCourseQuestion } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ListChecksIcon } from "lucide-react"
import type { CourseQuestionView } from "@/lib/types"

const field = "flex flex-col gap-1.5"
type Draft = { text: string; options: { text: string; correct: boolean }[] }

function emptyDraft(): Draft {
  return { text: "", options: [{ text: "", correct: true }, { text: "", correct: false }] }
}

function QuestionEditorSheet({
  courseId,
  question,
  open,
  onOpenChange,
}: {
  courseId: string
  question: CourseQuestionView | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<Draft>(() =>
    question ? { text: question.text, options: question.options.map((o) => ({ text: o.text, correct: o.correct })) } : emptyDraft(),
  )

  // Reinicia el borrador cuando cambia la pregunta objetivo.
  const [lastId, setLastId] = useState<string | null>(question?.id ?? null)
  if (open && (question?.id ?? null) !== lastId) {
    setLastId(question?.id ?? null)
    setDraft(question ? { text: question.text, options: question.options.map((o) => ({ text: o.text, correct: o.correct })) } : emptyDraft())
  }

  function setCorrect(idx: number) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => ({ ...o, correct: i === idx })) }))
  }
  function setOptionText(idx: number, text: string) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => (i === idx ? { ...o, text } : o)) }))
  }
  function addOption() {
    setDraft((d) => (d.options.length >= 10 ? d : { ...d, options: [...d.options, { text: "", correct: false }] }))
  }
  function removeOption(idx: number) {
    setDraft((d) => {
      if (d.options.length <= 2) return d
      const options = d.options.filter((_, i) => i !== idx)
      if (!options.some((o) => o.correct)) options[0].correct = true
      return { ...d, options }
    })
  }

  function submit() {
    if (draft.text.trim().length < 1) { toast.error("Escribe el enunciado."); return }
    const options = draft.options.map((o) => ({ text: o.text.trim(), correct: o.correct }))
    if (options.some((o) => !o.text)) { toast.error("Cada opción necesita texto."); return }
    if (options.filter((o) => o.correct).length !== 1) { toast.error("Marca exactamente una opción correcta."); return }
    start(async () => {
      const r = question
        ? await updateCourseQuestion(question.id, { text: draft.text, options })
        : await addCourseQuestion(courseId, { text: draft.text, options })
      if (!r.ok) { toast.error(r.error); return }
      onOpenChange(false)
      toast.success(question ? "Pregunta actualizada." : "Pregunta agregada."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{question ? "Editar pregunta" : "Nueva pregunta"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="q-text">Enunciado</Label>
            <Textarea id="q-text" rows={2} value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} placeholder="p. ej. ¿Qué es un EPP?" />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-small font-medium text-texto">Opciones (marca la correcta)</legend>
            {draft.options.map((o, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-option"
                  checked={o.correct}
                  onChange={() => setCorrect(idx)}
                  aria-label={`Marcar la opción ${idx + 1} como correcta`}
                  className="accent-acento"
                />
                <Input value={o.text} onChange={(e) => setOptionText(idx, e.target.value)} placeholder={`Opción ${idx + 1}`} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => removeOption(idx)} disabled={draft.options.length <= 2} aria-label={`Quitar opción ${idx + 1}`}>
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            ))}
            {draft.options.length < 10 && (
              <Button variant="outline" size="sm" onClick={addOption} className="self-start"><PlusIcon /> Agregar opción</Button>
            )}
          </fieldset>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function QuestionDesigner({
  courseId,
  questions,
  canEdit,
}: {
  courseId: string
  questions: CourseQuestionView[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const [editing, setEditing] = useState<CourseQuestionView | null>(null)
  const [open, setOpen] = useState(false)

  function openNew() { setEditing(null); setOpen(true) }
  function openEdit(q: CourseQuestionView) { setEditing(q); setOpen(true) }
  function remove(q: CourseQuestionView) {
    if (!confirm("¿Eliminar esta pregunta?")) return
    start(async () => {
      const r = await removeCourseQuestion(q.id)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Pregunta eliminada."); router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={openNew}><PlusIcon /> Pregunta</Button>
        </div>
      )}
      {questions.length === 0 ? (
        <EmptyState icon={ListChecksIcon} title="Aún no hay preguntas." description={canEdit ? "Agrega preguntas antes de publicar el curso." : undefined} />
      ) : (
        <ol className="flex flex-col gap-2">
          {questions.map((q, idx) => (
            <li key={q.id} className="flex items-start justify-between gap-3 rounded-md border border-borde p-3">
              <div className="min-w-0">
                <p className="text-body"><span className="text-texto-sec">{idx + 1}.</span> {q.text}</p>
                <p className="mt-1 text-caption text-texto-sec">{q.options.length} opciones</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(q)} aria-label={`Editar pregunta ${idx + 1}`}><PencilIcon aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(q)} aria-label={`Eliminar pregunta ${idx + 1}`}><Trash2Icon aria-hidden="true" /></Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {canEdit && <QuestionEditorSheet courseId={courseId} question={editing} open={open} onOpenChange={setOpen} />}
    </div>
  )
}
