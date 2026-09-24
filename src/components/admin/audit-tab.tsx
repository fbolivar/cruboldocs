import { ScrollTextIcon, SearchXIcon } from "lucide-react"

import { AuditFilters } from "@/components/admin/audit-filters"
import { AuditTable } from "@/components/admin/audit-table"
import { auditActionLabel } from "@/components/admin/labels"
import { TabError } from "@/components/admin/tab-layout"
import { ClearFiltersButton } from "@/components/admin/users-filters"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { listAuditLog } from "@/lib/data/queries"
import { param, type SearchParams } from "@/lib/url"
import type { AuditEntry, AuditFilters as Filters } from "@/lib/types"

const FILTER_KEYS = ["desde", "hasta", "usuario", "accion", "entidad"]
const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"))

/** Bitácora de auditoría: solo lectura, filtros en la URL y exportación CSV. */
export async function AuditTab({ sp }: { sp: SearchParams }) {
  const filters: Filters = {
    from: param(sp, "desde"),
    to: param(sp, "hasta"),
    actor: param(sp, "usuario"),
    action: param(sp, "accion"),
    entityType: param(sp, "entidad"),
  }
  let all: AuditEntry[]
  let rows: AuditEntry[]
  try {
    ;[all, rows] = await Promise.all([listAuditLog({}), listAuditLog(filters)])
  } catch {
    return <TabError />
  }

  if (all.length === 0) {
    return (
      <Card>
        <EmptyState icon={ScrollTextIcon} title="Aún no hay eventos de auditoría." description="Aquí verás quién hizo qué y cuándo en tu organización." />
      </Card>
    )
  }

  const options = {
    actors: unique(all.map((e) => e.actorName)).map((v) => ({ value: v, label: v })),
    actions: unique(all.map((e) => e.action)).map((v) => ({ value: v, label: auditActionLabel(v) })),
    entities: unique(all.map((e) => e.entityType)).map((v) => ({ value: v, label: v })),
  }

  return (
    <div className="flex flex-col gap-4">
      <AuditFilters filters={filters} options={options} count={rows.length} />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={SearchXIcon} title="Ningún evento coincide con los filtros." action={<ClearFiltersButton keys={FILTER_KEYS} />} />
        </Card>
      ) : (
        <AuditTable rows={rows} />
      )}
    </div>
  )
}
