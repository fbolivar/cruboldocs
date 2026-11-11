import { NextResponse } from "next/server"

import { COPILOT_TOOL_NAMES, resolveRecord, runCopilotTool, type CopilotEntity } from "@/lib/agente/copilot"
import { getCurrentUser, isAgentEnabled } from "@/lib/data/queries"
import { isSameOrigin } from "@/lib/http/same-origin"

// Ejecuta una propuesta del copiloto que el usuario YA confirmó. No llama a Claude ni consume uso:
// resuelve el registro por su referencia (NC por código, riesgo por id), verifica que el usuario lo
// GESTIONA (defensa en profundidad; las acciones de dominio ya aplican RLS/rol), y corre la acción
// con la sesión del usuario. El id real del registro lo pone el servidor, nunca el modelo.
export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!user.organization.id) return NextResponse.json({ error: "Sin organización activa" }, { status: 400 })
  if (!(await isAgentEnabled())) return NextResponse.json({ error: "El agente no está disponible." }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  const entity = (body as { entity?: unknown }).entity
  const ref = (body as { ref?: unknown }).ref
  const tool = (body as { tool?: unknown }).tool
  const input = (body as { input?: unknown }).input
  if ((entity !== "nc" && entity !== "riesgo") || typeof ref !== "string" || !ref) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  if (typeof tool !== "string" || !COPILOT_TOOL_NAMES.includes(tool)) {
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
  }

  const record = await resolveRecord(entity as CopilotEntity, ref)
  if (!record || !record.canManage) {
    return NextResponse.json({ error: "No puedes gestionar este registro." }, { status: 403 })
  }

  const result = await runCopilotTool(entity as CopilotEntity, record.id, tool, input)
  return NextResponse.json(result, { status: result.ok ? 200 : 422 })
}
