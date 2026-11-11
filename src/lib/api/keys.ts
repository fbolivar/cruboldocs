import "server-only"

import { randomBytes } from "crypto"
import { after, NextResponse } from "next/server"
import type { PostgrestError } from "@supabase/supabase-js"

import { sha256Hex } from "@/lib/data/hash"
import { deliverWebhooks } from "@/lib/api/webhooks"
import { withinLimits } from "@/lib/security/rate-limit"
import { createAdminClient } from "@/lib/supabase/server"
import type { ApiScope } from "@/lib/types"

/** Genera un token de API nuevo: `ck_live_<random>`. Se devuelve el claro una sola vez;
 *  se guarda solo el hash. El prefijo (visible) sirve para reconocer la clave sin exponerla. */
export function generateApiToken(): { token: string; prefix: string; hash: string } {
  const token = `ck_live_${randomBytes(24).toString("base64url")}`
  return { token, prefix: `${token.slice(0, 16)}…`, hash: sha256Hex(token) }
}

type AuthOk = { ok: true; org: string; actor: string }
type AuthErr = { ok: false; response: NextResponse }

function err(status: number, message: string): AuthErr {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) }
}

/**
 * Verifica la API key del encabezado Authorization y el scope requerido. Usa el cliente de servicio
 * (no hay sesión): por eso el endpoint DEBE filtrar por el `org` devuelto en cada consulta.
 */
export async function authenticate(request: Request, scope: ApiScope): Promise<AuthOk | AuthErr> {
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token) return err(401, "No autorizado")

  const hash = sha256Hex(token)
  const admin = createAdminClient()
  const { data: key } = await admin
    .from("api_keys")
    .select("id, organization_id, scopes, revoked_at, created_by")
    .eq("key_hash", hash)
    .maybeSingle()

  if (!key || key.revoked_at) return err(401, "No autorizado")

  // Rate-limit por clave (por su hash; nunca el token en claro).
  const ok = await withinLimits([["api:key", hash]])
  if (!ok) return err(429, "Demasiadas peticiones")

  if (!(key.scopes as string[]).includes(scope)) return err(403, "La clave no tiene permiso para este recurso")

  // Marca de uso (sin bloquear la respuesta).
  void admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id)

  return { ok: true, org: key.organization_id, actor: key.created_by }
}

/** `limit` 1..100 (def. 50) y `offset` ≥ 0 desde la query. */
export function pageParams(url: string): { limit: number; offset: number } {
  const sp = new URL(url).searchParams
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 100)
  const offset = Math.max(Number(sp.get("offset")) || 0, 0)
  return { limit, offset }
}

export const apiError = (status: number, message: string) => NextResponse.json({ error: message }, { status })

/** Lee el cuerpo JSON (objeto) o null si no es válido. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Idempotencia: si ya se procesó esta clave, devuelve la respuesta previa. */
export async function getIdempotent(org: string, key: string | null): Promise<unknown | null> {
  if (!key) return null
  const { data } = await createAdminClient()
    .from("api_idempotency").select("response").eq("organization_id", org).eq("idem_key", key).maybeSingle()
  return data?.response ?? null
}

export async function saveIdempotent(org: string, key: string | null, response: unknown): Promise<void> {
  if (!key) return
  await createAdminClient().from("api_idempotency").insert({ organization_id: org, idem_key: key.slice(0, 200), response: response as never })
}

/** Resuelve un código de proceso a su uuid dentro de la organización (null si no existe/omitido). */
export async function resolveProcess(org: string, code: unknown): Promise<string | null> {
  if (typeof code !== "string" || !code.trim()) return null
  const { data } = await createAdminClient().from("processes").select("id").eq("organization_id", org).eq("code", code.trim()).maybeSingle()
  return data?.id ?? null
}

export async function resolveIndicator(org: string, code: unknown): Promise<string | null> {
  if (typeof code !== "string" || !code.trim()) return null
  const { data } = await createAdminClient().from("indicators").select("id").eq("organization_id", org).eq("code", code.trim()).maybeSingle()
  return data?.id ?? null
}

/** Mapea un error de la BD a una respuesta de la API: reglas de validación → 422 con su mensaje;
 *  cualquier otra cosa → 500 genérico (sin filtrar detalles internos). */
export function dbWriteError(error: PostgrestError): NextResponse {
  const validation = new Set(["22023", "22012", "P0002", "23514"])
  if (error.code && validation.has(error.code)) return apiError(422, error.message)
  return apiError(500, "No se pudo procesar la solicitud")
}

/** Cierra una escritura: guarda la idempotencia, dispara la entrega de webhooks y responde 201. */
export async function finishWrite(org: string, idem: string | null, resp: unknown): Promise<NextResponse> {
  await saveIdempotent(org, idem, resp)
  after(() => deliverWebhooks())
  return NextResponse.json(resp, { status: 201 })
}
