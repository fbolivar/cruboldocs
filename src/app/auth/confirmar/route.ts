import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Destino del enlace de recuperación de contraseña de Supabase Auth: crea la sesión de
// recuperación y lleva a /restablecer. Solo acepta `recovery` (AUD BAJ-04: con otro tipo, un
// enlace ajeno dejaría a la víctima trabajando en la cuenta de otra persona). El `code` de PKCE
// solo sirve en el navegador que pidió el enlace (cookie del verificador).
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const supabase = await createClient()

  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type === "recovery"
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      : { error: new Error("Enlace incompleto o no válido") }

  const target = url.clone()
  target.search = ""
  target.pathname = error ? "/recuperar" : "/restablecer"
  if (error) target.searchParams.set("enlace", "vencido")
  return NextResponse.redirect(target)
}
