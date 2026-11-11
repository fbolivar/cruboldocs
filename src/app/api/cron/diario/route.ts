import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { deliverWebhooks } from "@/lib/api/webhooks"
import { flushOutbox } from "@/lib/email/outbox"
import { createAdminClient } from "@/lib/supabase/server"

// Job diario (ADR-003): Vercel Cron llama con `Authorization: Bearer <CRON_SECRET>`.
// Genera tareas de revisión vencida, controles y recertificación, y vacía el outbox.
export const maxDuration = 60

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { data, error } = await createAdminClient().rpc("run_daily_jobs")
  if (error) {
    console.error("run_daily_jobs", error)
    return NextResponse.json({ error: "Falló el job diario" }, { status: 500 })
  }
  const mail = await flushOutbox(200)
  const hooks = await deliverWebhooks(200)
  return NextResponse.json({ tareas: data, correos: mail, webhooks: hooks })
}
