"use client"

import { PlusIcon, TagIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CompetencyKindChip } from "@/components/competencias/badges"
import { KIND_LABELS } from "@/components/competencias/labels"
import { createCompetency } from "@/lib/data/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { CompetencyKind, CompetencyListItem } from "@/lib/types"

const KINDS = Object.keys(KIND_LABELS) as CompetencyKind[]

export function CatalogTable({ items, canManage }: { items: CompetencyListItem[]; canManage: boolean }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={TagIcon}
          title="Aún no defines competencias"
          description="Crea el catálogo y asígnalo a los cargos."
          action={canManage ? <NewCompetencySheet /> : undefined}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {canManage && <div><NewCompetencySheet /></div>}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-borde">
          {items.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body">{c.name}</p>
                  <CompetencyKindChip kind={c.kind} />
                  {!c.isActive && <Badge tone="neutro">Archivada</Badge>}
                </div>
                {c.description && <p className="mt-0.5 text-caption text-texto-sec">{c.description}</p>}
              </div>
              <span className="shrink-0 text-caption text-texto-sec">{c.positionCount} cargos</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function NewCompetencySheet() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [kind, setKind] = useState<CompetencyKind>("formacion")
  const [description, setDescription] = useState("")

  function submit() {
    if (name.trim().length < 2) {
      toast.error("Escribe el nombre de la competencia.")
      return
    }
    start(async () => {
      const r = await createCompetency({ name, kind, description: description.trim() || undefined })
      if (!r.ok) { toast.error(r.error); return }
      toast.success("Competencia creada.")
      setOpen(false)
      setName("")
      setDescription("")
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><PlusIcon /> Nueva competencia</Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>Nueva competencia</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comp-name">Nombre</Label>
            <Input id="comp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Auditoría interna ISO 19011" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as CompetencyKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comp-desc">Descripción (opcional)</Label>
            <Textarea id="comp-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Crear competencia</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
