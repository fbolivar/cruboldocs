"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { VersionStatusBadge } from "@/components/documentos/status-badge"
import { Table, Td, Th, THead, Tr } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { DocumentVersion } from "@/lib/types"
import { cn } from "@/lib/utils"

interface VersionTableProps {
  versions: DocumentVersion[]
  selectedNo: number
  hrefFor: (versionNo: number) => string
}

/** Historial de versiones; clic muestra esa versión en el visor (`?v=`). Tabla en escritorio, lista en móvil. */
export function VersionTable({ versions, selectedNo, hrefFor }: VersionTableProps) {
  const router = useRouter()
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <Th>Versión</Th>
              <Th>Estado</Th>
              <Th>Resumen del cambio</Th>
              <Th>Aprobada por</Th>
              <Th>Fecha de vigencia</Th>
            </tr>
          </THead>
          <tbody>
            {versions.map((v) => {
              const selected = v.versionNo === selectedNo
              return (
                <Tr
                  key={v.id}
                  aria-current={selected || undefined}
                  className={cn("cursor-pointer hover:bg-fondo", selected && "bg-acento-suave hover:bg-acento-suave")}
                  onClick={() => router.push(hrefFor(v.versionNo))}
                >
                  <Td className="font-mono">
                    <Link href={hrefFor(v.versionNo)} className="text-acento hover:underline" onClick={(e) => e.stopPropagation()}>
                      v{v.versionNo}
                      {selected && <span className="sr-only"> (mostrada en el visor)</span>}
                    </Link>
                  </Td>
                  <Td>
                    <VersionStatusBadge status={v.status} />
                  </Td>
                  <Td className="max-w-md">{v.changeSummary}</Td>
                  <Td className="whitespace-nowrap">{v.approvedBy?.fullName ?? "—"}</Td>
                  <Td className="whitespace-nowrap">{v.effectiveDate ? formatDate(v.effectiveDate) : "—"}</Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {versions.map((v) => (
          <li key={v.id}>
            <Link
              href={hrefFor(v.versionNo)}
              aria-current={v.versionNo === selectedNo || undefined}
              className={cn(
                "flex flex-col gap-1 rounded-md border border-borde px-4 py-3",
                v.versionNo === selectedNo && "border-acento bg-acento-suave"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono">v{v.versionNo}</span>
                <VersionStatusBadge status={v.status} />
              </span>
              <span>{v.changeSummary}</span>
              <span className="text-small text-texto-sec">
                {v.approvedBy ? `Aprobada por ${v.approvedBy.fullName}` : "Sin aprobar"}
                {v.effectiveDate && ` · vigente desde ${formatDate(v.effectiveDate)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
