import { MEMBER_STATUS_META } from "@/components/admin/labels"
import { MemberActions } from "@/components/admin/member-actions"
import type { Option } from "@/components/admin/option-select"
import { DataCard } from "@/components/admin/tab-layout"
import { Badge, Chip } from "@/components/ui/badge"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { Member } from "@/lib/types"
import { cn } from "@/lib/utils"

function validity(m: Member): string | null {
  if (!m.validUntil) return null
  return m.status === "vencido" ? `Venció ${formatDate(m.validUntil)}` : `Hasta ${formatDate(m.validUntil)}`
}

/** Vencido o revocado: fila atenuada con texto secundario (sin opacidad, conserva contraste AA). */
const dimmed = (m: Member) => m.status === "vencido" || m.status === "revocado"

function StatusBadge({ m }: { m: Member }) {
  const meta = MEMBER_STATUS_META[m.status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

function NameCell({ m }: { m: Member }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={cn("truncate", !m.fullName && "text-texto-sec")}>{m.fullName ?? m.email}</span>
      <span className="truncate text-small text-texto-sec">
        {m.fullName ? m.email : m.invitedAt ? `Invitación enviada el ${formatDate(m.invitedAt)}` : "Invitación pendiente"}
      </span>
    </div>
  )
}

export function UsersTable({ rows, positions }: { rows: Member[]; positions: Option[] }) {
  return (
    <DataCard
      table={
        <Table>
          <caption className="sr-only">Usuarios de la organización</caption>
          <THead>
            <tr>
              <Th>Nombre</Th>
              <Th>Cargo</Th>
              <Th>Tipo</Th>
              <Th>Vigencia</Th>
              <Th>Estado</Th>
              <Th className="w-14">
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((m) => (
              <Tr key={m.membershipId} className={cn("hover:bg-superficie-alt", dimmed(m) && "text-texto-sec")}>
                <Td>
                  <NameCell m={m} />
                </Td>
                <Td>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {m.positionName}
                    {m.isOrgAdmin && <Chip>Admin</Chip>}
                  </span>
                </Td>
                <Td>{m.isExternal ? "Externo" : "Interno"}</Td>
                <Td className="whitespace-nowrap">{validity(m) ?? <span className="text-texto-sec">—</span>}</Td>
                <Td>
                  <StatusBadge m={m} />
                </Td>
                <Td className="py-1 text-right">
                  <MemberActions member={m} positions={positions} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      }
      cards={rows.map((m) => (
        <li key={m.membershipId} className={cn("flex items-start gap-2 py-3 pr-1 pl-4", dimmed(m) && "text-texto-sec")}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("truncate font-medium", !m.fullName && "font-normal text-texto-sec")}>{m.fullName ?? m.email}</span>
              <StatusBadge m={m} />
            </div>
            <span className="text-small text-texto-sec">
              {[m.positionName, m.isOrgAdmin ? "Admin" : null, validity(m)?.toLocaleLowerCase("es")].filter(Boolean).join(" · ")}
            </span>
          </div>
          <MemberActions member={m} positions={positions} />
        </li>
      ))}
    />
  )
}
