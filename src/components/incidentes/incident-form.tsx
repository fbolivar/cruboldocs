"use client"

import { INCIDENT_KIND_LABELS, SEVERITY_LABELS } from "@/components/incidentes/labels"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { IncidentKind, IncidentSeverity } from "@/lib/types"

export type Option = { id: string; name: string }

export interface IncidentFormState {
  kind: IncidentKind
  occurredAt: string
  location: string
  processId: string
  hazardId: string
  description: string
  immediateAction: string
  severity: IncidentSeverity
  affectedName: string
  affectedDocument: string
  affectedPositionId: string
  injury: string
  bodyPart: string
  lostDays: string
}

const KINDS = Object.keys(INCIDENT_KIND_LABELS) as IncidentKind[]
const SEVS = Object.keys(SEVERITY_LABELS) as IncidentSeverity[]
const field = "flex flex-col gap-1.5"

/** Payload para reportIncident/updateIncident a partir del estado del formulario. */
export function incidentPayload(s: IncidentFormState) {
  return {
    kind: s.kind, occurredAt: s.occurredAt, location: s.location.trim() || null,
    processId: s.processId || null, hazardId: s.hazardId || null,
    description: s.description, immediateAction: s.immediateAction.trim() || null, severity: s.severity,
    affectedName: s.affectedName.trim() || null, affectedDocument: s.affectedDocument.trim() || null,
    affectedPositionId: s.affectedPositionId || null, injury: s.injury.trim() || null,
    bodyPart: s.bodyPart.trim() || null, lostDays: s.lostDays.trim() ? Number(s.lostDays) : null,
  }
}

export function IncidentFields({
  state, set, processes, hazards, positions,
}: {
  state: IncidentFormState
  set: <K extends keyof IncidentFormState>(k: K, v: IncidentFormState[K]) => void
  processes: Option[]
  hazards: Option[]
  positions: Option[]
}) {
  const dateInput = "h-11 rounded-md border border-borde-fuerte bg-superficie px-3 text-body md:h-9"
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <Label>Tipo</Label>
          <Select value={state.kind} onValueChange={(v) => set("kind", v as IncidentKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{INCIDENT_KIND_LABELS[k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={field}>
          <Label>Severidad</Label>
          <Select value={state.severity} onValueChange={(v) => set("severity", v as IncidentSeverity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVS.map((s) => <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <Label htmlFor="inc-when">Fecha y hora</Label>
          <input id="inc-when" type="datetime-local" value={state.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} className={dateInput} />
        </div>
        <div className={field}>
          <Label htmlFor="inc-loc">Lugar</Label>
          <Input id="inc-loc" value={state.location} onChange={(e) => set("location", e.target.value)} placeholder="Área / sede" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <Label>Proceso (opcional)</Label>
          <Select value={state.processId} onValueChange={(v) => set("processId", v)}>
            <SelectTrigger><SelectValue placeholder="Proceso" /></SelectTrigger>
            <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={field}>
          <Label>Peligro asociado (opcional)</Label>
          <Select value={state.hazardId} onValueChange={(v) => set("hazardId", v)}>
            <SelectTrigger><SelectValue placeholder="Peligro SST" /></SelectTrigger>
            <SelectContent>
              {hazards.length === 0
                ? <SelectItem value="none" disabled>(sin peligros)</SelectItem>
                : hazards.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className={field}>
        <Label htmlFor="inc-desc">¿Qué pasó?</Label>
        <Textarea id="inc-desc" rows={3} value={state.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe la ocurrencia" />
      </div>
      <div className={field}>
        <Label htmlFor="inc-imm">Acción inmediata (opcional)</Label>
        <Textarea id="inc-imm" rows={2} value={state.immediateAction} onChange={(e) => set("immediateAction", e.target.value)} placeholder="Qué se hizo de inmediato" />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-borde p-3">
        <p className="rounded-md bg-advertencia-suave p-2 text-caption text-advertencia-texto">
          Dato de salud sensible: registra solo lo mínimo. No incluyas diagnósticos médicos.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}>
            <Label htmlFor="inc-an">Trabajador (nombre)</Label>
            <Input id="inc-an" value={state.affectedName} onChange={(e) => set("affectedName", e.target.value)} placeholder="Nombre" />
          </div>
          <div className={field}>
            <Label htmlFor="inc-ad">Documento (opcional)</Label>
            <Input id="inc-ad" value={state.affectedDocument} onChange={(e) => set("affectedDocument", e.target.value)} placeholder="C.C." />
          </div>
        </div>
        <div className={field}>
          <Label>Cargo (opcional)</Label>
          <Select value={state.affectedPositionId} onValueChange={(v) => set("affectedPositionId", v)}>
            <SelectTrigger><SelectValue placeholder="Cargo del trabajador" /></SelectTrigger>
            <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className={field}>
            <Label htmlFor="inc-inj">Lesión</Label>
            <Input id="inc-inj" value={state.injury} onChange={(e) => set("injury", e.target.value)} placeholder="Tipo" />
          </div>
          <div className={field}>
            <Label htmlFor="inc-bp">Parte del cuerpo</Label>
            <Input id="inc-bp" value={state.bodyPart} onChange={(e) => set("bodyPart", e.target.value)} />
          </div>
          <div className={field}>
            <Label htmlFor="inc-ld">Días perdidos</Label>
            <Input id="inc-ld" inputMode="numeric" value={state.lostDays} onChange={(e) => set("lostDays", e.target.value)} />
          </div>
        </div>
      </div>
    </>
  )
}
