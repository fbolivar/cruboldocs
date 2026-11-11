import type { ReactNode } from "react"

import { PrintBar } from "@/components/informes/print-bar"
import { LogoHex } from "@/components/ui/logo-hex"
import { formatDate, todayIsoDate } from "@/lib/format"

/** Contenedor de un informe imprimible: barra (oculta al imprimir) + hoja A4 + encabezado común. */
export function ReportShell({
  backHref, organizationName, title, code, emittedBy, children,
}: {
  backHref: string
  organizationName: string
  title: string
  code?: string
  emittedBy: string
  children: ReactNode
}) {
  const today = formatDate(todayIsoDate())
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <PrintBar backHref={backHref} />
      <article className="rounded-md border border-borde bg-superficie p-6 print:rounded-none print:border-0 print:p-0 print:text-black">
        <header className="mb-5 border-b border-borde pb-4">
          <div className="mb-2 flex items-center gap-2 text-texto-sec">
            <LogoHex className="size-5" />
            <span className="text-small font-medium">CrubolDocs · {organizationName}</span>
          </div>
          <h1 className="text-h2 text-texto">{title}</h1>
          <p className="mt-1 text-caption text-texto-sec">
            {code ? <>Código <span className="font-mono">{code}</span> · </> : null}
            Emitido: {today} · Emitido por: {emittedBy}
          </p>
        </header>
        {children}
        <footer className="mt-6 hidden border-t border-borde pt-3 text-caption text-texto-sec print:block">
          CrubolDocs · documento generado el {today}
        </footer>
      </article>
    </div>
  )
}

export function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="mb-2 text-caption font-semibold uppercase tracking-wide text-texto-sec">{title}</h2>
      {children}
    </section>
  )
}

/** Par etiqueta/valor para los datos del informe. */
export function ReportField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-small font-medium text-texto-sec">{label}</dt>
      <dd className="whitespace-pre-wrap text-body text-texto">{value || "—"}</dd>
    </div>
  )
}

/** Tabla simple del informe. Columns: encabezados; rows: celdas ya formateadas. */
export function ReportTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  if (rows.length === 0) return <p className="text-small text-texto-sec">Sin registros.</p>
  return (
    <table className="w-full border-collapse text-left text-small">
      <thead>
        <tr className="border-b border-borde">
          {columns.map((c) => <th key={c} className="py-1.5 pr-3 font-medium text-texto-sec">{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="break-inside-avoid border-b border-borde/60">
            {r.map((cell, j) => <td key={j} className="py-1.5 pr-3 align-top text-texto">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
