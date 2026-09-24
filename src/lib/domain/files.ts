// Tipos de archivo aceptados. El servidor fija el Content-Type por extensión y valida la
// firma binaria (magic bytes): el tipo que declara el navegador no es confiable.

export const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  csv: "text/csv",
}

export const SOURCE_EXT = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"]
export const EVIDENCE_EXT = ["pdf", "png", "jpg", "jpeg", "webp", "csv", ...SOURCE_EXT]

export const extensionOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "")
export const isPdfName = (name: string) => extensionOf(name) === "pdf"
export const isSourceName = (name: string) => SOURCE_EXT.includes(extensionOf(name))
export const isEvidenceName = (name: string) => EVIDENCE_EXT.includes(extensionOf(name))

/**
 * Nombre con que se descarga un archivo: el que escribió el usuario (sin rutas ni caracteres de
 * control) con la extensión del archivo validado. Un Word no se descarga como `.hta` (AUD RA-11).
 */
export function downloadName(name: string, storedPath: string): string {
  const base = name
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, " ")
    .trim()
    .replace(/\.[^.]*$/, "")
    .trim()
    .slice(0, 200)
  return `${base || "archivo"}.${extensionOf(storedPath)}`
}

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b)
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

const ZIP = [0x50, 0x4b, 0x03, 0x04] // docx, xlsx, pptx
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] // doc, xls, ppt

/** ¿El contenido corresponde a la extensión? CSV: texto sin bytes nulos ni marcado HTML. */
export function matchesSignature(ext: string, bytes: Uint8Array): boolean {
  switch (ext) {
    case "pdf":
      return startsWith(bytes, ascii("%PDF-"))
    case "docx":
    case "xlsx":
    case "pptx":
      return startsWith(bytes, ZIP)
    case "doc":
    case "xls":
    case "ppt":
      return startsWith(bytes, OLE)
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff])
    case "webp":
      return startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)
    case "csv": {
      const head = bytes.subarray(0, 4096)
      if (head.includes(0)) return false
      return !/^\s*</.test(new TextDecoder().decode(head).replace(/^﻿/, ""))
    }
    default:
      return false
  }
}
