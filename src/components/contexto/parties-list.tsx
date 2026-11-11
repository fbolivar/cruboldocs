"use client"

import { MoreHorizontalIcon, PlusIcon, SearchXIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { PartyTypeChip } from "@/components/contexto/badges"
import { PARTY_TYPE_LABELS } from "@/components/contexto/labels"
import { createInterestedParty, setPartyArchived, updateInterestedParty } from "@/lib/data/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { InterestedPartyView, PartyType } from "@/lib/types"

type Option = { id: string; name: string }
const field = "flex flex-col gap-1.5"
const TYPES = Object.keys(PARTY_TYPE_LABELS) as PartyType[]

function PartySheet({
  party, processes, legal, open, onOpenChange,
}: {
  party: InterestedPartyView | null
  processes: Option[]
  legal: Option[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState(party?.name ?? "")
  const [partyType, setPartyType] = useState<PartyType>(party?.partyType ?? "cliente")
  const [needs, setNeeds] = useState(party?.needsExpectations ?? "")
  const [requirements, setRequirements] = useState(party?.requirements ?? "")
  const [monitoring, setMonitoring] = useState(party?.monitoring ?? "")
  const [processId, setProcessId] = useState(party?.processId ?? "")
  const [legalId, setLegalId] = useState(party?.legalRequirementId ?? "")

  const [lastId, setLastId] = useState<string | null>(party?.id ?? null)
  if (open && (party?.id ?? null) !== lastId) {
    setLastId(party?.id ?? null)
    setName(party?.name ?? ""); setPartyType(party?.partyType ?? "cliente"); setNeeds(party?.needsExpectations ?? "")
    setRequirements(party?.requirements ?? ""); setMonitoring(party?.monitoring ?? "")
    setProcessId(party?.processId ?? ""); setLegalId(party?.legalRequirementId ?? "")
  }

  function submit() {
    if (name.trim().length < 2) { toast.error("Escribe el nombre de la parte."); return }
    start(async () => {
      const payload = {
        name, partyType, needsExpectations: needs.trim() || undefined, requirements: requirements.trim() || undefined,
        monitoring: monitoring.trim() || undefined, processId: processId || null, legalRequirementId: legalId || null,
      }
      const r = party ? await updateInterestedParty(party.id, payload) : await createInterestedParty(payload)
      if (!r.ok) { toast.error(r.error); return }
      onOpenChange(false)
      toast.success(party ? "Parte actualizada." : "Parte registrada."); router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde"><SheetTitle>{party ? "Editar parte interesada" : "Nueva parte interesada"}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}><Label htmlFor="pi-name">Nombre</Label>
            <Input id="pi-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. ANLA, Clientes, Comunidad vecina" />
          </div>
          <div className={field}><Label>Tipo</Label>
            <Select value={partyType} onValueChange={(v) => setPartyType(v as PartyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((x) => <SelectItem key={x} value={x}>{PARTY_TYPE_LABELS[x]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className={field}><Label htmlFor="pi-needs">Necesidades y expectativas (opcional)</Label>
            <Textarea id="pi-needs" rows={2} value={needs} onChange={(e) => setNeeds(e.target.value)} />
          </div>
          <div className={field}><Label htmlFor="pi-req">Requisitos (opcional)</Label>
            <Textarea id="pi-req" rows={2} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
          </div>
          <div className={field}><Label htmlFor="pi-mon">Seguimiento (opcional)</Label>
            <Textarea id="pi-mon" rows={2} value={monitoring} onChange={(e) => setMonitoring(e.target.value)} placeholder="Cómo se le da seguimiento" />
          </div>
          <div className={field}><Label>Proceso (opcional)</Label>
            <Select value={processId || "none"} onValueChange={(v) => setProcessId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(sin proceso)</SelectItem>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}><Label>Requisito legal (opcional)</Label>
            <Select value={legalId || "none"} onValueChange={(v) => setLegalId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Requisito legal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(ninguno)</SelectItem>
                {legal.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-caption text-texto-sec">Si el nombre identifica a una persona, es un dato personal: captúralo solo si es necesario.</p>
        </div>
        <SheetFooter className="border-t border-borde"><Button onClick={submit} loading={pending}>Guardar</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function PartiesList({
  parties, processes, legal, canManage,
}: {
  parties: InterestedPartyView[]
  processes: Option[]
  legal: Option[]
  canManage: boolean
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const [tipo, setTipo] = useState<"todos" | PartyType>("todos")
  const [q, setQ] = useState("")
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [editing, setEditing] = useState<InterestedPartyView | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => parties.filter((p) => {
    if (!verArchivadas && p.status === "archivada") return false
    if (tipo !== "todos" && p.partyType !== tipo) return false
    if (q.trim() && !p.name.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }), [parties, tipo, q, verArchivadas])

  function openNew() { setEditing(null); setOpen(true) }
  function openEdit(p: InterestedPartyView) { setEditing(p); setOpen(true) }
  function archive(p: InterestedPartyView) {
    const toArchive = p.status !== "archivada"
    if (toArchive && !confirm("La parte se archivará. ¿Continuar?")) return
    start(async () => {
      const r = await setPartyArchived(p.id, toArchive)
      if (!r.ok) { toast.error(r.error); return }
      toast.success(toArchive ? "Parte archivada." : "Parte restaurada."); router.refresh()
    })
  }

  const hasFilters = tipo !== "todos" || q.trim() !== ""

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="md:w-44" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo tipo</SelectItem>
            {TYPES.map((x) => <SelectItem key={x} value={x}>{PARTY_TYPE_LABELS[x]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-48" aria-label="Buscar partes" />
        <label className="inline-flex items-center gap-2 text-small text-texto-sec">
          <input type="checkbox" checked={verArchivadas} onChange={(e) => setVerArchivadas(e.target.checked)} className="accent-acento" /> Mostrar archivadas
        </label>
        {canManage && <Button size="sm" className="md:ml-auto" onClick={openNew}><PlusIcon /> Nueva parte</Button>}
      </div>

      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState icon={SearchXIcon} title="Ninguna parte coincide con los filtros." />
          ) : (
            <EmptyState icon={UsersIcon} title="Sin partes interesadas." description={canManage ? "Agrega la primera." : undefined} />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borde">
            {filtered.map((p) => (
              <li key={p.id} className={`p-4 ${p.status === "archivada" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body text-texto">{p.name}</p>
                      <PartyTypeChip type={p.partyType} />
                    </div>
                    {p.requirements && <p className="mt-0.5 text-small text-texto-sec">Requisitos: {p.requirements}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-texto-sec">
                      {p.needsExpectations && <span>{p.needsExpectations}</span>}
                      {p.monitoring && <span>· Seguimiento: {p.monitoring}</span>}
                      {p.legalRequirementCode && <Link href="/app/requisitos-legales" className="font-medium text-acento hover:underline">→ {p.legalRequirementCode}</Link>}
                    </p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones de ${p.name}`}><MoreHorizontalIcon aria-hidden="true" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem className="min-h-9 text-body" onSelect={() => openEdit(p)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="min-h-9 text-body" onSelect={() => archive(p)}>
                          {p.status === "archivada" ? "Restaurar" : "Archivar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canManage && <PartySheet party={editing} processes={processes} legal={legal} open={open} onOpenChange={setOpen} />}
    </div>
  )
}
