import "server-only"

import { randomBytes } from "crypto"
import { NextResponse } from "next/server"

import { sha256Hex } from "@/lib/data/hash"
import { withinLimits } from "@/lib/security/rate-limit"
import { createAdminClient } from "@/lib/supabase/server"
import type { ApiScope } from "@/lib/types"

/** Genera un token de API nuevo: `ck_live_<random>`. Se devuelve el claro una sola vez;
 *  se guarda solo el hash. El prefijo (visible) sirve para reconocer la clave sin exponerla. */
export function generateApiToken(): { token: string; prefix: string; hash: string } {
  const token = `ck_live_${randomBytes(24).toString("base64url")}`
  return { token, prefix: `${token.slice(0, 16)}…`, hash: sha256Hex(token) }
}

type AuthOk = { ok: true; org: string }
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
    .select("id, organization_id, scopes, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle()

  if (!key || key.revoked_at) return err(401, "No autorizado")

  // Rate-limit por clave (por su hash; nunca el token en claro).
  const ok = await withinLimits([["api:key", hash]])
  if (!ok) return err(429, "Demasiadas peticiones")

  if (!(key.scopes as string[]).includes(scope)) return err(403, "La clave no tiene permiso para este recurso")

  // Marca de uso (sin bloquear la respuesta).
  void admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id)

  return { ok: true, org: key.organization_id }
}

/** `limit` 1..100 (def. 50) y `offset` ≥ 0 desde la query. */
export function pageParams(url: string): { limit: number; offset: number } {
  const sp = new URL(url).searchParams
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 100)
  const offset = Math.max(Number(sp.get("offset")) || 0, 0)
  return { limit, offset }
}
