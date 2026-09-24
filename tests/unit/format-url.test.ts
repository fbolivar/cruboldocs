import { describe, expect, it } from "vitest"

import { parseDocumentFilters, activeFilterCount } from "@/components/documentos/filter-params"
import { parseRiskParams, hasListFilters } from "@/components/riesgos/risk-params"
import {
  bogotaIsoDate,
  daysFromToday,
  dueLabel,
  formatDate,
  formatFileSize,
  greeting,
  relativeDateTime,
  shortHash,
} from "@/lib/format"
import { paramList, safeNextPath, withParams } from "@/lib/url"

describe("fechas en America/Bogota", () => {
  // 24/09/2026 22:00 en Bogotá = 25/09/2026 03:00 UTC
  const now = new Date("2026-09-25T03:00:00Z")

  it("la fecha calendario es la de Bogotá, no la de UTC", () => {
    expect(bogotaIsoDate(now)).toBe("2026-09-24")
  })
  it("daysFromToday cuenta días calendario en Bogotá", () => {
    expect(daysFromToday("2026-09-24T12:00:00-05:00", now)).toBe(0)
    expect(daysFromToday("2026-09-25T12:00:00-05:00", now)).toBe(1)
    expect(daysFromToday("2026-09-21T12:00:00-05:00", now)).toBe(-3)
  })
  it.each([
    ["2026-09-23T12:00:00-05:00", "Vencida hace 1 día"],
    ["2026-09-20T12:00:00-05:00", "Vencida hace 4 días"],
    ["2026-09-24T12:00:00-05:00", "Vence hoy"],
    ["2026-09-25T12:00:00-05:00", "Vence mañana"],
    ["2026-09-29T12:00:00-05:00", "Vence en 5 días"],
  ])("dueLabel(%s) = %s", (iso, label) => {
    expect(dueLabel(iso, now)).toBe(label)
  })
  it("formatDate en dd/mm/aaaa", () => {
    expect(formatDate("2027-03-15T12:00:00-05:00")).toBe("15/03/2027")
  })
  it("relativeDateTime: hoy, ayer y fecha corta", () => {
    expect(relativeDateTime("2026-09-24T16:40:00-05:00", now)).toBe("Hoy 16:40")
    expect(relativeDateTime("2026-09-23T11:02:00-05:00", now)).toBe("Ayer 11:02")
    expect(relativeDateTime("2026-09-22T09:15:00-05:00", now)).toBe("22/09 09:15")
  })
  it("saludo según la hora de Bogotá", () => {
    expect(greeting(new Date("2026-09-24T13:00:00Z"))).toBe("Buenos días") // 08:00
    expect(greeting(new Date("2026-09-24T20:00:00Z"))).toBe("Buenas tardes") // 15:00
    expect(greeting(now)).toBe("Buenas noches") // 22:00
  })
  it("tamaños y hash abreviado", () => {
    expect(formatFileSize(10)).toBe("1 KB")
    expect(formatFileSize(1_258_291)).toBe("1,2 MB")
    expect(shortHash("3fa9e1abcdef0123456789077c21")).toBe("3fa9e1…77c21")
  })
})

describe("safeNextPath (redirección tras ingresar)", () => {
  it.each(["/app", "/app/documentos", "/app/documentos/1b2c-3d", "/invitacion/abcdefghijklmnopqrstuvwxyz_-0123"])(
    "permite %s",
    (p) => {
      expect(safeNextPath(p)).toBe(p)
    }
  )
  it.each([
    undefined,
    "",
    "//evil.com",
    "https://evil.com/app",
    "/\\evil.com",
    "/app?x=https://evil.com",
    "/app/../../evil",
    "javascript:alert(1)",
    "/invitacion/corto",
    "/login",
    "/apps",
  ])("rechaza %s y va a /app", (p) => {
    expect(safeNextPath(p)).toBe("/app")
  })
})

describe("parámetros de URL", () => {
  it("paramList separa por comas y descarta vacíos", () => {
    expect(paramList({ estado: "vigente,,borrador" }, "estado")).toEqual(["vigente", "borrador"])
    expect(paramList({}, "estado")).toEqual([])
  })
  it("withParams aplica cambios y borra claves vacías", () => {
    expect(withParams("/app/documentos", { q: "control", page: "3" }, { page: null, estado: "vigente" })).toBe(
      "/app/documentos?q=control&estado=vigente"
    )
    expect(withParams("/app/documentos", { q: "x" }, { q: "" })).toBe("/app/documentos")
  })
  it("filtros de documentos: valores inválidos vuelven al valor por omisión", () => {
    const f = parseDocumentFilters({ estado: "vigente,hackeado", orden: "drop table", dir: "x", page: "-4" })
    expect(f.statuses).toEqual(["vigente"])
    expect(f.sort).toBe("code")
    expect(f.dir).toBe("asc")
    expect(f.page).toBe(1)
    expect(activeFilterCount(f)).toBe(1)
  })
  it("filtros de riesgos: nivel y celda solo de la lista permitida", () => {
    const p = parseRiskParams({ nivel: "critico", celda: "9-9", vista: "inherente", page: "2.5" })
    expect(p.filters.level).toBeUndefined()
    expect(p.filters.cell).toBeUndefined()
    expect(p.filters.kind).toBe("inherente")
    expect(p.page).toBe(1)
    expect(hasListFilters(p.filters)).toBe(false)
    const ok = parseRiskParams({ nivel: "alto", celda: "3-4", riesgo: "r1" })
    expect([ok.filters.level, ok.filters.cell, ok.filters.kind, ok.riskId]).toEqual(["alto", "3-4", "residual", "r1"])
  })
})
