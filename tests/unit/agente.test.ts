import { afterEach, describe, expect, it, vi } from "vitest"

import { isSameOrigin } from "@/lib/http/same-origin"

// Control anti-CSRF de las rutas del agente: un POST entre orígenes (el navegador siempre manda
// `Origin`) se rechaza; el mismo origen y los clientes sin `Origin` se permiten.
function req(headers: Record<string, string>): Request {
  return new Request("https://cruboldocs.crubol.com/api/agente", { method: "POST", headers })
}

afterEach(() => vi.unstubAllEnvs())

describe("isSameOrigin", () => {
  it("permite mismo origen (Origin coincide con Host)", () => {
    expect(isSameOrigin(req({ origin: "https://cruboldocs.crubol.com", host: "cruboldocs.crubol.com" }))).toBe(true)
  })

  it("permite cuando coincide con x-forwarded-host (detrás de proxy)", () => {
    expect(
      isSameOrigin(req({ origin: "https://cruboldocs.crubol.com", host: "interno.vercel.app", "x-forwarded-host": "cruboldocs.crubol.com" }))
    ).toBe(true)
  })

  it("permite cuando coincide con NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://cruboldocs.crubol.com")
    expect(isSameOrigin(req({ origin: "https://cruboldocs.crubol.com", host: "otro" }))).toBe(true)
  })

  it("rechaza un origen distinto (CSRF)", () => {
    expect(isSameOrigin(req({ origin: "https://malicioso.example", host: "cruboldocs.crubol.com" }))).toBe(false)
  })

  it("rechaza un Origin mal formado", () => {
    expect(isSameOrigin(req({ origin: "no-es-url", host: "cruboldocs.crubol.com" }))).toBe(false)
  })

  it("permite sin Origin (cliente no-navegador o navegación same-origin)", () => {
    expect(isSameOrigin(req({ host: "cruboldocs.crubol.com" }))).toBe(true)
  })
})
