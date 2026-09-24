import "server-only"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { sha256Hex } from "@/lib/data/hash"

// Límites de intentos (AUD-20260924 ALTA-03) con Upstash Redis, por IP real y por
// identificador (correo, token o usuario). Ventana deslizante.
type Rule = { limit: number; window: `${number} m` | `${number} h` }

const RULES = {
  "login:ip": { limit: 20, window: "10 m" },
  // Por correo desde una IP (bloqueo rápido) y por correo desde cualquier IP, contando solo
  // contraseñas incorrectas (AUD RA-01: nadie bloquea una cuenta ajena sin intentar credenciales).
  "login:correo_ip": { limit: 8, window: "15 m" },
  "login:correo": { limit: 30, window: "15 m" },
  "recuperar:ip": { limit: 5, window: "15 m" },
  "recuperar:correo": { limit: 3, window: "1 h" },
  "invitacion:ip": { limit: 10, window: "15 m" },
  "invitacion:token": { limit: 10, window: "1 h" },
  "firma:usuario": { limit: 5, window: "15 m" },
  "mfa:usuario": { limit: 5, window: "15 m" },
  "contrasena:usuario": { limit: 5, window: "15 m" },
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
 * Clave de una IP para los límites: IPv4 completa; IPv6 por su prefijo /64, que es lo que
 * suele recibir un solo cliente (AUD RA-06).
 */
export function ipKey(ip: string | null | undefined): string | null {
  if (!ip || !ip.includes(":")) return ip ?? null
  const [head, tail = ""] = ip.toLowerCase().split("::")
  const h = head ? head.split(":") : []
  const t = tail ? tail.split(":") : []
  const groups = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`
}

const hashId = (key: LimitKey, id: string | null | undefined) =>
  sha256Hex((key.endsWith(":ip") ? ipKey(id) : id) || "desconocido")

type Options = {
  /** Si Upstash no responde, negar el intento (flujos sin CAPTCHA: firma, MFA, contraseña). */
  failClosed?: boolean
}

/**
 * true si todas las claves están dentro del límite. Cada intento cuenta en todas.
 * Los identificadores se guardan como hash (sin correos ni tokens en Redis).
 * Si Upstash no responde se permite el intento (el CAPTCHA sigue aplicando), salvo `failClosed`.
 */
export async function withinLimits(checks: [LimitKey, string | null | undefined][], opts: Options = {}): Promise<boolean> {
  const results = await Promise.all(
    checks.map(async ([key, id]) => {
      const l = limiter(key)
      if (!l) return true
      try {
        const { success } = await l.limit(hashId(key, id))
        return success
      } catch (e) {
        console.error("rate-limit", key, e)
        return !opts.failClosed
      }
    })
  )
  return results.every(Boolean)
}

/** true si a la clave todavía le quedan intentos, sin consumir uno. */
export async function hasAttemptsLeft(key: LimitKey, id: string | null | undefined): Promise<boolean> {
  const l = limiter(key)
  if (!l) return true
  try {
    return (await l.getRemaining(hashId(key, id))).remaining > 0
  } catch (e) {
    console.error("rate-limit", key, e)
    return true
  }
}

/** Registra un intento fallido en la clave. */
export async function recordFailure(key: LimitKey, id: string | null | undefined): Promise<void> {
  await withinLimits([[key, id]])
}
