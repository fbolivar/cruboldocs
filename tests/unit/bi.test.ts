import { describe, expect, it } from "vitest"

import { runConfig, sanitizeConfig } from "@/lib/bi/compute"
import type { ReportRow } from "@/lib/bi/datasets"

const nc: ReportRow[] = [
  { code: "NC-1", status: "abierta", severity: "mayor", source: "auditoria", process: "Compras", detected_at: "2026-01-10" },
  { code: "NC-2", status: "abierta", severity: "menor", source: "queja_pqrs", process: "Compras", detected_at: "2026-03-05" },
  { code: "NC-3", status: "cerrada", severity: "mayor", source: "auditoria", process: "Ventas", detected_at: "2026-02-20" },
]

describe("sanitizeConfig", () => {
  it("descarta columnas y filtros fuera del catálogo", () => {
    const c = sanitizeConfig("nc", { columns: ["code", "inventada"], filters: [{ field: "x", op: "igual", value: "1" }], groupBy: null, aggregate: null, chart: null })
    expect(c.columns).toEqual(["code"])
    expect(c.filters).toEqual([])
  })
  it("exige groupBy agrupable y gráfica solo con agrupación", () => {
    const sinGrupo = sanitizeConfig("nc", { columns: ["code"], filters: [], groupBy: "code", aggregate: null, chart: "barra" })
    expect(sinGrupo.groupBy).toBeNull()
    expect(sinGrupo.chart).toBeNull()
    const conGrupo = sanitizeConfig("nc", { columns: ["code"], filters: [], groupBy: "status", aggregate: null, chart: "barra" })
    expect(conGrupo.groupBy).toBe("status")
    expect(conGrupo.chart).toBe("barra")
  })
  it("degrada suma/promedio sin campo numérico a conteo", () => {
    const c = sanitizeConfig("nc", { columns: [], filters: [], groupBy: "status", aggregate: { fn: "suma", field: "status" }, chart: null })
    expect(c.aggregate).toEqual({ fn: "count" })
  })
})

describe("runConfig", () => {
  it("detalle: aplica filtros y columnas", () => {
    const r = runConfig("nc", nc, sanitizeConfig("nc", { columns: ["code", "process"], filters: [{ field: "status", op: "igual", value: "abierta" }], groupBy: null, aggregate: null, chart: null }))
    expect(r.mode).toBe("detalle")
    expect(r.total).toBe(2)
    expect(r.rows.map((x) => x.code)).toEqual(["NC-1", "NC-2"])
    expect(Object.keys(r.rows[0])).toEqual(["code", "process"])
  })
  it("agrupado: cuenta por proceso", () => {
    const r = runConfig("nc", nc, sanitizeConfig("nc", { columns: [], filters: [], groupBy: "process", aggregate: { fn: "count" }, chart: "barra" }))
    expect(r.mode).toBe("agrupado")
    const byGroup = Object.fromEntries(r.rows.map((x) => [x.group, x.valor]))
    expect(byGroup).toEqual({ Compras: 2, Ventas: 1 })
    expect(r.chart?.kind).toBe("barra")
  })
  it("filtro de fecha desde/hasta", () => {
    const r = runConfig("nc", nc, sanitizeConfig("nc", { columns: ["code"], filters: [{ field: "detected_at", op: "desde", value: "2026-02-01" }], groupBy: null, aggregate: null, chart: null }))
    expect(r.rows.map((x) => x.code).sort()).toEqual(["NC-2", "NC-3"])
  })
})
