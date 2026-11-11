import { AuditTab } from "@/components/admin/audit-tab"
import { DocTypesTab } from "@/components/admin/doc-types-tab"
import { NormasTab } from "@/components/admin/normas-tab"
import { OrgsTab } from "@/components/admin/orgs-tab"
import { PositionsTab } from "@/components/admin/positions-tab"
import { ProcessesTab } from "@/components/admin/processes-tab"
import { RecertTab } from "@/components/admin/recert-tab"
import { UsersTab } from "@/components/admin/users-tab"
import type { AdminTab } from "@/lib/domain/access"
import type { SearchParams } from "@/lib/url"

/** Renderiza solo la pestaña activa; cada una maneja su propio error. */
export function AdminTabContent({ tab, sp }: { tab: AdminTab; sp: SearchParams }) {
  switch (tab) {
    case "usuarios":
      return <UsersTab sp={sp} />
    case "cargos":
      return <PositionsTab sp={sp} />
    case "procesos":
      return <ProcessesTab />
    case "tipos":
      return <DocTypesTab />
    case "normas":
      return <NormasTab />
    case "recertificacion":
      return <RecertTab />
    case "auditoria":
      return <AuditTab sp={sp} />
    case "organizaciones":
      return <OrgsTab />
  }
}
