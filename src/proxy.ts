import { type NextRequest, NextResponse } from "next/server"

// ⚠️ SOLO DESARROLLO (MOCK): `?demo_usuario=u-carlos&demo_estado=vacio` fija las
// cookies de demostración y redirige a la URL limpia. Permite revisar roles y
// estados con un enlace. En la fase backend este archivo pasa a refrescar la
// sesión de Supabase.
const KEYS = ["demo_usuario", "demo_estado"] as const

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.next()
  const url = request.nextUrl
  const present = KEYS.filter((k) => url.searchParams.has(k))
  if (present.length === 0) return NextResponse.next()

  const clean = url.clone()
  for (const k of present) clean.searchParams.delete(k)
  const res = NextResponse.redirect(clean)
  for (const k of present) {
    res.cookies.set(k, url.searchParams.get(k) ?? "", { httpOnly: true, sameSite: "lax", path: "/" })
  }
  return res
}

export const config = {
  matcher: ["/app/:path*"],
}
