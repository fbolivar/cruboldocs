"use client"

import { ClipboardPenIcon, ExternalLinkIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { OutputKindChip } from "@/components/revisiones/badges"
import { OUTPUT_KIND_LABELS } from "@/components/revisiones/labels"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { ReviewOutputKind, ReviewOutputView } from "@/lib/types"

const KINDS = Object.keys(OUTPUT_KIND_LABELS) as ReviewOutputKind[]

export function ReviewOutputList({
  reviewId,
  outputs,
  canManage,
  editable,
}: {
  reviewId: string
  outputs: ReviewOutputView[]
  canManage: boolean
  editable: boolean
}) {
  function generateNc(id: string) {
    // TODO(backend): server action generateNcFromOutput.
    toast.success("No conformidad generada desde la decisión.")
    void id
  }

  if (outputs.length === 0) {
    return (
      <EmptyState
        icon={ClipboardPenIcon}
        title="Aún no hay decisiones"
        description={editable && canManage ? "Registra la primera decisión de la revisión." : "Las decisiones se registran al conducir la revisión."}
        action={editable && canManage ? <AddOutputSheet reviewId={reviewId} /> : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {outputs.map((o) => (
          <li key={o.id} className="rounded-lg border border-borde bg-superficie p-3">
            <div className="flex flex-wrap items-center gap-2">
              <OutputKindChip kind={o.kind} />
              {o.responsibleName && <span className="text-caption text-texto-sec">resp. {o.responsibleName}</span>}
              {o.dueDate && <span className="text-caption text-texto-sec">· vence {formatDate(o.dueDate)}</span>}
            </div>
            <p className="mt-1.5 text-body">{o.description}</p>
            {o.kind === "accion_mejora" && (
              <div className="mt-2">
                {o.nonconformityCode ? (
                  <Link href={`/app/no-conformidades/${o.nonconformityCode}`} className="inline-flex items-center gap-1 text-small font-medium text-acento hover:underline">
                    <ExternalLinkIcon className="size-3.5" /> {o.nonconformityCode}
                  </Link>
                ) : (
                  canManage && editable && (
                    <Button size="sm" variant="outline" onClick={() => generateNc(o.id)}>Generar no conformidad</Button>
                  )
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {canManage && editable && <div><AddOutputSheet reviewId={reviewId} /></div>}
    </div>
  )
}

function AddOutputSheet({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ReviewOutputKind>("decision")
  const [description, setDescription] = useState("")
  const [responsible, setResponsible] = useState("")
  const [due, setDue] = useState("")

  function submit() {
    if (description.trim().length < 5) {
      toast.error("Describe la decisión.")
      return
    }
    // TODO(backend): server action addReviewOutput.
    toast.success("Decisión agregada.")
    void reviewId
    void responsible
    setOpen(false)
    setKind("decision")
    setDescription("")
    setResponsible("")
    setDue("")
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline"><PlusIcon /> Agregar decisión</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Agregar decisión</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ReviewOutputKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => <SelectItem key={k} value={k}>{OUTPUT_KIND_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="out-desc">Descripción</Label>
            <Textarea id="out-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué se decide o se compromete" />
          </div>
          <div className={field}>
            <Label htmlFor="out-resp">Responsable (opcional)</Label>
            <Input id="out-resp" value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Cargo responsable" />
          </div>
          <div className={field}>
            <Label htmlFor="out-due">Plazo (opcional)</Label>
            <input id="out-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Agregar decisión</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
