"use client"

import { ClipboardListIcon, ExternalLinkIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { FindingTypeBadge } from "@/components/auditorias/badges"
import { FINDING_SEVERITY_LABELS, FINDING_TYPE_LABELS } from "@/components/auditorias/labels"
import { Chip } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import type { AuditFindingView, AuditStatus, FindingSeverity, FindingType } from "@/lib/types"

const TYPES = Object.keys(FINDING_TYPE_LABELS) as FindingType[]
const SEVERITIES = Object.keys(FINDING_SEVERITY_LABELS) as FindingSeverity[]

export function FindingList({
  auditId,
  findings,
  status,
  canAddFinding,
  canManage,
  processes,
}: {
  auditId: string
  findings: AuditFindingView[]
  status: AuditStatus
  canAddFinding: boolean
  canManage: boolean
  processes: { id: string; code: string }[]
}) {
  function generateNc(id: string) {
    // TODO(backend): server action generateNcFromFinding.
    toast.success("No conformidad generada desde el hallazgo.")
    void id
  }

  const canRegister = canAddFinding && status === "en_ejecucion"

  if (status === "planificada") {
    return <p className="text-small text-texto-sec">Inicia la auditoría para registrar hallazgos.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {findings.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="Aún no hay hallazgos"
          description={canRegister ? "Registra el primer hallazgo." : "El equipo auditor registrará los hallazgos."}
          action={canRegister ? <FindingSheet auditId={auditId} processes={processes} /> : undefined}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {findings.map((f) => (
              <li key={f.id} className="rounded-lg border border-borde bg-superficie p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FindingTypeBadge type={f.type} severity={f.severity} />
                  {f.processName && <Chip>{f.processName}</Chip>}
                  {f.criteriaRef && <span className="font-mono text-caption text-texto-sec">{f.criteriaRef}</span>}
                </div>
                <p className="mt-1.5 text-body">{f.description}</p>
                {f.type === "no_conformidad" && (
                  <div className="mt-2">
                    {f.nonconformityCode ? (
                      <Link
                        href={`/app/no-conformidades/${f.nonconformityCode}`}
                        className="inline-flex items-center gap-1 text-small font-medium text-acento hover:underline"
                      >
                        <ExternalLinkIcon className="size-3.5" /> {f.nonconformityCode}
                      </Link>
                    ) : (
                      canManage && (
                        <Button size="sm" variant="outline" onClick={() => generateNc(f.id)}>
                          Generar no conformidad
                        </Button>
                      )
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {canRegister && (
            <div>
              <FindingSheet auditId={auditId} processes={processes} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FindingSheet({ auditId, processes }: { auditId: string; processes: { id: string; code: string }[] }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FindingType>("observacion")
  const [process, setProcess] = useState("")
  const [description, setDescription] = useState("")
  const [criteria, setCriteria] = useState("")
  const [severity, setSeverity] = useState<FindingSeverity>("menor")

  function submit() {
    if (description.trim().length < 5) {
      toast.error("Describe el hallazgo.")
      return
    }
    // TODO(backend): server action addAuditFinding.
    toast.success("Hallazgo registrado.")
    void auditId
    setOpen(false)
    setType("observacion")
    setProcess("")
    setDescription("")
    setCriteria("")
    setSeverity("menor")
  }

  const field = "flex flex-col gap-1.5"
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon /> Registrar hallazgo
        </Button>
      </SheetTrigger>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b border-borde">
          <SheetTitle>Registrar hallazgo</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className={field}>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as FindingType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{FINDING_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {type === "no_conformidad" && (
            <div className={field}>
              <Label>Severidad</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as FindingSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{FINDING_SEVERITY_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={field}>
            <Label>Proceso (opcional)</Label>
            <Select value={process} onValueChange={setProcess}>
              <SelectTrigger><SelectValue placeholder="Proceso del hallazgo" /></SelectTrigger>
              <SelectContent>
                {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={field}>
            <Label htmlFor="find-desc">Descripción</Label>
            <Textarea id="find-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué se encontró" />
          </div>
          <div className={field}>
            <Label htmlFor="find-crit">Criterio / requisito (opcional)</Label>
            <Input id="find-crit" value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="p. ej. 7.5.3" />
          </div>
        </div>
        <SheetFooter className="border-t border-borde">
          <Button onClick={submit}>Registrar hallazgo</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
