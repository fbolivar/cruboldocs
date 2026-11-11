import { describe, expect, it } from "vitest"

import {
  COMMITMENT_STATUS_LABELS,
  COMMITMENT_STATUS_TONE,
  MINUTE_STATUS_LABELS,
  MINUTE_STATUS_TONE,
} from "@/components/actas/labels"
import {
  OBJECTIVE_STATUS_LABELS,
  OBJECTIVE_STATUS_TONE,
  PERSPECTIVE_LABELS,
  PERSPECTIVE_ORDER,
  PERSPECTIVE_TONE,
  objectiveProgressLabel,
  objectiveProgressTone,
} from "@/components/objetivos/labels"

const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const MINUTE_STATUSES = ["borrador", "cerrada"]
const COMMITMENT_STATUSES = ["pendiente", "cumplido"]
const PERSPECTIVES = ["financiera", "cliente", "procesos", "aprendizaje"]
const OBJECTIVE_STATUSES = ["activo", "cumplido", "no_cumplido", "archivado"]

describe("etiquetas y tonos de actas", () => {
  it("cada estado de acta tiene etiqueta y tono válido", () => {
    expect(Object.keys(MINUTE_STATUS_LABELS).sort()).toEqual([...MINUTE_STATUSES].sort())
    expect(Object.keys(MINUTE_STATUS_TONE).sort()).toEqual([...MINUTE_STATUSES].sort())
    for (const s of MINUTE_STATUSES) {
      expect(MINUTE_STATUS_LABELS[s as keyof typeof MINUTE_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(MINUTE_STATUS_TONE[s as keyof typeof MINUTE_STATUS_TONE])
    }
  })

  it("cada estado de compromiso tiene etiqueta y tono válido", () => {
    expect(Object.keys(COMMITMENT_STATUS_LABELS).sort()).toEqual([...COMMITMENT_STATUSES].sort())
    expect(Object.keys(COMMITMENT_STATUS_TONE).sort()).toEqual([...COMMITMENT_STATUSES].sort())
    for (const s of COMMITMENT_STATUSES) {
      expect(COMMITMENT_STATUS_LABELS[s as keyof typeof COMMITMENT_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(COMMITMENT_STATUS_TONE[s as keyof typeof COMMITMENT_STATUS_TONE])
    }
  })

  it("el tono refleja la semántica (borrador=advertencia, cerrada/cumplido=exito)", () => {
    expect(MINUTE_STATUS_TONE.borrador).toBe("advertencia")
    expect(MINUTE_STATUS_TONE.cerrada).toBe("exito")
    expect(COMMITMENT_STATUS_TONE.pendiente).toBe("advertencia")
    expect(COMMITMENT_STATUS_TONE.cumplido).toBe("exito")
  })
})

describe("etiquetas y tonos de objetivos / BSC", () => {
  it("las 4 perspectivas tienen etiqueta, tono y orden fijo", () => {
    expect(Object.keys(PERSPECTIVE_LABELS).sort()).toEqual([...PERSPECTIVES].sort())
    expect(Object.keys(PERSPECTIVE_TONE).sort()).toEqual([...PERSPECTIVES].sort())
    expect(PERSPECTIVE_ORDER).toEqual(["financiera", "cliente", "procesos", "aprendizaje"])
    for (const p of PERSPECTIVES) {
      expect(PERSPECTIVE_LABELS[p as keyof typeof PERSPECTIVE_LABELS]).toBeTruthy()
      expect(TONES).toContain(PERSPECTIVE_TONE[p as keyof typeof PERSPECTIVE_TONE])
    }
  })

  it("cada estado de objetivo tiene etiqueta y tono válido", () => {
    expect(Object.keys(OBJECTIVE_STATUS_LABELS).sort()).toEqual([...OBJECTIVE_STATUSES].sort())
    expect(Object.keys(OBJECTIVE_STATUS_TONE).sort()).toEqual([...OBJECTIVE_STATUSES].sort())
    for (const s of OBJECTIVE_STATUSES) {
      expect(OBJECTIVE_STATUS_LABELS[s as keyof typeof OBJECTIVE_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(OBJECTIVE_STATUS_TONE[s as keyof typeof OBJECTIVE_STATUS_TONE])
    }
  })

  it("el tono del estado del objetivo refleja la semántica", () => {
    expect(OBJECTIVE_STATUS_TONE.activo).toBe("info")
    expect(OBJECTIVE_STATUS_TONE.cumplido).toBe("exito")
    expect(OBJECTIVE_STATUS_TONE.no_cumplido).toBe("error")
    expect(OBJECTIVE_STATUS_TONE.archivado).toBe("neutro")
  })
})

describe("avance derivado del objetivo (umbral, coincide con el servidor)", () => {
  it("objectiveProgressTone: null = sin datos (neutro), no el tono de un número", () => {
    expect(objectiveProgressTone(null)).toBe("neutro")
    expect(objectiveProgressTone(100)).toBe("exito")
    expect(objectiveProgressTone(80)).toBe("exito")
    expect(objectiveProgressTone(79.99)).toBe("advertencia")
    expect(objectiveProgressTone(60)).toBe("advertencia")
    expect(objectiveProgressTone(59.99)).toBe("error")
    expect(objectiveProgressTone(0)).toBe("error")
  })

  it("objectiveProgressLabel: null = «Sin datos», no «Bajo»", () => {
    expect(objectiveProgressLabel(null)).toBe("Sin datos")
    expect(objectiveProgressLabel(100)).toBe("Bien")
    expect(objectiveProgressLabel(80)).toBe("Bien")
    expect(objectiveProgressLabel(79.99)).toBe("Medio")
    expect(objectiveProgressLabel(60)).toBe("Medio")
    expect(objectiveProgressLabel(59.99)).toBe("Bajo")
    expect(objectiveProgressLabel(0)).toBe("Bajo")
  })

  it("null se distingue de 0 (sin datos ≠ avance bajo)", () => {
    expect(objectiveProgressLabel(null)).not.toBe(objectiveProgressLabel(0))
    expect(objectiveProgressTone(null)).not.toBe(objectiveProgressTone(0))
  })
})
