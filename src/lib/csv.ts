// Exportación e importación CSV UTF-8 con BOM para que Excel respete tildes y ñ (decisión de arquitectura).

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

/** Límite de filas de una importación CSV (sin contar la cabecera). */
export const CSV_IMPORT_MAX_ROWS = 1000

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Parser CSV mínimo (sin dependencia): detecta separador `;` o `,` por la cabecera, respeta comillas
 * dobles (con `""` escapado) y CRLF/LF, quita el BOM. Devuelve filas como objetos por cabecera.
 * Ignora filas totalmente vacías. Lanza si no hay cabecera o si excede el límite de filas.
 */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, "")
  // Separador: el que más aparezca en la primera línea (hasta el primer salto fuera de comillas).
  const firstLine = text.split(/\r?\n/)[0] ?? ""
  const delim = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ","

  const records: string[][] = []
  let field = ""
  let record: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      record.push(field); field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      record.push(field); field = ""
      records.push(record); record = []
    } else field += c
  }
  if (field !== "" || record.length) { record.push(field); records.push(record) }

  if (records.length === 0) throw new Error("El archivo está vacío.")
  const headers = records[0].map((h) => h.trim())
  if (headers.every((h) => h === "")) throw new Error("Falta la fila de cabecera.")

  const rows: Record<string, string>[] = []
  for (let r = 1; r < records.length; r++) {
    const cells = records[r]
    if (cells.every((c) => c.trim() === "")) continue
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (cells[i] ?? "").trim() })
    rows.push(row)
  }
  if (rows.length > CSV_IMPORT_MAX_ROWS) throw new Error(`El archivo tiene más de ${CSV_IMPORT_MAX_ROWS} filas.`)
  return { headers, rows }
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
