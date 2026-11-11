import type Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

import { AGENT_MAX_TOKENS, AGENT_MODEL, agentConfigured, anthropic, currentPeriod, monthlyLimit } from "@/lib/agente/agent"
import { buildCopilotSeed, consumeCopilotUse, copilotSystemPrompt, toolsFor, type CopilotEntity } from "@/lib/agente/copilot"
import { getCurrentUser } from "@/lib/data/queries"
import { isSameOrigin } from "@/lib/http/same-origin"
import { TOO_MANY, withinLimits } from "@/lib/security/rate-limit"

// Chat del copiloto (Fase C): sugiere causa/CAPA (NC) o controles/valoración (riesgo) del registro
// abierto. Lee SOLO ese registro (minimizado, sin PII del cliente) y lo arma en el servidor con la
// sesión del usuario (RLS). Cada turno consume una unidad del límite mensual de la organización, y
// solo si el usuario GESTIONA ese registro. La ejecución va por /api/agente/copiloto/ejecutar.
export const runtime = "nodejs"
export const maxDuration = 30

const ROLES = new Set(["user", "assistant"])
const MAX_TOTAL_CHARS = 24_000

function parseMessages(msgs: unknown): Anthropic.MessageParam[] | null {
  if (!Array.isArray(msgs) || msgs.length === 0 || msgs.length > 50) return null
  let total = 0
  for (const m of msgs) {
    if (!m || typeof m !== "object") return null
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (typeof role !== "string" || !ROLES.has(role)) return null
    if (typeof content === "string") total += content.length
    else if (Array.isArray(content)) total += JSON.stringify(content).length
    else return null
  }
  return total > MAX_TOTAL_CHARS ? null : (msgs as Anthropic.MessageParam[])
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!user.organization.id) return NextResponse.json({ error: "Sin organización activa" }, { status: 400 })
  if (!agentConfigured()) return NextResponse.json({ error: "El agente no está configurado." }, { status: 503 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  const entity = (body as { entity?: unknown }).entity
  const ref = (body as { ref?: unknown }).ref
  const messages = parseMessages((body as { messages?: unknown }).messages)
  if ((entity !== "nc" && entity !== "riesgo") || typeof ref !== "string" || !ref || !messages) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  if (!(await withinLimits([["agente:usuario", user.id]]))) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 })
  }

  // Arma el contexto del registro abierto (RLS) y verifica que el usuario lo gestiona.
  const seed = await buildCopilotSeed(entity as CopilotEntity, ref)
  if (!seed) return NextResponse.json({ error: "No puedes usar el copiloto en este registro." }, { status: 403 })

  // Cobra el uso (autoriza por rol gestor y aplica el límite mensual de la organización).
  const used = await consumeCopilotUse(user.organization.id, monthlyLimit(), currentPeriod())
  if (!used.ok) return NextResponse.json({ error: used.error }, { status: 403 })

  const system = copilotSystemPrompt(entity as CopilotEntity, user.fullName, seed.context)

  try {
    const reply = await anthropic().messages.create({
      model: AGENT_MODEL,
      max_tokens: AGENT_MAX_TOKENS,
      system,
      tools: toolsFor(entity as CopilotEntity),
      messages,
    })
    return NextResponse.json({ content: reply.content, stop_reason: reply.stop_reason, remaining: used.data.remaining })
  } catch (e) {
    console.error("crubol-agent copiloto", e)
    return NextResponse.json({ error: "El copiloto no pudo responder. Intenta de nuevo." }, { status: 502 })
  }
}
