import { NextResponse } from "next/server"

import { apiError, authenticate, dbWriteError, finishWrite, getIdempotent, pageParams, readJson, resolveProcess } from "@/lib/api/keys"
import { readPqrs } from "@/lib/api/read"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await authenticate(request, "read:pqrs")
  if (!auth.ok) return auth.response
  const page = pageParams(request.url)
  const data = await readPqrs(auth.org, page)
  return NextResponse.json({ data, nextOffset: data.length === page.limit ? page.offset + page.limit : null })
}

export async function POST(request: Request) {
  const auth = await authenticate(request, "write:pqrs")
  if (!auth.ok) return auth.response
  const idem = request.headers.get("idempotency-key")
  const prev = await getIdempotent(auth.org, idem)
  if (prev) return NextResponse.json(prev, { status: 201 })
  const body = await readJson(request)
  if (!body) return apiError(400, "Cuerpo JSON no válido")
  const type = String(body.type ?? ""), channel = String(body.channel ?? ""), description = String(body.description ?? "")
  if (!type || !channel || !description) return apiError(400, "Faltan campos: type, channel, description")
  const process = await resolveProcess(auth.org, body.processCode)
  const received = typeof body.receivedDate === "string" ? body.receivedDate : null
  const dueDays = Number.isInteger(body.dueDays) ? (body.dueDays as number) : null
  const { data, error } = await createAdminClient().rpc("api_create_pqrs", {
    p_org: auth.org, p_actor: auth.actor, p_type: type, p_channel: channel,
    p_customer_name: typeof body.customerName === "string" ? body.customerName : "",
    p_customer_contact: typeof body.customerContact === "string" ? body.customerContact : "",
    p_process: process as unknown as string, p_description: description,
    p_received: received as unknown as string, p_due_days: dueDays as unknown as number,
  })
  if (error) return dbWriteError(error)
  return finishWrite(auth.org, idem, { code: data?.[0]?.code ?? null })
}
