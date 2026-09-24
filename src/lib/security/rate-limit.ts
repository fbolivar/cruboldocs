import "server-only"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { sha256Hex } from "@/lib/data/hash"

// Límites de intentos (AUD-20260924 ALTA-03) con Upstash Redis, por IP real y por
// identificador (correo, token o usuario). Ventana deslizante.
type Rule = { limit: number; window: `${number} m` | `${number} h` }

const RULES = {
  "login:ip": { limit: 20, window: "10 m" },
  "login:correo": { limit: 8, window: "15 m" },
  "recuperar:ip": { limit: 5, window: "15 m" },
  "recuperar:correo": { limit: 3, window: "1 h" },
  "invitacion:ip": { limit: 10, window: "15 m" },
  "invitacion:token": { limit: 10, window: "1 h" },
  "firma:usuario": { limit: 5, window: "15 m" },
} satisfies Record<string, Rule>

export type LimitKey = keyof typeof RULES

export const TOO_MANY = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."

let redis: Redis | null | undefined
const limiters = new Map<LimitKey, Ratelimit>()

function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new Error("Faltan UPSTASH_REDIS_REST_URL/TOKEN en producción.")
    console.warn("rate-limit: Upstash sin configurar; límites desactivados en desarrollo.")
    redis = null
  } else {
    redis = new Redis({ url, token })
  }
  return redis
}

function limiter(key: LimitKey): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  let l = limiters.get(key)
  if (!l) {
    const rule: Rule = RULES[key]
    l = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
      prefix: `crubol:rl:${key}`,
      timeout: 2000,
    })
    limiters.set(key, l)
  }
  return l
}

/**
 * true si todas las claves están dentro del límite. Cada intento cuenta en todas.
 * Los identificadores se guardan como hash (sin correos ni tokens en Redis).
 * Si Upstash no responde se permite el intento (disponibilidad); el CAPTCHA sigue aplicando.
 */
export async function withinLimits(checks: [LimitKey, string | null | undefined][]): Promise<boolean> {
  const results = await Promise.all(
    checks.map(async ([key, id]) => {
      const l = limiter(key)
      if (!l) return true
      try {
        const { success } = await l.limit(sha256Hex(id || "desconocido"))
        return success
      } catch (e) {
        console.error("rate-limit", key, e)
        return true
      }
    })
  )
  return results.every(Boolean)
}
