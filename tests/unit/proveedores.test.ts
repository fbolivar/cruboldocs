import { describe, expect, it } from "vitest"

import {
  CRITICALITY_LABELS,
  KIND_LABELS,
  RESULT_LABELS,
  RESULT_TONE,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_STATUS_TONE,
  estimateEvaluation,
  formatScore,
  scoreTone,
} from "@/components/proveedores/labels"

const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const STATUSES = ["pendiente", "aprobado", "condicionado", "rechazado", "inactivo"]
const CRITS = ["alta", "media", "baja"]
const KINDS = ["bien", "servicio", "ambos"]
const RESULTS = ["aprobado", "condicionado", "rechazado"]

describe("etiquetas y tonos de Proveedores", () => {
  it("cada estado tiene etiqueta y tono válido", () => {
    expect(Object.keys(SUPPLIER_STATUS_LABELS).sort()).toEqual([...STATUSES].sort())
    expect(Object.keys(SUPPLIER_STATUS_TONE).sort()).toEqual([...STATUSES].sort())
    for (const s of STATUSES) {
      expect(SUPPLIER_STATUS_LABELS[s as keyof typeof SUPPLIER_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(SUPPLIER_STATUS_TONE[s as keyof typeof SUPPLIER_STATUS_TONE])
    }
  })

  it("el tono del estado refleja la semántica", () => {
    expect(SUPPLIER_STATUS_TONE.aprobado).toBe("exito")
    expect(SUPPLIER_STATUS_TONE.condicionado).toBe("advertencia")
    expect(SUPPLIER_STATUS_TONE.rechazado).toBe("error")
    expect(SUPPLIER_STATUS_TONE.pendiente).toBe("info")
    expect(SUPPLIER_STATUS_TONE.inactivo).toBe("neutro")
  })

  it("criticidad, tipo y resultado están completos", () => {
    expect(Object.keys(CRITICALITY_LABELS).sort()).toEqual([...CRITS].sort())
    expect(Object.keys(KIND_LABELS).sort()).toEqual([...KINDS].sort())
    expect(Object.keys(RESULT_LABELS).sort()).toEqual([...RESULTS].sort())
    expect(Object.keys(RESULT_TONE).sort()).toEqual([...RESULTS].sort())
    expect(RESULT_TONE.aprobado).toBe("exito")
    expect(RESULT_TONE.condicionado).toBe("advertencia")
    expect(RESULT_TONE.rechazado).toBe("error")
  })
})

describe("estimateEvaluation (espejo de evaluate_supplier del RPC)", () => {
  const cases: [number, number, number, number, string][] = [
    [90, 85, 80, 86.5, "aprobado"],
    [50, 50, 50, 50, "rechazado"],
    [80, 80, 80, 80, "aprobado"], // límite superior inclusivo
    [60, 60, 60, 60, "condicionado"], // límite inferior inclusivo
    [59, 60, 60, 59.5, "rechazado"], // 59.5 < 60
    [85, 80, 70, 80.5, "aprobado"], // con decimal
    [100, 100, 100, 100, "aprobado"],
    [0, 0, 0, 0, "rechazado"],
  ]
  for (const [q, d, s, total, result] of cases) {
    it(`${q}/${d}/${s} → ${total} ${result}`, () => {
      const e = estimateEvaluation({ quality: q, delivery: d, service: s })
      expect(e.total).toBe(total)
      expect(e.result).toBe(result)
    })
  }
})

describe("scoreTone", () => {
  it("por umbral: ≥80 éxito, 60–79 advertencia, <60 error", () => {
    expect(scoreTone(80)).toBe("exito")
    expect(scoreTone(86.5)).toBe("exito")
    expect(scoreTone(79.99)).toBe("advertencia")
    expect(scoreTone(60)).toBe("advertencia")
    expect(scoreTone(59.5)).toBe("error")
    expect(scoreTone(0)).toBe("error")
  })
})

describe("formatScore", () => {
  it("entero sin decimales, no-entero con 2", () => {
    expect(formatScore(80)).toBe("80")
    expect(formatScore(86.5)).toBe("86.50")
    expect(formatScore(59.5)).toBe("59.50")
  })
})
