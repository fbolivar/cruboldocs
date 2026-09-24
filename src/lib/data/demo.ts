// ⚠️ SOLO DESARROLLO (MOCK). Sesión y escenarios simulados mientras no existe backend.
// Se eliminan en la fase backend junto con mock-data.ts.

import { cookies } from "next/headers"

import { demoUsers } from "@/lib/data/mock-data"
import type { CurrentUser } from "@/lib/types"

export const DEMO_USER_COOKIE = "demo_usuario"
export const DEMO_SCENARIO_COOKIE = "demo_estado"

export type DemoScenario = "normal" | "vacio" | "error" | "carga"
export const DEMO_SCENARIOS: { id: DemoScenario; label: string }[] = [
  { id: "normal", label: "Datos de ejemplo" },
  { id: "vacio", label: "Vacío" },
  { id: "error", label: "Error" },
  { id: "carga", label: "Carga lenta" },
]

export async function demoScenario(): Promise<DemoScenario> {
  if (process.env.NODE_ENV === "production") return "normal"
  const value = (await cookies()).get(DEMO_SCENARIO_COOKIE)?.value
  return DEMO_SCENARIOS.some((s) => s.id === value) ? (value as DemoScenario) : "normal"
}

/** Simula latencia y fallos según el escenario activo. Devuelve true si debe responder vacío. */
export async function simulate(): Promise<boolean> {
  const scenario = await demoScenario()
  const ms = scenario === "carga" ? 2500 : 150
  await new Promise((r) => setTimeout(r, ms))
  if (scenario === "error") throw new Error("Escenario de demostración: error simulado")
  return scenario === "vacio"
}

export async function demoUser(): Promise<CurrentUser> {
  const id = (await cookies()).get(DEMO_USER_COOKIE)?.value
  return (demoUsers.find((d) => d.user.id === id) ?? demoUsers[0]).user
}
