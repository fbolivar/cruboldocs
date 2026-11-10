"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { CompetencyStatusBadge, LevelChip } from "@/components/competencias/badges"
import { COMPETENCY_STATUS_LABELS, LEVEL_LABELS, deriveStatus, levelFraction } from "@/components/competencias/labels"
import { assessCompetency } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { AssessedLevel, PersonCompetencyRow } from "@/lib/types"

export function PersonCompetencies({ rows }: { rows: PersonCompetencyRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Escritorio: tabla */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-body">
          <thead>
            <tr className="border-b border-borde text-caption text-texto-sec">
              <th scope="col" className="px-4 py-2 font-medium">Competencia</th>
              <th scope="col" className="px-3 py-2 font-medium">Requerido</th>
              <th scope="col" className="px-3 py-2 font-medium">Evaluado</th>
              <th scope="col" className="px-3 py-2 font-medium">Estado</th>
              <th scope="col" className="px-3 py-2 font-medium">Próx. revisión</th>
              <th scope="col" className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.competencyId} className="border-b border-borde last:border-0">
                <td className="px-4 py-3">{r.competencyName}</td>
                <td className="px-3 py-3"><LevelChip level={r.requiredLevel} /></td>
                <td className="px-3 py-3 tabular-nums text-texto-sec">{levelFraction(r.assessedLevel, r.requiredLevel)}</td>
                <td className="px-3 py-3"><CompetencyStatusBadge status={r.status} /></td>
                <td className="px-3 py-3 text-caption text-texto-sec">{r.nextReviewDate ? formatDate(r.nextReviewDate) : "—"}</td>
                <td className="px-3 py-3 text-right"><GapLink row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Móvil: cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <Card key={r.competencyId} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-body">{r.competencyName}</p>
              <CompetencyStatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-caption text-texto-sec">
              Requerido N{r.requiredLevel} · Evaluado {levelFraction(r.assessedLevel, r.requiredLevel)}
              {r.nextReviewDate ? ` · Revisión ${formatDate(r.nextReviewDate)}` : ""}
            </p>
            <div className="mt-2"><GapLink row={r} /></div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** La tarea de cierre se crea al evaluar (casilla en el Sheet). Aquí solo se enlaza si existe. */
function GapLink({ row }: { row: PersonCompetencyRow }) {
  if (!row.gapTaskId) return null
  return <Link href="/app" className="text-small font-medium text-acento hover:underline">Ver tarea de cierre</Link>
}

const ASSESSED: AssessedLevel[] = [0, 1, 2, 3]

export function AssessCompetencySheet({
  membershipId,
  positionId,
  rows,
}: {
  membershipId: string
  positionId: string
  rows: PersonCompetencyRow[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [competencyId, setCompetencyId] = useState(rows[0]?.competencyId ?? "")
  const [level, setLevel] = useState<AssessedLevel>(0)
  const [next, setNext] = useState("")
  const [note, setNote] = useState("")
  const [createTask, setCreateTask] = useState(false)

  const required = useMemo(() => rows.find((r) => r.competencyId === competencyId)?.requiredLevel ?? 1, [rows, competencyId])
  const status = deriveStatus(level, required, note.trim().length > 0)
  const isGap = status === "brecha" || status === "brecha_en_plan"

  function submit() {
    if (!competencyId) { toast.error("Elige la competencia."); return }
    if (isGap && note.trim().length === 0) { toast.error("Explica el plan de cierre de la brecha."); return }
    start(async () => {
      const r = await assessCompetency({
        membershipId, competencyId, positionId, assessedLevel: level,
        nextReview: next || null, note: note.trim() || undefined, createTask: isGap && createTask,
      })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Evaluación guardada.")
      setOpen(false)
      setNote("")
      setCreateTask(false)
      router.refresh()
    })
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Evaluar competencia</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Evaluar competencia</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label>Competencia</Label>
            <Select value={competencyId} onValueChange={setCompetencyId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{rows.map((r) => <SelectItem key={r.competencyId} value={r.competencyId}>{r.competencyName} (req. N{r.requiredLevel})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label>Nivel evaluado</Label>
            <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as AssessedLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sin nivel</SelectItem>
                {ASSESSED.slice(1).map((l) => <SelectItem key={l} value={String(l)}>N{l} · {LEVEL_LABELS[l as 1 | 2 | 3]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-superficie-alt p-3 text-small">
            Estado resultante: <span className="font-medium">{COMPETENCY_STATUS_LABELS[status]}</span> ({levelFraction(level, required)})
          </div>
          <div className={field}>
            <Label htmlFor="as-next">Próxima revisión (opcional)</Label>
            <input id="as-next" type="date" value={next} onChange={(e) => setNext(e.target.value)} className="h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9" />
          </div>
          <div className={field}>
            <Label htmlFor="as-note">{isGap ? "Plan de cierre (obligatorio en brecha)" : "Nota (opcional)"}</Label>
            <Textarea id="as-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isGap ? "Qué formación o acción cerrará la brecha" : ""} />
          </div>
          {isGap && (
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="size-4 rounded border-borde-fuerte" />
              Crear tarea de cierre asignada al cargo
            </label>
          )}
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar evaluación</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
