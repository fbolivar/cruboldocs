import { EnrollmentBadge } from "@/components/capacitacion/badges"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/format"
import { UsersIcon } from "lucide-react"
import type { CourseEnrollmentView } from "@/lib/types"

export function CourseResults({ enrollments }: { enrollments: CourseEnrollmentView[] }) {
  if (enrollments.length === 0) {
    return <EmptyState icon={UsersIcon} title="Aún nadie ha tomado el curso." />
  }
  return (
    <ul className="divide-y divide-borde">
      {enrollments.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="min-w-0">
            <p className="text-body">{e.userName}</p>
            <p className="text-caption text-texto-sec">{formatDate(e.completedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display tabular-nums text-body text-texto">{e.score}%</span>
            <EnrollmentBadge status={e.status} />
          </div>
        </li>
      ))}
    </ul>
  )
}
