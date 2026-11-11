import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/url"

// Destino del retorno de OAuth (Google / Microsoft): intercambia el código por la sesión y lleva a
// la app. El `code` de PKCE solo sirve en el navegador que inició el flujo (cookie del verificador).
// `next` se valida como ruta interna (anti open-redirect). El acceso real lo decide la membresía:
// un correo SSO sin membresía terminará en /sin-acceso por la lógica de getCurrentUser.
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next") ?? undefined)

  const target = url.clone()
  target.search = ""

  if (!code) {
    target.pathname = "/login"
    target.searchParams.set("sso", "error")
    return NextResponse.redirect(target)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    target.pathname = "/login"
    target.searchParams.set("sso", "error")
    return NextResponse.redirect(target)
  }

  target.pathname = next
  return NextResponse.redirect(target)
}
