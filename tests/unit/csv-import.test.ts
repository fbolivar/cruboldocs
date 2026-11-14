import { describe, expect, it } from "vitest"

import { parseCsv } from "@/lib/csv"

describe("parseCsv", () => {
  it("detecta separador ; y mapea por cabecera", () => {
    const { headers, rows } = parseCsv("codigo;nombre\nGC;Gestión de Calidad")
    expect(headers).toEqual(["codigo", "nombre"])
    expect(rows).toEqual([{ codigo: "GC", nombre: "Gestión de Calidad" }])
  })

  it("detecta separador , cuando predomina", () => {
    const { rows } = parseCsv("a,b,c\n1,2,3")
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "3" })
  })

  it("respeta comillas con separador y comillas escapadas", () => {
    const { rows } = parseCsv('nombre;nota\n"Aceros, S.A.";"Dijo ""hola"""')
    expect(rows[0]).toEqual({ nombre: "Aceros, S.A.", nota: 'Dijo "hola"' })
  })

  it("quita el BOM y maneja CRLF", () => {
    const { headers, rows } = parseCsv("﻿a;b\r\n1;2\r\n")
    expect(headers).toEqual(["a", "b"])
    expect(rows).toEqual([{ a: "1", b: "2" }])
  })

  it("ignora filas completamente vacías", () => {
    const { rows } = parseCsv("a;b\n1;2\n\n;\n3;4")
    expect(rows).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }])
  })

  it("lanza si supera el límite de filas", () => {
    const lines = ["a", ...Array.from({ length: 1001 }, (_, i) => String(i))].join("\n")
    expect(() => parseCsv(lines)).toThrow(/más de 1000 filas/)
  })

  it("lanza si el archivo está vacío", () => {
    expect(() => parseCsv("")).toThrow()
  })
})
