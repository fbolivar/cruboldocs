import { describe, expect, it } from "vitest"

import { OUTPUT_KIND_LABELS, REVIEW_STATUS_LABELS, REVIEW_STATUS_TONE, snapshotBlocks } from "@/components/revisiones/labels"
import type { ReviewSnapshot } from "@/lib/types"

const TONES = ["exito", "advertencia", "error", "info", "neutro"]
const METRIC_TONES = ["texto", "exito", "advertencia", "error"]
const STATUSES = ["borrador", "cerrada", "cancelada"]
const KINDS = ["decision", "accion_mejora", "recurso", "cambio_sgc"]

describe("etiquetas y tonos de Revisión por la dirección", () => {
  it("cada estado del acta tiene etiqueta y tono válido", () => {
    expect(Object.keys(REVIEW_STATUS_LABELS).sort()).toEqual([...STATUSES].sort())
    expect(Object.keys(REVIEW_STATUS_TONE).sort()).toEqual([...STATUSES].sort())
    for (const s of STATUSES) {
      expect(REVIEW_STATUS_LABELS[s as keyof typeof REVIEW_STATUS_LABELS]).toBeTruthy()
      expect(TONES).toContain(REVIEW_STATUS_TONE[s as keyof typeof REVIEW_STATUS_TONE])
    }
  })

  it("el tono del estado refleja la semántica (borrador→info, cerrada→éxito, cancelada→neutro)", () => {
    expect(REVIEW_STATUS_TONE.borrador).toBe("info")
    expect(REVIEW_STATUS_TONE.cerrada).toBe("exito")
    expect(REVIEW_STATUS_TONE.cancelada).toBe("neutro")
  })

  it("cada tipo de salida tiene etiqueta", () => {
    expect(Object.keys(OUTPUT_KIND_LABELS).sort()).toEqual([...KINDS].sort())
    for (const k of KINDS) expect(OUTPUT_KIND_LABELS[k as keyof typeof OUTPUT_KIND_LABELS]).toBeTruthy()
  })
})

const fullSnapshot: ReviewSnapshot = {
  nc: { abiertas: 3, cerradas: 5, eficaces: 4 },
  auditorias: { realizadas: 2, hallazgosNc: 1 },
  indicadores: { cumplenPct: 80, enRiesgo: 2, noCumplen: 1 },
  riesgos: { altos: 1, controlesATiempoPct: 90 },
  documentos: { vigentes: 12, porVencer: 3 },
  accionesPrevias: { total: 4, pendientes: 2 },
}

const zeroSnapshot: ReviewSnapshot = {
  nc: { abiertas: 0, cerradas: 0, eficaces: 0 },
  auditorias: { realizadas: 0, hallazgosNc: 0 },
  indicadores: { cumplenPct: null, enRiesgo: 0, noCumplen: 0 },
  riesgos: { altos: 0, controlesATiempoPct: null },
  documentos: { vigentes: 0, porVencer: 0 },
  accionesPrevias: { total: 0, pendientes: 0 },
}

describe("snapshotBlocks", () => {
  it("arma los 6 bloques en orden con sus títulos", () => {
    const blocks = snapshotBlocks(fullSnapshot)
    expect(blocks.map((b) => b.title)).toEqual([
      "No conformidades",
      "Auditorías",
      "Indicadores",
      "Riesgos",
      "Documentos",
      "Acciones de la revisión previa",
    ])
  })

  it("cada métrica tiene un tono válido cuando lo declara", () => {
    for (const b of snapshotBlocks(fullSnapshot)) {
      for (const item of b.items) {
        expect(item.value).toBeTruthy()
        expect(item.label).toBeTruthy()
        if (item.tone) expect(METRIC_TONES).toContain(item.tone)
      }
    }
  })

  it("formatea los porcentajes y usa — cuando no hay dato (cumplenPct/controlesATiempoPct null)", () => {
    const full = snapshotBlocks(fullSnapshot)
    const ind = full.find((b) => b.title === "Indicadores")!
    const riesgos = full.find((b) => b.title === "Riesgos")!
    expect(ind.items[0].value).toBe("80%")
    expect(riesgos.items.find((i) => i.label === "controles a tiempo")!.value).toBe("90%")

    const zero = snapshotBlocks(zeroSnapshot)
    const indZ = zero.find((b) => b.title === "Indicadores")!
    const riesgosZ = zero.find((b) => b.title === "Riesgos")!
    expect(indZ.items[0].value).toBe("—")
    expect(riesgosZ.items.find((i) => i.label === "controles a tiempo")!.value).toBe("—")
  })

  it("resalta los valores con carga (NC abiertas→advertencia, no cumplen→error, riesgos altos→error)", () => {
    const b = snapshotBlocks(fullSnapshot)
    const nc = b.find((x) => x.title === "No conformidades")!
    const ind = b.find((x) => x.title === "Indicadores")!
    const riesgos = b.find((x) => x.title === "Riesgos")!
    expect(nc.items.find((i) => i.label === "abiertas")!.tone).toBe("advertencia")
    expect(nc.items.find((i) => i.label === "eficaces")!.tone).toBe("exito")
    expect(ind.items.find((i) => i.label === "no cumplen")!.tone).toBe("error")
    expect(riesgos.items.find((i) => i.label === "altos")!.tone).toBe("error")
  })

  it("en cero no marca carga (abiertas/no cumplen/altos → texto)", () => {
    const b = snapshotBlocks(zeroSnapshot)
    const nc = b.find((x) => x.title === "No conformidades")!
    const ind = b.find((x) => x.title === "Indicadores")!
    const riesgos = b.find((x) => x.title === "Riesgos")!
    expect(nc.items.find((i) => i.label === "abiertas")!.tone).toBe("texto")
    expect(ind.items.find((i) => i.label === "no cumplen")!.tone).toBe("texto")
    expect(riesgos.items.find((i) => i.label === "altos")!.tone).toBe("texto")
  })
})
