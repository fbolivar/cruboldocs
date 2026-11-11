import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { deliverWebhooks } from "@/lib/api/webhooks"

// Reintento/entrega de webhooks pendientes. Protegido con CRON_SECRET; se puede programar como cron
// frecuente (plan que lo permita) o invocar desde un scheduler externo. El job diario también entrega.
export const runtime = "nodejs"
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
  const result = await deliverWebhooks(200)
  return NextResponse.json(result)
}
