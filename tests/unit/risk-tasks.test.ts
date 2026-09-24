import { describe, expect, it } from "vitest"

import { DEFAULT_RISK_SCALE, riskLevel, riskScore } from "@/lib/domain/risk"
import { countByCategory, groupTasksByDue } from "@/lib/domain/tasks"

import { task } from "./fixtures"

describe("riskScore", () => {
  it("probabilidad × impacto", () => {
    expect(riskScore(3, 4)).toBe(12)
    expect(riskScore(5, 5)).toBe(25)
  })
  it.each([
    [0, 3],
    [6, 1],
    [2.5, 2],
    [Number.NaN, 1],
  ])("rechaza valores fuera de 1–5 (%s, %s)", (p, i) => {
    expect(() => riskScore(p, i)).toThrow(RangeError)
  })
})

describe("riskLevel (umbrales 5 / 10 / 20)", () => {
  it.each([
    [1, "bajo"],
    [4, "bajo"],
    [5, "moderado"],
    [9, "moderado"],
    [10, "alto"],
    [16, "alto"],
    [20, "extremo"],
    [25, "extremo"],
  ])("puntaje %i → %s", (score, level) => {
    expect(riskLevel(score)).toBe(level)
  })
  it("respeta una escala propia de la organización", () => {
    expect(riskLevel(8, { ...DEFAULT_RISK_SCALE, altoFrom: 8 })).toBe("alto")
  })
})

describe("bandeja", () => {
  // 24/09/2026 22:00 en Bogotá (25/09 03:00 UTC): "hoy" es el 24 en Bogotá, no el 25.
  const now = new Date("2026-09-25T03:00:00Z")

  it("agrupa en Vencidas / Hoy / Próximas según Bogotá y ordena por fecha", () => {
    const groups = groupTasksByDue(
      [
        task("proxima", "2026-09-30T12:00:00-05:00"),
        task("hoy", "2026-09-24T12:00:00-05:00"),
        task("vencida-2", "2026-09-22T12:00:00-05:00"),
        task("vencida-1", "2026-09-20T12:00:00-05:00"),
      ],
      now
    )
    expect(groups.map((g) => [g.id, g.tasks.map((t) => t.id)])).toEqual([
      ["vencidas", ["vencida-1", "vencida-2"]],
      ["hoy", ["hoy"]],
      ["proximas", ["proxima"]],
    ])
  })
  it("omite los grupos vacíos", () => {
    expect(groupTasksByDue([task("hoy", "2026-09-24T12:00:00-05:00")], now).map((g) => g.id)).toEqual(["hoy"])
  })
  it("cuenta por categoría", () => {
    const due = "2026-09-24T12:00:00-05:00"
    const tasks = [
      task("a", due, "revisar"),
      task("b", due, "ejecutar_control"),
      task("c", due, "recertificar_accesos"),
      task("d", due, "confirmar_lectura"),
    ]
    expect(countByCategory(tasks)).toEqual({ todas: 4, documentos: 2, riesgos: 1, accesos: 1 })
  })
})
