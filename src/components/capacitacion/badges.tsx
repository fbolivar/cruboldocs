import { COURSE_STATUS_LABELS, COURSE_STATUS_TONE, ENROLLMENT_LABELS, ENROLLMENT_TONE } from "@/components/capacitacion/labels"
import { Badge } from "@/components/ui/badge"
import type { CourseStatus } from "@/lib/types"

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <Badge tone={COURSE_STATUS_TONE[status]}>{COURSE_STATUS_LABELS[status]}</Badge>
}

export function EnrollmentBadge({ status }: { status: "aprobado" | "no_aprobado" }) {
  return <Badge tone={ENROLLMENT_TONE[status]}>{ENROLLMENT_LABELS[status]}</Badge>
}
