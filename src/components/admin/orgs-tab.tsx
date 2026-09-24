import { Building2Icon } from "lucide-react"

import { ORG_STATUS_META } from "@/components/admin/labels"
import { OrgSheet } from "@/components/admin/org-sheet"
import { ResendAdminInvite } from "@/components/admin/resend-admin-invite"
import { DataCard, ResultCount, TabError, TabToolbar } from "@/components/admin/tab-layout"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { listOrganizations } from "@/lib/data/queries"
import { formatDate } from "@/lib/format"
import type { Organization } from "@/lib/types"

function StatusBadge({ org }: { org: Organization }) {
  const meta = ORG_STATUS_META[org.status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

/** Solo Superadmin: organizaciones de la plataforma (sin acceso al contenido de sus documentos). */
export async function OrgsTab() {
  let orgs: Organization[]
  try {
    orgs = await listOrganizations()
  } catch {
    return <TabError />
  }

  if (orgs.length === 0) {
    return (
      <Card>
        <EmptyState icon={Building2Icon} title="Aún no hay organizaciones." action={<OrgSheet />} />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <TabToolbar action={<OrgSheet />}>
        <ResultCount count={orgs.length} singular="organización" plural="organizaciones" />
      </TabToolbar>
      <DataCard
        table={
          <Table>
            <caption className="sr-only">Organizaciones de la plataforma</caption>
            <THead>
              <tr>
                <Th>Nombre</Th>
                <Th>NIT</Th>
                <Th>Estado</Th>
                <Th className="text-right">Usuarios</Th>
                <Th>Creada</Th>
              </tr>
            </THead>
            <tbody>
              {orgs.map((o) => (
                <Tr key={o.id} className="hover:bg-superficie-alt">
                  <Td className="font-medium">{o.name}</Td>
                  <Td className="font-mono">{o.nit}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge org={o} />
                      {o.pendingAdminInvitationId && <ResendAdminInvite invitationId={o.pendingAdminInvitationId} orgName={o.name} />}
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">{o.userCount}</Td>
                  <Td className="tabular-nums">{formatDate(o.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        }
        cards={orgs.map((o) => (
          <li key={o.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{o.name}</span>
              <StatusBadge org={o} />
            </div>
            <span className="text-small text-texto-sec">
              NIT <span className="font-mono">{o.nit}</span> · {o.userCount} usuarios
            </span>
            {o.pendingAdminInvitationId && <ResendAdminInvite invitationId={o.pendingAdminInvitationId} orgName={o.name} />}
          </li>
        ))}
      />
    </div>
  )
}
