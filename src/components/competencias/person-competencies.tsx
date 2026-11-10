"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { CompetencyStatusBadge, LevelChip } from "@/components/competencias/badges"
import { COMPETENCY_STATUS_LABELS, LEVEL_LABELS, deriveStatus, levelFraction } from "@/components/competencias/labels"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { AssessedLevel, PersonCompetencyRow } from "@/lib/types"

export function PersonCompetencies({ rows, canManage }: { rows: PersonCompetencyRow[]; canManage: boolean }) {
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
                <td className="px-3 py-3 text-right"><GapAction row={r} canManage={canManage} /></td>
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
            <div className="mt-2"><GapAction row={r} canManage={canManage} /></div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** En brecha: enlace a la tarea si existe, o botón para crearla (stub). */
function GapAction({ row, canManage }: { row: PersonCompetencyRow; canManage: boolean }) {
  const isGap = row.status === "brecha" || row.status === "brecha_en_plan"
  if (!isGap) return null
  if (row.gapTaskId) {
    return (
      <Link href="/app" className="text-small font-medium text-acento hover:underline">Ver tarea de cierre</Link>
    )
  }
  if (!canManage) return null
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => toast.success("Disponible cuando se conecte el backend.")}
    >
      Crear tarea de cierre
    </Button>
  )
}

const ASSESSED: AssessedLevel[] = [0, 1, 2, 3]

export function AssessCompetencySheet({ rows }: { rows: PersonCompetencyRow[] }) {
  const [open, setOpen] = useState(false)
  const [competencyId, setCompetencyId] = useState(rows[0]?.competencyId ?? "")
  const [level, setLevel] = useState<AssessedLevel>(0)
  const [next, setNext] = useState("")
  const [note, setNote] = useState("")

  const required = useMemo(() => rows.find((r) => r.competencyId === competencyId)?.requiredLevel ?? 1, [rows, competencyId])
  const status = deriveStatus(level, required, note.trim().length > 0)
  const isGap = status === "brecha" || status === "brecha_en_plan"

  function submit() {
    if (!competencyId) { toast.error("Elige la competencia."); return }
    if (isGap && note.trim().length === 0) { toast.error("Explica el plan de cierre de la brecha."); return }
    // TODO(backend): assessCompetency({ competencyId, level, next, note })
    toast.success("Disponible cuando se conecte el backend.")
    setOpen(false)
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
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Guardar evaluación</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
