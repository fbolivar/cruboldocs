import { describe, expect, it } from "vitest"

import {
  CHANNEL_LABELS,
  PQRS_STATUS_LABELS,
  PQRS_STATUS_TONE,
  PQRS_TYPE_LABELS,
  SATISFACTION_METHOD_LABELS,
  formatPeriod,
  formatScore,
  isOpen,
  satisfactionLabel,
  satisfactionTone,
} from "@/components/pqrs/labels"

const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const STATUSES = ["recibida", "en_gestion", "resuelta", "cerrada", "anulada"]
const TYPES = ["peticion", "queja", "reclamo", "sugerencia", "felicitacion"]
const CHANNELS = ["correo", "telefono", "web", "presencial", "otro"]
const METHODS = ["encuesta", "nps", "csat", "otro"]

describe("etiquetas y tonos de PQRS", () => {
  it("cada estado tiene etiqueta y tono válido", () => {
    expect(Object.keys(PQRS_STATUS_LABELS).sort()).toEqual([...STATUSES].sort())
    expect(Object.keys(PQRS_STATUS_TONE).sort()).toEqual([...STATUSES].sort())
    for (const s of STATUSES) {
      expect(PQRS_STATUS_LABELS[s as keyof typeof PQRS_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(PQRS_STATUS_TONE[s as keyof typeof PQRS_STATUS_TONE])
    }
  })

  it("tipo, canal y método de satisfacción están completos", () => {
    expect(Object.keys(PQRS_TYPE_LABELS).sort()).toEqual([...TYPES].sort())
    expect(Object.keys(CHANNEL_LABELS).sort()).toEqual([...CHANNELS].sort())
    expect(Object.keys(SATISFACTION_METHOD_LABELS).sort()).toEqual([...METHODS].sort())
  })

  it("el tono del estado refleja la semántica", () => {
    expect(PQRS_STATUS_TONE.recibida).toBe("info")
    expect(PQRS_STATUS_TONE.en_gestion).toBe("advertencia")
    expect(PQRS_STATUS_TONE.cerrada).toBe("exito")
    expect(PQRS_STATUS_TONE.anulada).toBe("neutro")
  })
})

describe("isOpen", () => {
  it("abiertas: recibida/en_gestion/resuelta", () => {
    expect(isOpen("recibida")).toBe(true)
    expect(isOpen("en_gestion")).toBe(true)
    expect(isOpen("resuelta")).toBe(true)
  })
  it("cerradas: cerrada/anulada", () => {
    expect(isOpen("cerrada")).toBe(false)
    expect(isOpen("anulada")).toBe(false)
  })
})

describe("satisfactionTone / satisfactionLabel (semáforo por umbral)", () => {
  it("≥80 éxito/Bien", () => {
    expect(satisfactionTone(80)).toBe("exito")
    expect(satisfactionTone(100)).toBe("exito")
    expect(satisfactionLabel(84)).toBe("Bien")
  })
  it("60–79 advertencia/Medio", () => {
    expect(satisfactionTone(60)).toBe("advertencia")
    expect(satisfactionTone(79.99)).toBe("advertencia")
    expect(satisfactionLabel(71)).toBe("Medio")
  })
  it("<60 error/Bajo", () => {
    expect(satisfactionTone(59.99)).toBe("error")
    expect(satisfactionTone(0)).toBe("error")
    expect(satisfactionLabel(40)).toBe("Bajo")
  })
})

describe("formatScore", () => {
  it("entero sin decimales, no-entero con 2", () => {
    expect(formatScore(84)).toBe("84")
    expect(formatScore(84.5)).toBe("84.50")
  })
})

describe("formatPeriod", () => {
  it("YYYY-MM-DD → mmm YYYY", () => {
    expect(formatPeriod("2026-11-01")).toBe("nov 2026")
    expect(formatPeriod("2026-01-15")).toBe("ene 2026")
    expect(formatPeriod("2025-12-31")).toBe("dic 2025")
  })
})
