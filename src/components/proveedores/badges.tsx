import {
  CRITICALITY_LABELS,
  KIND_LABELS,
  RESULT_LABELS,
  RESULT_TONE,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_STATUS_TONE,
} from "@/components/proveedores/labels"
import { Badge, Chip } from "@/components/ui/badge"
import type { EvaluationResult, SupplierCriticality, SupplierKind, SupplierStatus } from "@/lib/types"

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  return <Badge tone={SUPPLIER_STATUS_TONE[status]}>{SUPPLIER_STATUS_LABELS[status]}</Badge>
}

export function ResultBadge({ result }: { result: EvaluationResult }) {
  return <Badge tone={RESULT_TONE[result]}>{RESULT_LABELS[result]}</Badge>
}

export function CriticalityChip({ criticality }: { criticality: SupplierCriticality }) {
  // La criticidad alta se resalta; media/baja neutras (el estado manda el color de la fila).
  return criticality === "alta"
    ? <Badge tone="advertencia" plain>{CRITICALITY_LABELS.alta}</Badge>
    : <Chip>{CRITICALITY_LABELS[criticality]}</Chip>
}

export function SupplierKindChip({ kind }: { kind: SupplierKind }) {
  return <Chip>{KIND_LABELS[kind]}</Chip>
}
