// Motor SPC (compute-only, puro) — carta de individuos I-MR, capacidad Cp/Cpk y reglas de descontrol.
// Arquitectura: docs/spc/ARQUITECTURA.md, ADR-121/122/123. Sin estado, sin acceso a datos: testeable.

/** Mínimo de puntos para calcular límites de control con sentido. */
export const SPC_MIN_POINTS = 10

/** Constantes I-MR para n=2 (rango móvil de 2 observaciones). */
const D2 = 1.128 // d2
const E2 = 2.66 // 3/d2
const D4 = 3.267 // D4 para el rango móvil

export type SpcRule = "fuera_3sigma" | "racha_8" | "tendencia_6"

export interface SpcSignal {
  /** Índice (0-based) del punto marcado. Para racha/tendencia, el último del tramo. */
  index: number
  rule: SpcRule
}

export interface ImrResult {
  n: number
  xbar: number
  mrbar: number
  sigma: number | null
  uclX: number | null
  lclX: number | null
  uclMr: number
  lclMr: number
  /** Rangos móviles; mr[0] corresponde al 2.º punto (el 1.º no tiene MR). */
  mr: number[]
  hasLimits: boolean
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Carta de individuos + rango móvil. Con < 2 puntos no hay MR; con < SPC_MIN_POINTS no dibuja límites. */
export function computeImr(values: number[]): ImrResult {
  const n = values.length
  const xbar = mean(values)
  const mr: number[] = []
  for (let i = 1; i < n; i++) mr.push(Math.abs(values[i] - values[i - 1]))
  const mrbar = mean(mr)
  const hasLimits = n >= SPC_MIN_POINTS && mrbar > 0
  const sigma = mrbar > 0 ? mrbar / D2 : null
  return {
    n, xbar, mrbar, sigma,
    uclX: hasLimits ? xbar + E2 * mrbar : null,
    lclX: hasLimits ? xbar - E2 * mrbar : null,
    uclMr: D4 * mrbar,
    lclMr: 0,
    mr, hasLimits,
  }
}

export interface Capability {
  cp: number | null
  cpk: number | null
}

/** Cp/Cpk con LSL/USL del plan. σ̂ = MR̄/d2. "no calculable" (null) si falta σ̂ o límites. */
export function computeCapability(xbar: number, sigma: number | null, lsl: number | null, usl: number | null): Capability {
  if (sigma === null || sigma <= 0) return { cp: null, cpk: null }
  const cp = lsl !== null && usl !== null ? (usl - lsl) / (6 * sigma) : null
  const cpu = usl !== null ? (usl - xbar) / (3 * sigma) : null
  const cpl = lsl !== null ? (xbar - lsl) / (3 * sigma) : null
  const sides = [cpu, cpl].filter((v): v is number => v !== null)
  const cpk = sides.length ? Math.min(...sides) : null
  return { cp, cpk }
}

/**
 * Reglas de descontrol (subconjunto Western Electric/Nelson), solo con límites presentes:
 * (1) fuera de ±3σ; (2) racha de 8 puntos del mismo lado de la línea central;
 * (3) tendencia de 6 puntos consecutivos subiendo o bajando.
 */
export function detectSignals(values: number[], xbar: number, uclX: number | null, lclX: number | null): SpcSignal[] {
  const out: SpcSignal[] = []
  if (uclX === null || lclX === null) return out

  // (1) Fuera de 3σ.
  values.forEach((v, i) => {
    if (v > uclX || v < lclX) out.push({ index: i, rule: "fuera_3sigma" })
  })

  // (2) Racha de 8 del mismo lado (ignora puntos exactamente en la línea central).
  let up = 0
  let down = 0
  values.forEach((v, i) => {
    if (v > xbar) { up++; down = 0 } else if (v < xbar) { down++; up = 0 } else { up = 0; down = 0 }
    if (up >= 8 || down >= 8) out.push({ index: i, rule: "racha_8" })
  })

  // (3) Tendencia de 6 consecutivos subiendo o bajando (7 puntos → 6 saltos).
  let inc = 0
  let dec = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) { inc++; dec = 0 } else if (values[i] < values[i - 1]) { dec++; inc = 0 } else { inc = 0; dec = 0 }
    if (inc >= 6 || dec >= 6) out.push({ index: i, rule: "tendencia_6" })
  }

  return out
}

export const SPC_RULE_LABELS: Record<SpcRule, string> = {
  fuera_3sigma: "Punto fuera de 3σ",
  racha_8: "Racha de 8 del mismo lado",
  tendencia_6: "Tendencia de 6 puntos",
}

/** Semáforo de capacidad por Cpk: ≥1.33 bien, 1.00–1.33 medio, <1.00 bajo. */
export function capabilityTone(cpk: number | null): "exito" | "advertencia" | "error" | "neutro" {
  if (cpk === null) return "neutro"
  if (cpk >= 1.33) return "exito"
  if (cpk >= 1.0) return "advertencia"
  return "error"
}
