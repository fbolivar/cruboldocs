// Focos de riesgo (v1.5-4). Señales calculadas de los datos existentes (sin IA, sin tablas).

export type FocoSeverity = "alta" | "media" | "baja"
export type FocoCategory = "vencimiento" | "indicador" | "nc" | "proveedor"

export interface RiskSignal {
  id: string
  category: FocoCategory
  severity: FocoSeverity
  title: string
  detail: string
  /** Enlace a la entidad o lista filtrada (ruta protegida). */
  href: string
}

export const SEVERITY_ORDER: Record<FocoSeverity, number> = { alta: 0, media: 1, baja: 2 }
