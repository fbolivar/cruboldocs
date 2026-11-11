import { CALIBRATION_RESULT_LABELS, CALIBRATION_RESULT_TONE, EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_TONE } from "@/components/metrologia/labels"
import { Badge } from "@/components/ui/badge"
import type { CalibrationResult, EffectiveEquipmentStatus } from "@/lib/types"

export function EquipmentStatusBadge({ status }: { status: EffectiveEquipmentStatus }) {
  return <Badge tone={EQUIPMENT_STATUS_TONE[status]}>{EQUIPMENT_STATUS_LABELS[status]}</Badge>
}

export function CalibrationResultBadge({ result }: { result: CalibrationResult }) {
  return <Badge tone={CALIBRATION_RESULT_TONE[result]} plain>{CALIBRATION_RESULT_LABELS[result]}</Badge>
}
