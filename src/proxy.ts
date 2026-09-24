import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { contentSecurityPolicy } from "@/lib/security/csp"

// Rutas donde se refresca la sesión y se hace la redirección optimista.
const SESSION_PATHS = /^\/(login|mfa|app(\/.*)?)?$/

// En toda página: CSP con nonce nuevo (MED-03). En las rutas de sesión, además, refresca la
// sesión de Supabase y redirige de forma optimista: sin sesión no se entra a /app; con sesión,
// /login y / llevan a /app. La autorización real la aplican getCurrentUser() y la RLS.
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const csp = contentSecurityPolicy(nonce)

  // Next.js lee el nonce de la CSP de la petición y lo pone en sus scripts.
  const next = () => {
    const headers = new Headers(request.headers)
    headers.set("x-nonce", nonce)
    headers.set("Content-Security-Policy", csp)
    const res = NextResponse.next({ request: { headers } })
    res.headers.set("Content-Security-Policy", csp)
    return res
  }

  let response = next()
  const { pathname } = request.nextUrl
  if (!SESSION_PATHS.test(pathname)) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          for (const { name, value } of list) request.cookies.set(name, value)
          response = next()
          for (const { name, value, options } of list) response.cookies.set(name, value, options)
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const signedIn = !!data?.claims?.sub

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ""
    const res = NextResponse.redirect(url)
    for (const c of response.cookies.getAll()) res.cookies.set(c)
    return res
  }

  if (!signedIn && pathname.startsWith("/app")) return redirectTo("/login")
  if (signedIn && (pathname === "/" || pathname === "/login")) return redirectTo("/app")
  return response
}

export const config = {
  // Toda página (no API ni estáticos). Los prefetch no son HTML: no llevan CSP.
  matcher: [
    {
      source: "/((?!api|auth/confirmar|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
