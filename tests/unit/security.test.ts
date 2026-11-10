import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Ratelimit simulado: cada prueba decide si el límite responde, bloquea o falla.
const limitMock = vi.fn<(id: string) => Promise<{ success: boolean }>>()
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = () => ({})
    limit = (id: string) => limitMock(id)
  }
  return { Ratelimit }
})
vi.mock("@upstash/redis", () => ({ Redis: class {} }))

const SUPABASE = "https://proyecto.supabase.co"

beforeEach(() => {
  vi.resetModules()
  limitMock.mockReset()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("CSP (MED-03)", () => {
  const directives = async (env: string) => {
    vi.stubEnv("NODE_ENV", env)
    const { contentSecurityPolicy } = await import("@/lib/security/csp")
    return contentSecurityPolicy("NONCE123").split("; ")
  }

  it("producción: nonce, sin unsafe-eval, sin iframes ajenos y con upgrade", async () => {
    const d = await directives("production")
    const script = d.find((x) => x.startsWith("script-src"))
    expect(script).toContain("'nonce-NONCE123'")
    expect(script).toContain("'strict-dynamic'")
    expect(script).not.toContain("unsafe-eval")
    expect(script).not.toContain("unsafe-inline")
    expect(d).toContain("frame-ancestors 'none'")
    expect(d).toContain("object-src 'none'")
    expect(d).toContain("base-uri 'none'")
    expect(d).toContain("form-action 'self'")
    expect(d).toContain(`connect-src 'self' ${SUPABASE}`)
    expect(d).toContain("upgrade-insecure-requests")
  })
  it("desarrollo: unsafe-eval solo para el HMR y sin upgrade", async () => {
    const d = await directives("development")
    expect(d.find((x) => x.startsWith("script-src"))).toContain("'unsafe-eval'")
    expect(d).not.toContain("upgrade-insecure-requests")
  })
})

describe("ipKey (RA-06: IPv6 por /64)", () => {
  it.each([
    ["190.25.3.4", "190.25.3.4"],
    ["::ffff:190.25.3.4", "190.25.3.4"],
    ["2800:e2:1a00:5f3:1234:5678:9abc:def0", "2800:e2:1a00:5f3::/64"],
    ["2800:e2:1a00:5f3:aaaa::1", "2800:e2:1a00:5f3::/64"],
    ["2800:e2::1", "2800:e2:0:0::/64"],
    ["2800:00e2:0000:05f3::1", "2800:e2:0:5f3::/64"],
  ])("%s → %s", async (ip, key) => {
    const { ipKey } = await import("@/lib/security/rate-limit")
    expect(ipKey(ip)).toBe(key)
  })
  it("dos direcciones del mismo /64 comparten límite", async () => {
    const { ipKey } = await import("@/lib/security/rate-limit")
    expect(ipKey("2800:e2:1a00:5f3::1")).toBe(ipKey("2800:e2:1a00:5f3:ffff:ffff:ffff:ffff"))
  })
  it("sin IP → null", async () => {
    const { ipKey } = await import("@/lib/security/rate-limit")
    expect(ipKey(null)).toBeNull()
  })
})

describe("withinLimits (ALTA-03)", () => {
  const withUpstash = () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.test")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t")
    vi.spyOn(console, "error").mockImplementation(() => {})
  }

  it("dentro del límite en todas las claves → true", async () => {
    withUpstash()
    limitMock.mockResolvedValue({ success: true })
    const { withinLimits } = await import("@/lib/security/rate-limit")
    expect(await withinLimits([["login:ip", "1.2.3.4"], ["login:correo", "a@b.co"]])).toBe(true)
  })
  it("una clave excedida bloquea el intento", async () => {
    withUpstash()
    limitMock.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false })
    const { withinLimits } = await import("@/lib/security/rate-limit")
    expect(await withinLimits([["login:ip", "1.2.3.4"], ["login:correo", "a@b.co"]])).toBe(false)
  })
  it("no guarda correos en Redis: el identificador va como SHA-256", async () => {
    withUpstash()
    limitMock.mockResolvedValue({ success: true })
    const { withinLimits } = await import("@/lib/security/rate-limit")
    await withinLimits([["login:correo", "laura@acme.co"]])
    expect(limitMock.mock.calls[0][0]).toMatch(/^[0-9a-f]{64}$/)
  })
  it("Upstash caído: permite si hay CAPTCHA, niega con failClosed (firma, MFA, contraseña)", async () => {
    withUpstash()
    limitMock.mockRejectedValue(new Error("timeout"))
    const { withinLimits } = await import("@/lib/security/rate-limit")
    expect(await withinLimits([["login:ip", "1.2.3.4"]])).toBe(true)
    expect(await withinLimits([["firma:usuario", "u1"]], { failClosed: true })).toBe(false)
  })
  it("producción sin Upstash configurado falla, no abre", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
    const { withinLimits } = await import("@/lib/security/rate-limit")
    await expect(withinLimits([["login:ip", "1.2.3.4"]])).rejects.toThrow(/UPSTASH/)
  })
})

describe("verifyTurnstile", () => {
  const siteverify = (body: object) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body)))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }
  const prod = () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secreto")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://cruboldocs.crubol.com")
  }

  it("token válido, acción y dominio correctos → true", async () => {
    prod()
    const fetchMock = siteverify({ success: true, action: "login", hostname: "cruboldocs.crubol.com" })
    const { verifyTurnstile } = await import("@/lib/security/turnstile")
    expect(await verifyTurnstile("tok", "login", "1.2.3.4")).toBe(true)
    const sent = fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }]
    // `remoteip` ya NO se envía (frágil tras CDN); el control por IP vive en el rate limiting.
    expect(sent[1].body.get("remoteip")).toBeNull()
    expect(sent[1].body.get("response")).toBe("tok")
  })
  it("token de otra acción (reutilizado de recuperar) → false", async () => {
    prod()
    siteverify({ success: true, action: "recuperar", hostname: "cruboldocs.crubol.com" })
    const { verifyTurnstile } = await import("@/lib/security/turnstile")
    expect(await verifyTurnstile("tok", "login", null)).toBe(false)
  })
  it("token emitido en localhost o un preview no vale en producción (RA-09)", async () => {
    prod()
    siteverify({ success: true, action: "login", hostname: "localhost" })
    const { verifyTurnstile } = await import("@/lib/security/turnstile")
    expect(await verifyTurnstile("tok", "login", null)).toBe(false)
  })
  it("sin token o demasiado largo → false sin llamar a Cloudflare", async () => {
    prod()
    const fetchMock = siteverify({ success: true })
    const { verifyTurnstile } = await import("@/lib/security/turnstile")
    expect(await verifyTurnstile(undefined, "login", null)).toBe(false)
    expect(await verifyTurnstile("x".repeat(2049), "login", null)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it("Cloudflare no responde → false (falla cerrado)", async () => {
    prod()
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("red"))))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { verifyTurnstile } = await import("@/lib/security/turnstile")
    expect(await verifyTurnstile("tok", "login", null)).toBe(false)
  })
  it("producción sin secreta configurada lanza error", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "")
    const { verifyTurnstile } = await import("@/lib/security/turnstile")
    await expect(verifyTurnstile("tok", "login", null)).rejects.toThrow(/TURNSTILE_SECRET_KEY/)
  })
})
