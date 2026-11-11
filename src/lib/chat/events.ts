// Constantes y utilidades puras de notificaciones de chat (seguras en cliente y servidor).

export type ChatProvider = "slack" | "teams"

export const CHAT_EVENTS = ["nc", "pqrs", "salida", "solicitud"] as const
export type ChatEvent = (typeof CHAT_EVENTS)[number]

export const CHAT_EVENT_LABELS: Record<ChatEvent, string> = {
  nc: "Nueva no conformidad",
  pqrs: "Nueva PQRS",
  salida: "Nueva salida no conforme",
  solicitud: "Nueva solicitud",
}

/** true si la URL es https y su host pertenece a Slack o Teams (anti-SSRF, ADR-101). */
export function isAllowedChatUrl(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== "https:") return false
  const host = u.hostname.toLowerCase()
  return host === "hooks.slack.com" || host === "outlook.office.com" || host.endsWith(".webhook.office.com") || host.endsWith(".office.com")
}

/** Enmascara una URL de webhook para mostrarla sin revelar el secreto. */
export function maskChatUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.host}/…${url.slice(-6)}`
  } catch {
    return "(URL inválida)"
  }
}

/** Texto del aviso de un evento: "🔔 <etiqueta> <code> · <título>" (sin PII). */
export function eventText(event: string, code: string, title: string): string {
  const label = CHAT_EVENT_LABELS[event as ChatEvent] ?? event
  const head = [`🔔 ${label}`, code].filter(Boolean).join(" ")
  return title ? `${head} · ${title}` : head
}
