"use client"

import { ListChecksIcon, PlusIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CompetencyKindChip, LevelChip } from "@/components/competencias/badges"
import { LEVEL_LABELS } from "@/components/competencias/labels"
import { removePositionRequirement, setPositionRequirement } from "@/lib/data/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { CompetencyLevel, CompetencyListItem, PositionProfileDetail } from "@/lib/types"

const LEVELS: CompetencyLevel[] = [1, 2, 3]

export function PositionProfile({
  profile,
  catalog,
  canManage,
}: {
  profile: PositionProfileDetail
  catalog: CompetencyListItem[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const reqs = profile.requirements

  function remove(reqId: string) {
    start(async () => {
      const r = await removePositionRequirement(reqId)
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Requisito quitado.")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage && reqs.length > 0 && <div><AddRequirementSheet positionId={profile.positionId} catalog={catalog} /></div>}
      {reqs.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecksIcon}
            title="Este cargo aún no tiene perfil de competencias"
            description="Agrega los requisitos que exige el puesto."
            action={canManage ? <AddRequirementSheet positionId={profile.positionId} catalog={catalog} /> : undefined}
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
                <div className="flex shrink-0 items-center gap-2">
                  <LevelChip level={r.requiredLevel} />
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" aria-label="Quitar requisito" disabled={pending} onClick={() => remove(r.id)}>
                      <XIcon />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AddRequirementSheet({ positionId, catalog }: { positionId: string; catalog: CompetencyListItem[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [competencyId, setCompetencyId] = useState("")
  const [level, setLevel] = useState<CompetencyLevel>(2)
  const [mandatory, setMandatory] = useState(true)
  const [note, setNote] = useState("")

  const options = catalog.filter((c) => c.isActive)

  function submit() {
    if (!competencyId) { toast.error("Elige una competencia."); return }
    start(async () => {
      const r = await setPositionRequirement({ positionId, competencyId, level, mandatory, note: note.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Requisito agregado.")
      setOpen(false)
      setCompetencyId(""); setNote("")
      router.refresh()
    })
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
            <Select value={competencyId} onValueChange={setCompetencyId}>
              <SelectTrigger><SelectValue placeholder="Elige del catálogo" /></SelectTrigger>
              <SelectContent>
                {options.length === 0
                  ? <SelectItem value="none" disabled>No hay competencias en el catálogo</SelectItem>
                  : options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label>Nivel requerido</Label>
            <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as CompetencyLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={String(l)}>N{l} · {LEVEL_LABELS[l]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-small">
            <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="size-4 rounded border-borde-fuerte" />
            Obligatoria
          </label>
          <div className={field}>
            <Label htmlFor="req-note">Nota (opcional)</Label>
            <Textarea id="req-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Agregar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
