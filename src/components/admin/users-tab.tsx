import { SearchXIcon, UsersIcon } from "lucide-react"

import { InviteSheet } from "@/components/admin/invite-sheet"
import { TabError, TabToolbar } from "@/components/admin/tab-layout"
import { ClearFiltersButton, UsersFilters } from "@/components/admin/users-filters"
import { UsersTable } from "@/components/admin/users-table"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { listMembers, listPositions } from "@/lib/data/queries"
import { param, type SearchParams } from "@/lib/url"
import type { Member, Position } from "@/lib/types"

function filterMembers(members: Member[], sp: SearchParams): Member[] {
  const q = param(sp, "q")?.trim().toLocaleLowerCase("es")
  const status = param(sp, "estado")
  const externalOnly = param(sp, "externos") === "1"
  return members.filter(
    (m) =>
      (!q || m.email.toLocaleLowerCase("es").includes(q) || (m.fullName ?? "").toLocaleLowerCase("es").includes(q)) &&
      (!status || m.status === status) &&
      (!externalOnly || m.isExternal)
  )
}

export async function UsersTab({ sp }: { sp: SearchParams }) {
  let members: Member[]
  let positions: Position[]
  try {
    ;[members, positions] = await Promise.all([listMembers(), listPositions()])
  } catch {
    return <TabError />
  }
  const options = positions.map((p) => ({ value: p.id, label: p.name }))

  if (members.length === 0) {
    return (
      <Card>
        <EmptyState icon={UsersIcon} title="Aún no has invitado usuarios." action={<InviteSheet positions={options} />} />
      </Card>
    )
  }

  const rows = filterMembers(members, sp)
  return (
    <div className="flex flex-col gap-4">
      <TabToolbar action={<InviteSheet positions={options} />}>
        <UsersFilters />
      </TabToolbar>
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={SearchXIcon} title="Ningún usuario coincide con los filtros." action={<ClearFiltersButton keys={["q", "estado", "externos"]} />} />
        </Card>
      ) : (
        <UsersTable rows={rows} positions={options} />
      )}
    </div>
  )
}
