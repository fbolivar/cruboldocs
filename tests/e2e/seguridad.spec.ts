import { expect, test } from "@playwright/test"

// Cabeceras y endpoints sensibles (MED-03, cron). Solo peticiones HTTP, sin navegador.
test.describe("cabeceras de seguridad", () => {
  test("login: CSP con nonce y cabeceras anti-clickjacking", async ({ request }) => {
    const res = await request.get("/login")
    const h = res.headers()
    expect(res.status()).toBe(200)
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/)
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'")
    expect(h["x-frame-options"]).toBe("DENY")
    expect(h["x-content-type-options"]).toBe("nosniff")
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(h["cross-origin-opener-policy"]).toBe("same-origin")
    expect(h["permissions-policy"]).toContain("camera=()")
    expect(h["x-powered-by"]).toBeUndefined()
  })

  test("el nonce cambia en cada petición y es el de los scripts de la página", async ({ request }) => {
    const nonceOf = async () => {
      const res = await request.get("/login")
      const nonce = res.headers()["content-security-policy"].match(/'nonce-([^']+)'/)?.[1]
      return { nonce, html: await res.text() }
    }
    const a = await nonceOf()
    const b = await nonceOf()
    expect(a.nonce).toBeTruthy()
    expect(a.nonce).not.toBe(b.nonce)
    expect(a.html).toContain(`nonce="${a.nonce}"`)
  })

  test("la página de invitación también lleva CSP (el token no se filtra por Referer)", async ({ request }) => {
    const res = await request.get("/invitacion/token-que-no-existe-0123456789abcdef")
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'")
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  })

  test("login sin violaciones de CSP y con Turnstile cargado", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __csp: string[] }
      w.__csp = []
      document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
    })
    await page.goto("/login")
    // El widget de Cloudflare es un iframe (en un shadow DOM cerrado): si la CSP lo bloqueara, no cargaría.
    await expect
      .poll(() => page.frames().some((f) => f.url().startsWith("https://challenges.cloudflare.com/")), { timeout: 15_000 })
      .toBe(true)
    const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)
    expect(violations).toEqual([])
  })
})

test.describe("solo en producción", () => {
  test.skip(!process.env.E2E_PROD && process.env.npm_lifecycle_event !== "test:e2e:prod", "requiere el build (test:e2e:prod)")

  test("HSTS y CSP estricta (sin unsafe-eval, con upgrade-insecure-requests)", async ({ request }) => {
    const h = (await request.get("/login")).headers()
    expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains")
    expect(h["content-security-policy"]).not.toContain("unsafe-eval")
    expect(h["content-security-policy"]).toContain("upgrade-insecure-requests")
  })
})

test.describe("cron diario", () => {
  test("sin secreto → 401", async ({ request }) => {
    const res = await request.get("/api/cron/diario")
    expect(res.status()).toBe(401)
  })
  test("con secreto falso → 401", async ({ request }) => {
    const res = await request.get("/api/cron/diario", { headers: { authorization: "Bearer falso" } })
    expect(res.status()).toBe(401)
  })
})

test.describe("confirmación de correo", () => {
  test("/auth/confirmar sin token no abre sesión", async ({ request }) => {
    const res = await request.get("/auth/confirmar", { maxRedirects: 0 })
    expect([302, 303, 307, 308]).toContain(res.status())
    expect(res.headers()["location"]).not.toMatch(/\/app/)
  })
})
