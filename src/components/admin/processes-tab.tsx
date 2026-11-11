import { NetworkIcon } from "lucide-react"

import { PROCESS_TYPE_LABELS } from "@/components/admin/labels"
import { ProcessActions } from "@/components/admin/process-actions"
import { CreateProcessButton } from "@/components/admin/process-sheet"
import { DataCard, ResultCount, TabError, TabToolbar } from "@/components/admin/tab-layout"
import { NormCell } from "@/components/multinorma/norm-cell"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { getCurrentUser, listActiveNorms, listEntityNormsFor, listPositions, listProcesses } from "@/lib/data/queries"
import { canTagNorms } from "@/lib/domain/access"
import type { NormOption, Position, Process } from "@/lib/types"

export async function ProcessesTab() {
  let processes: Process[]
  let positions: Position[]
  let norms: NormOption[]
  let tags: Map<string, NormOption[]>
  const user = await getCurrentUser()
  try {
    ;[processes, positions, norms, tags] = await Promise.all([listProcesses(), listPositions(), listActiveNorms(), listEntityNormsFor("proceso")])
  } catch {
    return <TabError />
  }
  const leaders = positions.map((p) => ({ value: p.id, label: p.name }))
  const canTag = canTagNorms(user)
  const showNorms = norms.length > 0

  if (processes.length === 0) {
    return (
      <Card>
        <EmptyState icon={NetworkIcon} title="Crea los procesos de tu mapa." action={<CreateProcessButton positions={leaders} />} />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <TabToolbar action={<CreateProcessButton positions={leaders} />}>
        <ResultCount count={processes.length} singular="proceso" plural="procesos" />
      </TabToolbar>
      <DataCard
        table={
          <Table>
            <caption className="sr-only">Procesos de la organización</caption>
            <THead>
              <tr>
                <Th className="w-24">Código</Th>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Cargo líder</Th>
                {showNorms && <Th>Normas</Th>}
                <Th className="text-right">Nº documentos</Th>
                <Th className="w-28"><span className="sr-only">Acciones</span></Th>
              </tr>
            </THead>
            <tbody>
              {processes.map((p) => (
                <Tr key={p.id} className="hover:bg-superficie-alt">
                  <Td className="font-mono">{p.code}</Td>
                  <Td className="font-medium">{p.name}</Td>
                  <Td>{PROCESS_TYPE_LABELS[p.type]}</Td>
                  <Td>{p.leaderPositionName ?? <span className="text-texto-sec">Sin asignar</span>}</Td>
                  {showNorms && <Td><NormCell entityType="proceso" entityId={p.id} allNorms={norms} tagged={tags.get(p.id) ?? []} canManage={canTag} /></Td>}
                  <Td className="text-right tabular-nums">{p.documentCount}</Td>
                  <Td className="py-1 text-right">
                    <ProcessActions process={p} positions={leaders} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        }
        cards={processes.map((p) => (
          <li key={p.id} className="flex items-start gap-2 py-3 pr-1 pl-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">
                <span className="font-mono text-texto-sec">{p.code}</span> {p.name}
              </span>
              <span className="text-small text-texto-sec">
                {PROCESS_TYPE_LABELS[p.type]} · {p.leaderPositionName ?? "Sin líder"}
              </span>
              <span className="text-small text-texto-sec">
                {p.documentCount} {p.documentCount === 1 ? "documento" : "documentos"}
              </span>
              {showNorms && <NormCell entityType="proceso" entityId={p.id} allNorms={norms} tagged={tags.get(p.id) ?? []} canManage={canTag} />}
            </div>
            <ProcessActions process={p} positions={leaders} compact />
          </li>
        ))}
      />
    </div>
  )
}
