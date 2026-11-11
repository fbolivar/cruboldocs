import "server-only"

import { createHmac } from "crypto"

import { createAdminClient } from "@/lib/supabase/server"

const MAX_ATTEMPTS = 6
const TIMEOUT_MS = 8000

export function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex")
}

type DeliveryRow = {
  id: string
  organization_id: string
  event: string
  payload: unknown
  attempts: number
  created_at: string
  endpoint: { url: string; secret: string; revoked_at: string | null } | null
}

/** Entrega las notificaciones pendientes/ vencidas: POST firmado (HMAC) con reintentos y backoff.
 *  Se invoca tras un evento (after) y en el cron. Devuelve cuántas se enviaron/fallaron. */
export async function deliverWebhooks(limit = 50): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("webhook_deliveries")
    .select("id, organization_id, event, payload, attempts, created_at, endpoint:webhook_endpoints(url, secret, revoked_at)")
    .eq("status", "pendiente")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit)
  const rows = (data ?? []) as unknown as DeliveryRow[]
  let sent = 0
  let failed = 0

  for (const d of rows) {
    if (!d.endpoint || d.endpoint.revoked_at) {
      await admin.from("webhook_deliveries").update({ status: "fallido", last_error: "endpoint revocado" }).eq("id", d.id)
      continue
    }
    const envelope = JSON.stringify({
      id: d.id, event: d.event, occurredAt: d.created_at, organization: d.organization_id, data: d.payload,
    })
    const signature = signBody(d.endpoint.secret, envelope)
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const res = await fetch(d.endpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-crubol-event": d.event,
          "x-crubol-delivery": d.id,
          "x-crubol-signature": `sha256=${signature}`,
        },
        body: envelope,
        signal: controller.signal,
      }).finally(() => clearTimeout(t))
      if (res.ok) {
        await admin.from("webhook_deliveries").update({ status: "enviado", attempts: d.attempts + 1 }).eq("id", d.id)
        sent++
      } else {
        await markRetry(admin, d, `HTTP ${res.status}`)
        failed++
      }
    } catch (e) {
      await markRetry(admin, d, e instanceof Error ? e.message : "error de red")
      failed++
    }
  }
  return { sent, failed }
}

async function markRetry(admin: ReturnType<typeof createAdminClient>, d: DeliveryRow, error: string) {
  const attempts = d.attempts + 1
  if (attempts >= MAX_ATTEMPTS) {
    await admin.from("webhook_deliveries").update({ status: "fallido", attempts, last_error: error }).eq("id", d.id)
    return
  }
  const next = new Date(Date.now() + Math.pow(2, attempts) * 60_000).toISOString()
  await admin.from("webhook_deliveries").update({ attempts, last_error: error, next_attempt_at: next }).eq("id", d.id)
}
