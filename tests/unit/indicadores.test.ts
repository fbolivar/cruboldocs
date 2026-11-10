import { describe, expect, it } from "vitest"

import {
  COMPLIANCE_LABELS,
  COMPLIANCE_TONE,
  DIRECTION_LABELS,
  FREQUENCY_LABELS,
  estimateCompliance,
  formatPeriod,
  formatTarget,
  formatValue,
} from "@/components/indicadores/labels"

const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const COMPLIANCES = ["cumple", "en_riesgo", "no_cumple"]
const DIRECTIONS = ["mayor_mejor", "menor_mejor", "rango"]
const FREQUENCIES = ["mensual", "bimestral", "trimestral", "semestral", "anual"]

describe("etiquetas y tonos de Indicadores", () => {
  it("cada estado de cumplimiento tiene etiqueta y tono válido", () => {
    expect(Object.keys(COMPLIANCE_LABELS).sort()).toEqual([...COMPLIANCES].sort())
    expect(Object.keys(COMPLIANCE_TONE).sort()).toEqual([...COMPLIANCES].sort())
    for (const c of COMPLIANCES) {
      expect(COMPLIANCE_LABELS[c as keyof typeof COMPLIANCE_LABELS]).toBeTruthy()
      expect(TONES).toContain(COMPLIANCE_TONE[c as keyof typeof COMPLIANCE_TONE])
    }
  })

  it("el tono refleja la semántica (cumple→éxito, en riesgo→advertencia, no cumple→error)", () => {
    expect(COMPLIANCE_TONE.cumple).toBe("exito")
    expect(COMPLIANCE_TONE.en_riesgo).toBe("advertencia")
    expect(COMPLIANCE_TONE.no_cumple).toBe("error")
  })

  it("cada sentido y frecuencia tiene etiqueta", () => {
    expect(Object.keys(DIRECTION_LABELS).sort()).toEqual([...DIRECTIONS].sort())
    expect(Object.keys(FREQUENCY_LABELS).sort()).toEqual([...FREQUENCIES].sort())
    for (const d of DIRECTIONS) expect(DIRECTION_LABELS[d as keyof typeof DIRECTION_LABELS]).toBeTruthy()
    for (const f of FREQUENCIES) expect(FREQUENCY_LABELS[f as keyof typeof FREQUENCY_LABELS]).toBeTruthy()
  })
})

describe("formateo", () => {
  it("formatValue pega el % y separa el resto con espacio", () => {
    expect(formatValue(97, "%")).toBe("97%")
    expect(formatValue(3.5, "días")).toBe("3.5 días")
    expect(formatValue(null, "%")).toBe("—")
  })

  it("formatTarget usa ≥, ≤ o rango según el sentido", () => {
    expect(formatTarget("mayor_mejor", 95, null, "%")).toBe("≥ 95%")
    expect(formatTarget("menor_mejor", 3, null, "%")).toBe("≤ 3%")
    expect(formatTarget("rango", 40, 60, "pts")).toContain("–")
  })

  it("formatPeriod convierte el ISO a mes-año", () => {
    expect(formatPeriod("2026-11-01")).toBe("nov-2026")
    expect(formatPeriod("2026-01-01")).toBe("ene-2026")
  })
})

describe("estimateCompliance (espejo de indicator_compliance del RPC)", () => {
  it("mayor_mejor: cumple / en riesgo / no cumple con tolerancia 5%", () => {
    expect(estimateCompliance("mayor_mejor", 95, null, 5, 97)).toBe("cumple")
    expect(estimateCompliance("mayor_mejor", 95, null, 5, 92)).toBe("en_riesgo") // ≥ 95*0.95 = 90.25
    expect(estimateCompliance("mayor_mejor", 95, null, 5, 80)).toBe("no_cumple")
  })

  it("menor_mejor: cumple / en riesgo / no cumple con tolerancia 10%", () => {
    expect(estimateCompliance("menor_mejor", 3, null, 10, 2)).toBe("cumple")
    expect(estimateCompliance("menor_mejor", 3, null, 10, 3.2)).toBe("en_riesgo") // ≤ 3*1.1 = 3.3
    expect(estimateCompliance("menor_mejor", 3, null, 10, 5)).toBe("no_cumple")
  })

  it("rango: dentro del rango cumple; dentro del margen en riesgo; fuera no cumple", () => {
    expect(estimateCompliance("rango", 40, 60, 10, 50)).toBe("cumple")
    expect(estimateCompliance("rango", 40, 60, 10, 62)).toBe("en_riesgo") // margen = (60-40)*0.1 = 2 → ≤ 62
    expect(estimateCompliance("rango", 40, 60, 10, 80)).toBe("no_cumple")
  })

  it("tolerancia por defecto 10% cuando es null", () => {
    expect(estimateCompliance("mayor_mejor", 100, null, null, 91)).toBe("en_riesgo") // ≥ 90
    expect(estimateCompliance("mayor_mejor", 100, null, null, 89)).toBe("no_cumple")
  })
})
