import { describe, expect, it } from "vitest"

import {
  COMPETENCY_STATUS_LABELS,
  COMPETENCY_STATUS_TONE,
  KIND_LABELS,
  LEVEL_LABELS,
  RESULT_LABELS,
  TRAINING_KIND_LABELS,
  coveragePct,
  deriveStatus,
  levelFraction,
} from "@/components/competencias/labels"
import type { MatrixRow } from "@/lib/types"

const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const STATUSES = ["cumple", "brecha", "brecha_en_plan", "sin_evaluar"]
const KINDS = ["educacion", "formacion", "habilidad", "experiencia"]
const TRAINING_KINDS = ["interna", "externa"]
const RESULTS = ["aprobado", "no_aprobado", "asistio"]

describe("etiquetas y tonos de Competencias", () => {
  it("cada estado de competencia tiene etiqueta y tono válido", () => {
    expect(Object.keys(COMPETENCY_STATUS_LABELS).sort()).toEqual([...STATUSES].sort())
    expect(Object.keys(COMPETENCY_STATUS_TONE).sort()).toEqual([...STATUSES].sort())
    for (const s of STATUSES) {
      expect(COMPETENCY_STATUS_LABELS[s as keyof typeof COMPETENCY_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(COMPETENCY_STATUS_TONE[s as keyof typeof COMPETENCY_STATUS_TONE])
    }
  })

  it("el tono refleja la semántica (cumple→éxito, brecha→error, en plan→advertencia, sin evaluar→neutro)", () => {
    expect(COMPETENCY_STATUS_TONE.cumple).toBe("exito")
    expect(COMPETENCY_STATUS_TONE.brecha).toBe("error")
    expect(COMPETENCY_STATUS_TONE.brecha_en_plan).toBe("advertencia")
    expect(COMPETENCY_STATUS_TONE.sin_evaluar).toBe("neutro")
  })

  it("niveles, tipos y resultados están completos", () => {
    expect(Object.keys(LEVEL_LABELS).map(Number).sort()).toEqual([1, 2, 3])
    expect(Object.keys(KIND_LABELS).sort()).toEqual([...KINDS].sort())
    expect(Object.keys(TRAINING_KIND_LABELS).sort()).toEqual([...TRAINING_KINDS].sort())
    expect(Object.keys(RESULT_LABELS).sort()).toEqual([...RESULTS].sort())
    for (const l of [1, 2, 3] as const) expect(LEVEL_LABELS[l]).toBeTruthy()
    for (const k of KINDS) expect(KIND_LABELS[k as keyof typeof KIND_LABELS]).toBeTruthy()
  })
})

describe("levelFraction", () => {
  it("muestra evaluado/requerido", () => {
    expect(levelFraction(2, 3)).toBe("2/3")
    expect(levelFraction(3, 3)).toBe("3/3")
  })
  it("sin evaluar (null o 0) muestra —/requerido", () => {
    expect(levelFraction(null, 3)).toBe("—/3")
    expect(levelFraction(0, 2)).toBe("—/2")
  })
})

describe("deriveStatus (espejo de assess_status del RPC)", () => {
  it("cumple cuando el evaluado alcanza o supera el requerido", () => {
    expect(deriveStatus(3, 3, false)).toBe("cumple")
    expect(deriveStatus(3, 2, false)).toBe("cumple") // assessed 3 >= required 2
  })
  it("brecha_en_plan cuando está por debajo y hay plan", () => {
    expect(deriveStatus(1, 3, true)).toBe("brecha_en_plan")
  })
  it("brecha cuando está por debajo y no hay plan", () => {
    expect(deriveStatus(1, 3, false)).toBe("brecha")
    expect(deriveStatus(0, 1, false)).toBe("brecha")
  })
  it("sin_evaluar cuando no hay nivel evaluado", () => {
    expect(deriveStatus(null, 3, false)).toBe("sin_evaluar")
    expect(deriveStatus(null, 1, true)).toBe("sin_evaluar")
  })
})

const row = (cells: MatrixRow["cells"]): MatrixRow => ({
  membershipId: "m", personName: "X", positionName: "C", processName: null, cells,
})

describe("coveragePct", () => {
  it("rows vacío → null", () => {
    expect(coveragePct([])).toBeNull()
    expect(coveragePct([row([])])).toBeNull()
  })
  it("porcentaje de celdas en estado cumple sobre el total requerido", () => {
    const rows: MatrixRow[] = [
      row([
        { competencyId: "a", requiredLevel: 3, assessedLevel: 3, status: "cumple" },
        { competencyId: "b", requiredLevel: 2, assessedLevel: 1, status: "brecha" },
      ]),
      row([
        { competencyId: "a", requiredLevel: 2, assessedLevel: 2, status: "cumple" },
        { competencyId: "c", requiredLevel: 1, assessedLevel: null, status: "sin_evaluar" },
      ]),
    ]
    // 2 de 4 celdas en cumple → 50%
    expect(coveragePct(rows)).toBe(50)
  })
  it("todas cumplen → 100%", () => {
    const rows = [row([
      { competencyId: "a", requiredLevel: 1, assessedLevel: 1, status: "cumple" },
      { competencyId: "b", requiredLevel: 2, assessedLevel: 3, status: "cumple" },
    ])]
    expect(coveragePct(rows)).toBe(100)
  })
})
