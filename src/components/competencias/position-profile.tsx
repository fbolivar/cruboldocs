"use client"

import { ListChecksIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { CompetencyKindChip, LevelChip } from "@/components/competencias/badges"
import { LEVEL_LABELS } from "@/components/competencias/labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { CompetencyLevel, PositionProfileDetail } from "@/lib/types"

const LEVELS: CompetencyLevel[] = [1, 2, 3]

export function PositionProfile({ profile, canManage }: { profile: PositionProfileDetail; canManage: boolean }) {
  const reqs = profile.requirements
  return (
    <div className="flex flex-col gap-3">
      {canManage && reqs.length > 0 && <div><AddRequirementSheet /></div>}
      {reqs.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecksIcon}
            title="Este cargo aún no tiene perfil de competencias"
            description="Agrega los requisitos que exige el puesto."
            action={canManage ? <AddRequirementSheet /> : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body">{r.competencyName}</p>
                    <CompetencyKindChip kind={r.kind} />
                    {r.isMandatory ? <Badge tone="info">Obligatoria</Badge> : <Badge tone="neutro">Deseable</Badge>}
                  </div>
                  {r.note && <p className="mt-0.5 text-caption text-texto-sec">{r.note}</p>}
                </div>
                <LevelChip level={r.requiredLevel} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AddRequirementSheet() {
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState<CompetencyLevel>(2)
  const [note, setNote] = useState("")

  function submit() {
    // TODO(backend): addPositionRequirement({ competencyId, level, mandatory, note })
    toast.success("Disponible cuando se conecte el backend.")
    setOpen(false)
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><PlusIcon /> Agregar requisito</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Agregar requisito</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className={field}>
            <Label>Competencia</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Elige del catálogo" /></SelectTrigger>
              <SelectContent><SelectItem value="demo">(catálogo al conectar el backend)</SelectItem></SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label>Nivel requerido</Label>
            <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as CompetencyLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={String(l)}>N{l} · {LEVEL_LABELS[l]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="req-note">Nota (opcional)</Label>
            <Textarea id="req-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit}>Agregar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
