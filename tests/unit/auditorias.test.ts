import { describe, expect, it } from "vitest"

import {
  AUDIT_FLOW_STEPS,
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_TONE,
  FINDING_SEVERITY_LABELS,
  FINDING_TYPE_LABELS,
  FINDING_TYPE_TONE,
} from "@/components/auditorias/labels"

// Guarda la completitud de los mapas: si se agrega un valor de enum sin etiqueta o tono, falla.
const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const STATUSES = ["planificada", "en_ejecucion", "cerrada", "cancelada"]
const FINDING_TYPES = ["no_conformidad", "observacion", "oportunidad_mejora", "conformidad"]
const SEVERITIES = ["menor", "mayor"]

describe("etiquetas y tonos de Auditorías", () => {
  it("cada estado de auditoría tiene etiqueta y tono válido", () => {
    expect(Object.keys(AUDIT_STATUS_LABELS).sort()).toEqual([...STATUSES].sort())
    expect(Object.keys(AUDIT_STATUS_TONE).sort()).toEqual([...STATUSES].sort())
    for (const s of STATUSES) {
      expect(AUDIT_STATUS_LABELS[s as keyof typeof AUDIT_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(AUDIT_STATUS_TONE[s as keyof typeof AUDIT_STATUS_TONE])
    }
  })

  it("cada tipo de hallazgo tiene etiqueta y tono válido", () => {
    expect(Object.keys(FINDING_TYPE_LABELS).sort()).toEqual([...FINDING_TYPES].sort())
    expect(Object.keys(FINDING_TYPE_TONE).sort()).toEqual([...FINDING_TYPES].sort())
    for (const t of FINDING_TYPES) {
      expect(FINDING_TYPE_LABELS[t as keyof typeof FINDING_TYPE_LABELS]).toBeTruthy()
      expect(TONES).toContain(FINDING_TYPE_TONE[t as keyof typeof FINDING_TYPE_TONE])
    }
  })

  it("cada severidad de hallazgo tiene etiqueta", () => {
    expect(Object.keys(FINDING_SEVERITY_LABELS).sort()).toEqual([...SEVERITIES].sort())
    for (const s of SEVERITIES) expect(FINDING_SEVERITY_LABELS[s as keyof typeof FINDING_SEVERITY_LABELS]).toBeTruthy()
  })

  it("el stepper tiene los 3 pasos del ciclo, en orden y sin repetir, y cierra en 'cerrada'", () => {
    const keys = AUDIT_FLOW_STEPS.map((s) => s.key)
    expect(keys).toEqual(["planificada", "en_ejecucion", "cerrada"])
    expect(new Set(keys).size).toBe(keys.length)
    for (const step of AUDIT_FLOW_STEPS) expect(AUDIT_STATUS_LABELS[step.key]).toBeTruthy()
  })
})
