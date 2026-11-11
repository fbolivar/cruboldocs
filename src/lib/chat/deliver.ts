import "server-only"

import { createAdminClient } from "@/lib/supabase/server"
import { eventText, sendChat, type ChatProvider } from "@/lib/chat/providers"

const MAX_ATTEMPTS = 6

type OutboxRow = {
  id: string
  event: string
  code: string
  title: string
  attempts: number
  notifier: { provider: string; url: string; enabled: boolean; removed_at: string | null } | null
}

/** Entrega los avisos de chat pendientes: formatea por proveedor y hace POST, con reintentos y
 *  backoff. Se invoca tras un evento (after) y en el cron, igual que los webhooks. */
export async function deliverChat(limit = 50): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("chat_outbox")
    .select("id, event, code, title, attempts, notifier:chat_notifiers(provider, url, enabled, removed_at)")
    .eq("status", "pendiente")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit)
  const rows = (data ?? []) as unknown as OutboxRow[]
  let sent = 0
  let failed = 0

  for (const d of rows) {
    if (!d.notifier || !d.notifier.enabled || d.notifier.removed_at) {
      await admin.from("chat_outbox").update({ status: "fallido", last_error: "canal inactivo" }).eq("id", d.id)
      continue
    }
    const r = await sendChat(d.notifier.provider as ChatProvider, d.notifier.url, eventText(d.event, d.code, d.title))
    if (r.ok) {
      await admin.from("chat_outbox").update({ status: "enviado", attempts: d.attempts + 1, sent_at: new Date().toISOString() }).eq("id", d.id)
      sent++
    } else {
      const attempts = d.attempts + 1
      if (attempts >= MAX_ATTEMPTS) {
        await admin.from("chat_outbox").update({ status: "fallido", attempts, last_error: r.error ?? "error" }).eq("id", d.id)
      } else {
        const next = new Date(Date.now() + Math.pow(2, attempts) * 60_000).toISOString()
        await admin.from("chat_outbox").update({ attempts, last_error: r.error ?? "error", next_attempt_at: next }).eq("id", d.id)
      }
      failed++
    }
  }
  return { sent, failed }
}
