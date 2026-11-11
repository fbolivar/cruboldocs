"use client"

import { InboxIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { FieldRenderer } from "@/components/formularios/field-renderer"
import { FIELD_TYPE_LABELS } from "@/components/formularios/labels"
import { fetchSubmission } from "@/lib/data/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatDateTime } from "@/lib/format"
import type { FormFieldView, SubmissionDetail, SubmissionListItem } from "@/lib/types"

export function SubmissionsList({ submissions }: { submissions: SubmissionListItem[] }) {
  const [pending, start] = useTransition()
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [open, setOpen] = useState(false)

  function view(id: string) {
    start(async () => {
      const d = await fetchSubmission(id)
      if (!d) { toast.error("No pudimos abrir la respuesta."); return }
      setDetail(d); setOpen(true)
    })
  }

  if (submissions.length === 0) {
    return <EmptyState icon={InboxIcon} title="Aún no hay respuestas" description="Comparte «Diligenciar» para empezar a recolectar." />
  }

  return (
    <>
      <ul className="divide-y divide-borde">
        {submissions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-body">
                {s.submittedAt ? formatDateTime(s.submittedAt) : formatDateTime(s.createdAt)} · {s.submittedByName}
              </p>
              <p className="text-caption text-texto-sec">v{s.templateVersion} · {s.status === "enviada" ? "Enviada" : "Borrador"}</p>
            </div>
            <div className="flex items-center gap-2">
              {s.status === "enviada"
                ? <Badge tone="exito">Enviada</Badge>
                : <Badge tone="advertencia">Borrador</Badge>}
              <Button variant="outline" size="sm" onClick={() => view(s.id)} loading={pending}>Ver</Button>
            </div>
          </li>
        ))}
      </ul>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent size="sm" className="gap-0 p-0">
          <SheetHeader className="border-b border-borde"><SheetTitle>Respuesta</SheetTitle></SheetHeader>
          {detail && <SubmissionView detail={detail} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

function SubmissionView({ detail }: { detail: SubmissionDetail }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <p className="text-caption text-texto-sec">
        Diligenció {detail.submittedByName} · v{detail.templateVersion}
        {detail.submittedAt ? ` · ${formatDateTime(detail.submittedAt)}` : " · borrador"}
      </p>
      {detail.fields.map((f) => (
        <FieldRenderer key={f.id} field={f} value={detail.values[f.id] ?? null} readOnly />
      ))}
    </div>
  )
}

/** Vista solo lectura de los campos de la versión vigente (auditar qué se pregunta). */
export function TemplateStructure({ fields }: { fields: FormFieldView[] }) {
  if (fields.length === 0) {
    return <p className="text-small text-texto-sec">Esta versión no tiene campos.</p>
  }
  return (
    <ol className="flex flex-col gap-1.5">
      {fields.map((f, i) =>
        f.type === "seccion" ? (
          <li key={f.id} className="pt-2 text-small font-semibold uppercase tracking-wide text-texto-sec">— {f.label} —</li>
        ) : (
          <li key={f.id} className="text-body">
            <span className="text-texto-sec">{i + 1}.</span> {f.label}
            {f.required && <span className="text-error-texto"> *</span>}
            <span className="text-caption text-texto-sec"> ({FIELD_TYPE_LABELS[f.type]})</span>
          </li>
        ),
      )}
    </ol>
  )
}
