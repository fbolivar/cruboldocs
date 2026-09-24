// Exportación CSV UTF-8 con BOM para que Excel respete tildes y ñ (decisión de arquitectura).

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null
}

function escapeCell(v: string | number | null): string {
  if (v === null) return ""
  const s = String(v)
  // Evita inyección de fórmulas al abrir en Excel.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Separador `;`: es el que Excel espera con configuración regional es-CO. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeCell(c.header)).join(";")]
  for (const row of rows) lines.push(columns.map((c) => escapeCell(c.value(row))).join(";"))
  return "﻿" + lines.join("\r\n")
}

/** Descarga en el navegador. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
