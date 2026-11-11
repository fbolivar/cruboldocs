import "server-only"

import { isAllowedChatUrl, type ChatProvider } from "@/lib/chat/events"

// Envío a Slack/Teams por incoming webhook (solo servidor). La validación de host vive en events.ts.

export { CHAT_EVENTS, CHAT_EVENT_LABELS, isAllowedChatUrl, maskChatUrl, eventText } from "@/lib/chat/events"
export type { ChatEvent, ChatProvider } from "@/lib/chat/events"

const TIMEOUT_MS = 8000

function body(provider: ChatProvider, text: string): string {
  if (provider === "teams") {
    return JSON.stringify({ "@type": "MessageCard", "@context": "https://schema.org/extensions", summary: "CrubolDocs", text })
  }
  return JSON.stringify({ text })
}

/** POST del mensaje al canal. Rechaza (sin enviar) cualquier URL fuera de la lista blanca. */
export async function sendChat(provider: ChatProvider, url: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!isAllowedChatUrl(url)) return { ok: false, error: "URL no permitida (solo Slack o Teams)" }
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body(provider, text),
      signal: controller.signal,
    }).finally(() => clearTimeout(t))
    if (res.ok) return { ok: true }
    return { ok: false, error: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "error de red" }
  }
}
