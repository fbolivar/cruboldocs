import { NextResponse } from "next/server"

import { apiError, authenticate, dbWriteError, finishWrite, getIdempotent, readJson, resolveIndicator } from "@/lib/api/keys"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await authenticate(request, "write:indicators")
  if (!auth.ok) return auth.response
  const idem = request.headers.get("idempotency-key")
  const prev = await getIdempotent(auth.org, idem)
  if (prev) return NextResponse.json(prev, { status: 201 })
  const body = await readJson(request)
  if (!body) return apiError(400, "Cuerpo JSON no válido")
  const indicator = await resolveIndicator(auth.org, body.indicatorCode)
  if (!indicator) return apiError(400, "indicatorCode no encontrado")
  const period = typeof body.period === "string" ? body.period : null
  const num = (v: unknown) => (typeof v === "number" ? v : null)
  const { data, error } = await createAdminClient().rpc("api_record_measurement", {
    p_org: auth.org, p_actor: auth.actor, p_indicator: indicator, p_period: period as unknown as string,
    p_value: num(body.value) as unknown as number, p_numerator: num(body.numerator) as unknown as number,
    p_denominator: num(body.denominator) as unknown as number, p_note: typeof body.note === "string" ? body.note : "",
  })
  if (error) return dbWriteError(error)
  return finishWrite(auth.org, idem, { indicatorCode: body.indicatorCode, compliance: data })
}
