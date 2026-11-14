import { NextResponse } from "next/server"

import { authenticateAny } from "@/lib/api/keys"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

/**
 * Test de conexión para Zapier/Make: valida la API key y devuelve la organización, los scopes y el
 * nombre de la clave. No expone datos del negocio. (ADR-124)
 */
export async function GET(request: Request) {
  const auth = await authenticateAny(request)
  if (!auth.ok) return auth.response
  const { data: org } = await createAdminClient()
    .from("organizations")
    .select("id, name")
    .eq("id", auth.org)
    .maybeSingle()
  return NextResponse.json({
    organization: { id: auth.org, name: org?.name ?? null },
    scopes: auth.scopes,
    key_name: auth.keyName,
  })
}
