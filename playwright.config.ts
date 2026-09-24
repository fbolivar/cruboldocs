import { defineConfig, devices } from "@playwright/test"

// E2E contra la app local (puerto 3001). Solo flujos que no escriben en la base: el proyecto
// Supabase es el real y no hay rama de pruebas (decisión de Fernando, 2026-09-24). El flujo
// completo con datos (registrar → revisar → aprobar → leer) lo cubren las pruebas RLS y la
// prueba manual de docs/QA-CHECKLIST.md.
// `npm run test:e2e:prod` (o E2E_PROD=1): contra el build de producción (`npm run build` antes), puerto 3002.
const PROD = !!process.env.E2E_PROD || process.env.npm_lifecycle_event === "test:e2e:prod"
const BASE_URL = process.env.E2E_BASE_URL ?? (PROD ? "http://localhost:3002" : "http://localhost:3001")

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    locale: "es-CO",
    timezoneId: "America/Bogota",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  // Reutiliza el servidor si ya corre (lanzar el dev desde PowerShell: next/font falla en Git Bash).
  webServer: {
    command: PROD ? "npm run start -- -p 3002" : "npm run dev -- -p 3001",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
