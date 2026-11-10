import { NextResponse } from "next/server"

import { runTool, TOOL_NAMES } from "@/lib/agente/tools"
import { getCurrentUser, isAgentEnabled } from "@/lib/data/queries"
import { isSameOrigin } from "@/lib/http/same-origin"
import { canManageCatalog } from "@/lib/domain/access"

// Ejecuta una acción del agente que el usuario YA confirmó. No llama a Claude ni consume uso: solo
// corre la acción de dominio (crear proceso / tipo / cargo) con la sesión del usuario, de modo que
// RLS y validación aplican igual que desde la interfaz. Además se exige que el agente esté
// habilitado para la organización y que el usuario administre el catálogo, para que este endpoint
// no opere cuando la función está apagada (defensa en profundidad; RLS ya impide lo demás).
export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!user.organization.id) return NextResponse.json({ error: "Sin organización activa" }, { status: 400 })
  if (!canManageCatalog(user) || !(await isAgentEnabled())) {
    return NextResponse.json({ error: "El agente no está disponible." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  const tool = (body as { tool?: unknown }).tool
  const input = (body as { input?: unknown }).input
  if (typeof tool !== "string" || !TOOL_NAMES.includes(tool)) {
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
  }

  const result = await runTool(tool, input)
  return NextResponse.json(result, { status: result.ok ? 200 : 422 })
}
