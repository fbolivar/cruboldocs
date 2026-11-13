import {
  INCIDENT_KIND_LABELS, INCIDENT_KIND_TONE, INCIDENT_STATUS_LABELS, INCIDENT_STATUS_TONE,
  SEVERITY_LABELS, SEVERITY_TONE,
} from "@/components/incidentes/labels"
import { Badge } from "@/components/ui/badge"
import type { IncidentKind, IncidentSeverity, IncidentStatus } from "@/lib/types"

export function IncidentKindChip({ kind }: { kind: IncidentKind }) {
  return <Badge tone={INCIDENT_KIND_TONE[kind]}>{INCIDENT_KIND_LABELS[kind]}</Badge>
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABELS[severity]}</Badge>
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={INCIDENT_STATUS_TONE[status]}>{INCIDENT_STATUS_LABELS[status]}</Badge>
}
