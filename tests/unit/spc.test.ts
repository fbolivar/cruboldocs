import { describe, expect, it } from "vitest"

import { capabilityTone, computeCapability, computeImr, detectSignals, SPC_MIN_POINTS } from "@/lib/spc/compute"

describe("computeImr", () => {
  it("promedia valores y calcula el rango móvil", () => {
    const r = computeImr([2, 4, 4, 4, 5, 5, 7, 9])
    expect(r.xbar).toBeCloseTo(5, 10)
    // MR = |4-2|,|4-4|,|4-4|,|5-4|,|5-5|,|7-5|,|9-7| = 2,0,0,1,0,2,2 → media 1
    expect(r.mrbar).toBeCloseTo(1, 10)
  })

  it("no dibuja límites con menos de SPC_MIN_POINTS", () => {
    const r = computeImr([1, 2, 3])
    expect(r.hasLimits).toBe(false)
    expect(r.uclX).toBeNull()
    expect(r.lclX).toBeNull()
    expect(r.n < SPC_MIN_POINTS).toBe(true)
  })

  it("con ≥10 puntos y variación, calcula UCL/LCL de individuos", () => {
    const vals = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10]
    const r = computeImr(vals)
    expect(r.hasLimits).toBe(true)
    expect(r.sigma).not.toBeNull()
    expect(r.uclX).toBeCloseTo(r.xbar + 2.66 * r.mrbar, 10)
    expect(r.lclX).toBeCloseTo(r.xbar - 2.66 * r.mrbar, 10)
    expect(r.uclMr).toBeCloseTo(3.267 * r.mrbar, 10)
  })

  it("sin variación (todos iguales) no tiene límites ni sigma", () => {
    const r = computeImr([5, 5, 5, 5, 5, 5, 5, 5, 5, 5])
    expect(r.hasLimits).toBe(false)
    expect(r.sigma).toBeNull()
  })
})

describe("computeCapability", () => {
  it("Cp y Cpk bilaterales", () => {
    // sigma=1, xbar=10, LSL=7, USL=13 → Cp = 6/6 = 1; Cpk = min(3/3,3/3)=1
    const c = computeCapability(10, 1, 7, 13)
    expect(c.cp).toBeCloseTo(1, 10)
    expect(c.cpk).toBeCloseTo(1, 10)
  })

  it("Cpk descentrado toma el lado peor", () => {
    // xbar=11, sigma=1, LSL=7, USL=13 → Cpu=(13-11)/3=0.667, Cpl=(11-7)/3=1.333 → Cpk=0.667
    const c = computeCapability(11, 1, 7, 13)
    expect(c.cpk).toBeCloseTo(0.6667, 3)
  })

  it("un solo límite: Cp null, Cpk del lado disponible", () => {
    const c = computeCapability(10, 1, null, 13)
    expect(c.cp).toBeNull()
    expect(c.cpk).toBeCloseTo(1, 10)
  })

  it("sin sigma válido → no calculable", () => {
    expect(computeCapability(10, null, 7, 13)).toEqual({ cp: null, cpk: null })
    expect(computeCapability(10, 0, 7, 13)).toEqual({ cp: null, cpk: null })
  })
})

describe("detectSignals", () => {
  it("marca el punto fuera de 3σ", () => {
    const s = detectSignals([10, 10, 25, 10], 10, 20, 0)
    expect(s).toContainEqual({ index: 2, rule: "fuera_3sigma" })
  })

  it("racha de 8 del mismo lado", () => {
    const vals = [11, 11, 11, 11, 11, 11, 11, 11] // todos > xbar=10
    const s = detectSignals(vals, 10, 100, -100)
    expect(s.some((x) => x.rule === "racha_8" && x.index === 7)).toBe(true)
  })

  it("tendencia de 6 subiendo", () => {
    const vals = [1, 2, 3, 4, 5, 6, 7] // 6 saltos ascendentes
    const s = detectSignals(vals, 4, 100, -100)
    expect(s.some((x) => x.rule === "tendencia_6")).toBe(true)
  })

  it("sin límites no produce señales", () => {
    expect(detectSignals([1, 50, 2], 2, null, null)).toEqual([])
  })
})

describe("capabilityTone", () => {
  it("umbrales 1.33 y 1.00", () => {
    expect(capabilityTone(1.5)).toBe("exito")
    expect(capabilityTone(1.33)).toBe("exito")
    expect(capabilityTone(1.2)).toBe("advertencia")
    expect(capabilityTone(1.0)).toBe("advertencia")
    expect(capabilityTone(0.8)).toBe("error")
    expect(capabilityTone(null)).toBe("neutro")
  })
})
