import { describe, expect, it } from "vitest"

import { daysBetween, indicatorSeverity, isDescending, overdueSeverity, recurrenceSeverity, supplierSeverity } from "@/lib/focos/rules"

describe("daysBetween", () => {
  it("cuenta días enteros", () => {
    expect(daysBetween("2026-11-15", "2026-11-01")).toBe(14)
    expect(daysBetween("2026-11-01", "2026-11-01")).toBe(0)
  })
})

describe("overdueSeverity", () => {
  it("alta por cantidad o antigüedad; media con 1", () => {
    expect(overdueSeverity(3, 0)).toBe("alta")
    expect(overdueSeverity(1, 14)).toBe("alta")
    expect(overdueSeverity(1, 2)).toBe("media")
    expect(overdueSeverity(0, 0)).toBe("baja")
  })
})

describe("isDescending", () => {
  it("true solo si los 3 más recientes descienden", () => {
    expect(isDescending([10, 20, 30])).toBe(true) // reciente 10 < 20 < 30
    expect(isDescending([30, 20, 10])).toBe(false)
    expect(isDescending([10, 20])).toBe(false)
  })
})

describe("indicatorSeverity", () => {
  it("prioriza no_cumple y tendencia", () => {
    expect(indicatorSeverity("no_cumple", false)).toBe("alta")
    expect(indicatorSeverity("cumple", true)).toBe("alta")
    expect(indicatorSeverity("en_riesgo", false)).toBe("media")
    expect(indicatorSeverity("cumple", false)).toBeNull()
  })
})

describe("recurrenceSeverity", () => {
  it("umbrales 3 y 5", () => {
    expect(recurrenceSeverity(5)).toBe("alta")
    expect(recurrenceSeverity(3)).toBe("media")
    expect(recurrenceSeverity(2)).toBeNull()
  })
})

describe("supplierSeverity", () => {
  it("por estado y criticidad", () => {
    expect(supplierSeverity("rechazado", "alta")).toBe("alta")
    expect(supplierSeverity("rechazado", "media")).toBe("media")
    expect(supplierSeverity("condicionado", "alta")).toBe("media")
    expect(supplierSeverity("condicionado", "baja")).toBe("baja")
    expect(supplierSeverity("aprobado", "alta")).toBeNull()
  })
})
