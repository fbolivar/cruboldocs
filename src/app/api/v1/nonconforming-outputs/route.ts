import { NextResponse } from "next/server"

import { apiError, authenticate, dbWriteError, finishWrite, getIdempotent, readJson, resolveProcess } from "@/lib/api/keys"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await authenticate(request, "write:nonconforming_outputs")
  if (!auth.ok) return auth.response
  const idem = request.headers.get("idempotency-key")
  const prev = await getIdempotent(auth.org, idem)
  if (prev) return NextResponse.json(prev, { status: 201 })
  const body = await readJson(request)
  if (!body) return apiError(400, "Cuerpo JSON no válido")
  const description = String(body.description ?? "")
  if (!description) return apiError(400, "Falta el campo: description")
  const process = await resolveProcess(auth.org, body.processCode)
  const detected = typeof body.detectedDate === "string" ? body.detectedDate : null
  const { data, error } = await createAdminClient().rpc("api_create_nc_output", {
    p_org: auth.org, p_actor: auth.actor, p_description: description, p_process: process as unknown as string,
    p_detected: detected as unknown as string, p_identification: typeof body.identification === "string" ? body.identification : "",
  })
  if (error) return dbWriteError(error)
  return finishWrite(auth.org, idem, { code: data?.[0]?.code ?? null })
}
