import type { EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Destino de los enlaces de correo de Supabase Auth (recuperar contraseña). Crea la sesión
// con el código o el token_hash y lleva a `siguiente` (solo rutas internas).
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const next = url.searchParams.get("siguiente") ?? "/app"
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app"
  const supabase = await createClient()

  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Enlace incompleto") }

  const target = url.clone()
  target.search = ""
  target.pathname = error ? "/recuperar" : safeNext
  if (error) target.searchParams.set("enlace", "vencido")
  return NextResponse.redirect(target)
}
