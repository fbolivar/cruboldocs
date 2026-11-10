import "server-only"

// Período y límite del agente, sin dependencias pesadas (reutilizable desde la capa de datos y
// las rutas). El consumo real lo valida la función `ai_agent_consume` en la base.

/** Período 'YYYY-MM' en America/Bogota (igual que el contador de uso en la base). */
export function currentPeriod(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7)
}

/** Límite mensual de acciones del agente por organización (configurable por entorno). */
export function monthlyLimit(): number {
  const n = Number(process.env.AI_AGENT_MONTHLY_LIMIT)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 200
}
