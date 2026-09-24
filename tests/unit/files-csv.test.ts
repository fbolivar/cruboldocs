import { describe, expect, it } from "vitest"

import { toCsv } from "@/lib/csv"
import { downloadName, extensionOf, isEvidenceName, isPdfName, isSourceName, matchesSignature } from "@/lib/domain/files"

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)))

describe("tipos de archivo", () => {
  it("extensión en minúsculas; sin punto no hay extensión", () => {
    expect(extensionOf("Manual.PDF")).toBe("pdf")
    expect(extensionOf("informe.final.docx")).toBe("docx")
    expect(extensionOf("sinextension")).toBe("")
  })
  it("PDF, fuente y evidencia", () => {
    expect(isPdfName("a.pdf")).toBe(true)
    expect(isSourceName("a.xlsx")).toBe(true)
    expect(isSourceName("a.pdf")).toBe(false)
    expect(isEvidenceName("foto.jpeg")).toBe(true)
    expect(isEvidenceName("script.exe")).toBe(false)
    expect(isEvidenceName("pagina.html")).toBe(false)
  })
})

describe("matchesSignature (firma binaria, no el tipo que declara el navegador)", () => {
  it.each([
    ["pdf", bytes("%PDF-1.7")],
    ["docx", bytes([0x50, 0x4b, 0x03, 0x04, 0x14])],
    ["xls", bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    ["png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["jpg", bytes([0xff, 0xd8, 0xff, 0xe0])],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBP")],
    ["csv", bytes("codigo;titulo\r\nPR-01;Control")],
    ["csv", bytes([0xef, 0xbb, 0xbf], "a;b")],
  ])("%s válido", (ext, content) => {
    expect(matchesSignature(ext, content)).toBe(true)
  })
  it.each([
    ["pdf", bytes("MZ\x90\x00")], // ejecutable renombrado
    ["pdf", bytes("<html>%PDF-")],
    ["docx", bytes("%PDF-1.7")],
    ["png", bytes([0xff, 0xd8, 0xff])],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "AVI ")],
    ["csv", bytes("  <script>alert(1)</script>")], // HTML disfrazado de CSV
    ["csv", bytes("a;b", [0], "c")], // binario
    ["exe", bytes("MZ")], // extensión no admitida
  ])("%s falsificado o no admitido se rechaza", (ext, content) => {
    expect(matchesSignature(ext, content)).toBe(false)
  })
})

describe("downloadName (RA-11)", () => {
  it("usa la extensión del archivo validado, no la que escribió el usuario", () => {
    expect(downloadName("Manual.hta", "documentos/o/d/1/fuente.docx")).toBe("Manual.docx")
  })
  it("quita rutas y caracteres de control", () => {
    expect(downloadName("..\\..\\windows\\sys\u0000tem.pdf", "x/y.pdf")).not.toMatch(/[\\/\u0000]/)
    expect(downloadName("a/b:c*d?.pdf", "x/y.pdf")).toBe("a b c d.pdf")
  })
  it("nombre vacío → archivo", () => {
    expect(downloadName("   ", "x/y.pdf")).toBe("archivo.pdf")
  })
  it("limita la longitud", () => {
    expect(downloadName("a".repeat(500) + ".pdf", "x/y.pdf").length).toBeLessThanOrEqual(204)
  })
})

describe("toCsv", () => {
  type Row = { code: string; title: string | null; n: number }
  const cols = [
    { header: "Código", value: (r: Row) => r.code },
    { header: "Título", value: (r: Row) => r.title },
    { header: "N", value: (r: Row) => r.n },
  ]

  it("UTF-8 con BOM, separador ; y fin de línea CRLF", () => {
    const csv = toCsv([{ code: "PR-01", title: "Gestión", n: 3 }], cols)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe("Código;Título;N\r\nPR-01;Gestión;3")
  })
  it("null queda vacío", () => {
    expect(toCsv([{ code: "A", title: null, n: 0 }], cols).split("\r\n")[1]).toBe("A;;0")
  })
  it("escapa ; comillas y saltos de línea", () => {
    const line = toCsv([{ code: 'a;"b"', title: "x\ny", n: 1 }], cols).split("\r\n").slice(1).join("\r\n")
    expect(line).toBe('"a;""b""";"x\ny";1')
  })
  it.each(["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd"])(
    "neutraliza la inyección de fórmulas: %s",
    (evil) => {
      const cell = toCsv([{ code: evil, title: "", n: 0 }], cols).split("\r\n")[1].split(";")[0]
      expect(cell.replace(/^"/, "").startsWith("'")).toBe(true)
    }
  )
})
