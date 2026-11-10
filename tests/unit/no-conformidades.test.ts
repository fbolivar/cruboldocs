import { describe, expect, it } from "vitest"

import {
  ACTION_STATUS_LABELS,
  ACTION_STATUS_TONE,
  ACTION_TYPE_LABELS,
  FLOW_STEPS,
  SEVERITY_LABELS,
  SEVERITY_TONE,
  SOURCE_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
} from "@/components/no-conformidades/labels"

// Guarda la completitud de los mapas: si se agrega un valor de enum sin etiqueta o tono, falla.
const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const STATUSES = ["abierta", "analisis_causa", "plan_accion", "en_ejecucion", "verificacion", "cerrada", "anulada"]
const SEVERITIES = ["observacion", "menor", "mayor"]
const SOURCES = ["auditoria_interna", "auditoria_externa", "queja_pqrs", "producto_servicio", "riesgo_materializado", "mejora", "otro"]
const ACTION_TYPES = ["correccion", "correctiva", "preventiva"]
const ACTION_STATUSES = ["pendiente", "en_curso", "hecha", "cancelada"]

describe("etiquetas y tonos de No Conformidades", () => {
  it("cada estado tiene etiqueta y tono válido", () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...STATUSES].sort())
    expect(Object.keys(STATUS_TONE).sort()).toEqual([...STATUSES].sort())
    for (const s of STATUSES) {
      expect(STATUS_LABELS[s as keyof typeof STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(STATUS_TONE[s as keyof typeof STATUS_TONE])
    }
  })

  it("cada severidad tiene etiqueta y tono válido", () => {
    expect(Object.keys(SEVERITY_LABELS).sort()).toEqual([...SEVERITIES].sort())
    for (const s of SEVERITIES) expect(TONES).toContain(SEVERITY_TONE[s as keyof typeof SEVERITY_TONE])
  })

  it("cada origen tiene etiqueta", () => {
    expect(Object.keys(SOURCE_LABELS).sort()).toEqual([...SOURCES].sort())
  })

  it("cada tipo y estado de acción tiene etiqueta y tono", () => {
    expect(Object.keys(ACTION_TYPE_LABELS).sort()).toEqual([...ACTION_TYPES].sort())
    expect(Object.keys(ACTION_STATUS_LABELS).sort()).toEqual([...ACTION_STATUSES].sort())
    for (const s of ACTION_STATUSES) expect(TONES).toContain(ACTION_STATUS_TONE[s as keyof typeof ACTION_STATUS_TONE])
  })

  it("el stepper tiene los 6 pasos del ciclo, en orden y sin repetir, y cierra en 'cerrada'", () => {
    const keys = FLOW_STEPS.map((s) => s.key)
    expect(keys).toEqual(["abierta", "analisis_causa", "plan_accion", "en_ejecucion", "verificacion", "cerrada"])
    expect(new Set(keys).size).toBe(keys.length)
    for (const step of FLOW_STEPS) expect(STATUS_LABELS[step.key]).toBeTruthy()
  })
})
