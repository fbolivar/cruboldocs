"use client"

import { ChevronDownIcon, CopyIcon } from "lucide-react"
import { Collapsible } from "radix-ui"
import type * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate, shortHash } from "@/lib/format"
import type { DocumentDetail, DocumentVersion } from "@/lib/types"

interface MetaListProps {
  doc: DocumentDetail
  version: DocumentVersion
}

function Items({ doc, version }: MetaListProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(version.pdfSha256)
      toast.success("Hash copiado")
    } catch {
      toast.error("No pudimos copiar el hash. Selecciónalo y cópialo manualmente.")
    }
  }

  const rows: [string, React.ReactNode][] = [
    ["Proceso", doc.processName],
    ["Tipo", `${doc.typeName} (${doc.typeCode})`],
    ["Elabora", doc.elaboradorPositionName],
    ["Revisa", doc.revisorPositionName],
    ["Aprueba", doc.aprobadorPositionName],
    [
      "Revisión periódica",
      `Cada ${doc.reviewEveryMonths} meses${doc.nextReviewDate ? ` · próxima ${formatDate(doc.nextReviewDate)}` : ""}`,
    ],
    [
      "Distribución",
      `${doc.distributionCount} cargos${doc.readRequired ? " · requiere confirmar lectura" : ""}`,
    ],
    ["Elaborada por", version.elaboratedBy.fullName],
    ["Fecha de vigencia", version.effectiveDate ? formatDate(version.effectiveDate) : "Aún no está vigente"],
    [
      "Hash del PDF (SHA-256)",
      <span key="hash" className="flex items-center gap-1">
        <span className="font-mono" title={version.pdfSha256}>
          {shortHash(version.pdfSha256)}
        </span>
        <Button variant="ghost" size="icon" className="md:size-8" aria-label="Copiar hash del PDF" onClick={copy}>
          <CopyIcon aria-hidden="true" />
        </Button>
      </span>,
    ],
  ]

  return (
    <dl className="flex flex-col gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-small text-texto-sec">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Detalles: columna de 320px en escritorio; acordeón cerrado en móvil. */
export function MetaList(props: MetaListProps) {
  return (
    <>
      <Card className="hidden w-80 shrink-0 self-start p-6 md:block">
        <h2 className="mb-4 font-display text-h3">Detalles</h2>
        <Items {...props} />
      </Card>
      <Collapsible.Root className="rounded-md border border-borde bg-superficie md:hidden">
        <h2>
          <Collapsible.Trigger className="group flex min-h-11 w-full items-center justify-between px-4 py-3 text-left font-display text-h3">
            Detalles
            <ChevronDownIcon className="size-5 text-texto-sec transition-transform duration-150 group-data-open:rotate-180" aria-hidden="true" />
          </Collapsible.Trigger>
        </h2>
        <Collapsible.Content className="border-t border-borde px-4 py-4">
          <Items {...props} />
        </Collapsible.Content>
      </Collapsible.Root>
    </>
  )
}
