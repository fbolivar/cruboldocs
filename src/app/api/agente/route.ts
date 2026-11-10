import type Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

import { AGENT_MAX_TOKENS, AGENT_MODEL, agentConfigured, anthropic, consumeAgentUse, systemPrompt } from "@/lib/agente/agent"
import { TOOL_SPECS } from "@/lib/agente/tools"
import { getCurrentUser, listDocumentTypes, listPositions, listProcesses } from "@/lib/data/queries"

// Chat de Crubol-Agent. Cada turno cuesta una unidad de uso (control de costo), que la función de
// base consume solo si el agente está habilitado para la organización y quien escribe puede
// administrar el catálogo. El agente solo PROPONE acciones; la ejecución va por /api/agente/ejecutar
// tras la confirmación del usuario. Runtime Node (el SDK de Anthropic no corre en Edge).
export const runtime = "nodejs"
export const maxDuration = 30

const ROLES = new Set(["user", "assistant"])

function parseMessages(body: unknown): Anthropic.MessageParam[] | null {
  if (!body || typeof body !== "object") return null
  const msgs = (body as { messages?: unknown }).messages
  if (!Array.isArray(msgs) || msgs.length === 0 || msgs.length > 50) return null
  for (const m of msgs) {
    if (!m || typeof m !== "object") return null
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (typeof role !== "string" || !ROLES.has(role)) return null
    if (typeof content !== "string" && !Array.isArray(content)) return null
  }
  return msgs as Anthropic.MessageParam[]
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!user.organization.id) return NextResponse.json({ error: "Sin organización activa" }, { status: 400 })
  if (!agentConfigured()) {
    return NextResponse.json({ error: "El agente no está configurado." }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  const messages = parseMessages(body)
  if (!messages) return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 })

  // Cobra el uso (valida habilitación, permiso y límite de forma atómica en la base).
  const used = await consumeAgentUse(user.organization.id)
  if (!used.ok) return NextResponse.json({ error: used.error }, { status: 403 })

  const [processes, types, positions] = await Promise.all([listProcesses(), listDocumentTypes(), listPositions()])
  const system = systemPrompt({
    orgName: user.organization.name,
    userName: user.fullName,
    processes,
    types,
    positions,
  })

  try {
    const reply = await anthropic().messages.create({
      model: AGENT_MODEL,
      max_tokens: AGENT_MAX_TOKENS,
      system,
      tools: TOOL_SPECS,
      messages,
    })
    return NextResponse.json({
      content: reply.content,
      stop_reason: reply.stop_reason,
      remaining: used.data.remaining,
    })
  } catch (e) {
    console.error("crubol-agent chat", e)
    return NextResponse.json({ error: "El agente no pudo responder. Intenta de nuevo." }, { status: 502 })
  }
}
