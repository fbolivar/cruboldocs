import { Badge } from "@/components/ui/badge"
import type { ImportResult } from "@/lib/types"

/** Informe por fila de una importación (previsualización o resultado). */
export function ImportPreviewTable({ result }: { result: ImportResult }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-small">
        {result.committed ? (
          <>
            <Badge tone="exito">{result.created} creadas</Badge>
            {result.errors > 0 && <Badge tone="error">{result.errors} omitidas</Badge>}
          </>
        ) : (
          <>
            <Badge tone="exito">{result.valid} se crearán</Badge>
            {result.errors > 0 && <Badge tone="error">{result.errors} con error</Badge>}
          </>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border border-borde">
        <table className="w-full min-w-[420px] text-small">
          <thead>
            <tr className="border-b border-borde bg-superficie-alt text-left text-caption text-texto-sec">
              <th className="px-3 py-2 font-medium">Fila</th>
              <th className="px-3 py-2 font-medium">Registro</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.line} className="border-b border-borde last:border-0">
                <td className="px-3 py-2 tabular-nums text-texto-sec">{r.line}</td>
                <td className="px-3 py-2">{r.summary || "—"}</td>
                <td className="px-3 py-2">
                  {r.ok
                    ? <Badge tone="exito">{result.committed ? "Creada" : "Se creará"}</Badge>
                    : <span className="text-error-texto">{r.error}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
