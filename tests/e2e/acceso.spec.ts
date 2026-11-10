import { expect, test } from "@playwright/test"

// Flujos sin sesión: rutas protegidas, formularios de acceso e invitación inválida.

test.describe("rutas protegidas sin sesión", () => {
  for (const path of ["/", "/app", "/app/documentos", "/app/documentos/00000000-0000-0000-0000-000000000000", "/app/riesgos", "/app/no-conformidades", "/app/no-conformidades/NC-2026-001", "/app/auditorias", "/app/auditorias/AUD-2026-001", "/app/indicadores", "/app/indicadores/IND-2026-001", "/app/revisiones", "/app/revisiones/RD-2026-001", "/app/competencias", "/app/competencias/catalogo", "/app/competencias/formacion", "/app/competencias/personas/00000000-0000-0000-0000-000000000000", "/app/proveedores", "/app/proveedores/PRV-2026-001", "/app/admin"]) {
    test(`${path} redirige a /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole("heading", { level: 1, name: "Ingresa a CrubolDocs" })).toBeVisible()
    })
  }
})

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("valida los campos antes de enviar y enfoca el primero con error", async ({ page }) => {
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page.getByText("Escribe tu correo.")).toBeVisible()
    await expect(page.getByText("Escribe tu contraseña.")).toBeVisible()
    await expect(page.getByLabel("Correo")).toBeFocused()
  })

  test("rechaza un correo mal escrito", async ({ page }) => {
    await page.getByLabel("Correo").fill("laura-arroba-acme")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page.getByText(/Escribe un correo válido/)).toBeVisible()
  })

  test("no envía credenciales sin resolver el CAPTCHA", async ({ page }) => {
    // Sin token de Turnstile el formulario se detiene en el navegador: ninguna acción de servidor.
    await page.route("https://challenges.cloudflare.com/**", (route) => route.abort())
    await page.reload()
    const serverActions: string[] = []
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"]) serverActions.push(r.url())
    })
    await page.getByLabel("Correo").fill("nadie@ejemplo.co")
    await page.getByLabel("Contraseña", { exact: true }).fill("contraseña-falsa-123")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page.getByText("Espera a que se complete la verificación de seguridad.")).toBeVisible()
    expect(serverActions).toEqual([])
  })

  test("enlaza a recuperar contraseña", async ({ page }) => {
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click()
    await expect(page).toHaveURL(/\/recuperar$/)
    await page.getByRole("button").filter({ hasText: /enlace|Enviar/i }).first().click()
    await expect(page.getByText("Escribe tu correo.")).toBeVisible()
  })

  test("la página no tiene desplazamiento horizontal", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe("invitación", () => {
  test("un token inexistente muestra el mismo mensaje que uno vencido", async ({ page }) => {
    await page.goto("/invitacion/token-que-no-existe-0123456789abcdef")
    await expect(page.getByRole("heading", { name: "Esta invitación venció o ya fue usada." })).toBeVisible()
    await expect(page.getByRole("link", { name: "¿Ya tienes cuenta? Ingresa" })).toHaveAttribute("href", "/login")
  })

  test("un token con formato inválido no llega a la base", async ({ page }) => {
    await page.goto("/invitacion/corto")
    await expect(page.getByRole("heading", { name: "Esta invitación venció o ya fue usada." })).toBeVisible()
  })
})

test.describe("páginas públicas", () => {
  test("política de tratamiento de datos (Ley 1581)", async ({ page }) => {
    await page.goto("/tratamiento-de-datos")
    await expect(page.getByRole("heading", { level: 1, name: "Política de tratamiento de datos personales" })).toBeVisible()
  })

  test("robots.txt deja fuera la app y las invitaciones", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text()
    expect(body).toContain("Disallow: /app")
    expect(body).toContain("Disallow: /invitacion")
    expect(body).toContain("Allow: /tratamiento-de-datos")
  })

  test("página inexistente muestra el 404 propio", async ({ page }) => {
    const res = await page.goto("/no-existe-esta-ruta")
    expect(res?.status()).toBe(404)
    await expect(page.getByText("No encontramos esta página.")).toBeVisible()
  })
})
