import { FileStackIcon } from "lucide-react"

import { DocTypeSheet } from "@/components/admin/doc-type-sheet"
import { DataCard, ResultCount, TabError, TabToolbar } from "@/components/admin/tab-layout"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { listDocumentTypes } from "@/lib/data/queries"
import type { DocumentType } from "@/lib/types"

export async function DocTypesTab() {
  let types: DocumentType[]
  try {
    types = await listDocumentTypes()
  } catch {
    return <TabError />
  }

  if (types.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FileStackIcon}
          title="Aún no has creado tipos de documento."
          description="Por ejemplo: Manual (MA), Procedimiento (PR), Formato (FO)."
          action={<DocTypeSheet />}
        />
      </Card>
    )
  }

  const count = (n: number) => `${n} ${n === 1 ? "documento" : "documentos"}`
  return (
    <div className="flex flex-col gap-4">
      <TabToolbar action={<DocTypeSheet />}>
        <ResultCount count={types.length} singular="tipo" plural="tipos" />
      </TabToolbar>
      <DataCard
        className="max-w-3xl"
        table={
          <Table>
            <caption className="sr-only">Tipos de documento</caption>
            <THead>
              <tr>
                <Th className="w-24">Código</Th>
                <Th>Nombre</Th>
                <Th className="text-right">Nº documentos</Th>
                <Th className="w-16"><span className="sr-only">Acciones</span></Th>
              </tr>
            </THead>
            <tbody>
              {types.map((t) => (
                <Tr key={t.id} className="hover:bg-superficie-alt">
                  <Td className="font-mono">{t.code}</Td>
                  <Td className="font-medium">{t.name}</Td>
                  <Td className="text-right tabular-nums">{t.documentCount}</Td>
                  <Td className="py-1 text-right">
                    <DocTypeSheet docType={t} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        }
        cards={types.map((t) => (
          <li key={t.id} className="flex items-center gap-2 py-2 pr-1 pl-4">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">
                <span className="font-mono text-texto-sec">{t.code}</span> {t.name}
              </span>
              <span className="text-small text-texto-sec">{count(t.documentCount)}</span>
            </div>
            <DocTypeSheet docType={t} compact />
          </li>
        ))}
      />
    </div>
  )
}
