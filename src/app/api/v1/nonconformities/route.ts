import { NextResponse } from "next/server"

import { apiError, authenticate, dbWriteError, finishWrite, getIdempotent, pageParams, readJson, resolveProcess } from "@/lib/api/keys"
import { readNonconformities } from "@/lib/api/read"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await authenticate(request, "read:nonconformities")
  if (!auth.ok) return auth.response
  const page = pageParams(request.url)
  const data = await readNonconformities(auth.org, page)
  return NextResponse.json({ data, nextOffset: data.length === page.limit ? page.offset + page.limit : null })
}

export async function POST(request: Request) {
  const auth = await authenticate(request, "write:nonconformities")
  if (!auth.ok) return auth.response
  const idem = request.headers.get("idempotency-key")
  const prev = await getIdempotent(auth.org, idem)
  if (prev) return NextResponse.json(prev, { status: 201 })
  const body = await readJson(request)
  if (!body) return apiError(400, "Cuerpo JSON no válido")
  const source = String(body.source ?? ""), title = String(body.title ?? ""), description = String(body.description ?? ""), severity = String(body.severity ?? "")
  if (!source || !title || !description || !severity) return apiError(400, "Faltan campos: source, title, description, severity")
  const process = await resolveProcess(auth.org, body.processCode)
  const detected = typeof body.detectedAt === "string" ? body.detectedAt : null
  const { data, error } = await createAdminClient().rpc("api_report_nonconformity", {
    p_org: auth.org, p_actor: auth.actor, p_source: source, p_process: process as unknown as string,
    p_title: title, p_description: description, p_severity: severity, p_detected: detected as unknown as string,
  })
  if (error) return dbWriteError(error)
  return finishWrite(auth.org, idem, { code: data?.[0]?.code ?? null })
}
