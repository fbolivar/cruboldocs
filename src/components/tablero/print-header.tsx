import { formatDate, todayIsoDate } from "@/lib/format"

/** Encabezado solo-impresión: organización, periodo, proceso y fecha. Oculto en pantalla. */
export function PrintHeader({ organizationName, year, processName }: {
  organizationName: string
  year: number
  processName: string | null
}) {
  return (
    <div className="hidden print:block">
      <p className="font-display text-h3 text-texto">{organizationName}</p>
      <p className="text-small text-texto-sec">
        Tablero del SGC · Periodo {year} · Proceso: {processName ?? "Todos"} · Generado {formatDate(todayIsoDate())}
      </p>
      <hr className="my-3 border-borde" />
    </div>
  )
}
