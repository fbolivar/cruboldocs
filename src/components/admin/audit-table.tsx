import { DiffSheet } from "@/components/admin/diff-sheet"
import { auditActionLabel } from "@/components/admin/labels"
import { DataCard } from "@/components/admin/tab-layout"
import { Chip } from "@/components/ui/badge"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import type { AuditEntry } from "@/lib/types"

export function AuditTable({ rows }: { rows: AuditEntry[] }) {
  return (
    <DataCard
      table={
        <Table>
          <caption className="sr-only">Eventos de auditoría, del más reciente al más antiguo</caption>
          <THead>
            <tr>
              <Th className="w-40">Fecha y hora</Th>
              <Th>Actor</Th>
              <Th>Acción</Th>
              <Th>Entidad / registro</Th>
              <Th className="w-36">
                <span className="sr-only">Detalle</span>
              </Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id} className="hover:bg-superficie-alt">
                <Td className="whitespace-nowrap tabular-nums">{formatDateTime(e.at)}</Td>
                <Td>{e.actorName}</Td>
                <Td>
                  <Chip>{auditActionLabel(e.action)}</Chip>
                </Td>
                <Td>
                  <span className="text-texto-sec">{e.entityType}</span> · <span className="font-mono">{e.entityLabel}</span>
                </Td>
                <Td className="py-1 text-right">
                  <DiffSheet entry={e} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      }
      cards={rows.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{e.actorName}</span>
            <span className="text-small text-texto-sec tabular-nums">{formatDateTime(e.at)}</span>
          </div>
          <span className="text-small">
            {auditActionLabel(e.action)} · <span className="text-texto-sec">{e.entityType}</span> <span className="font-mono">{e.entityLabel}</span>
          </span>
          <DiffSheet entry={e} className="-ml-3 self-start" />
        </li>
      ))}
    />
  )
}
