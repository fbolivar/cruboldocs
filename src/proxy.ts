import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

// Refresca la sesión de Supabase en cada navegación y hace la redirección optimista:
// sin sesión no se entra a /app; con sesión, /login y / llevan a /app. La autorización
// real la aplican getCurrentUser() y la RLS, no este archivo.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          for (const { name, value } of list) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of list) response.cookies.set(name, value, options)
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const signedIn = !!data?.claims?.sub
  const { pathname } = request.nextUrl

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
  matcher: ["/", "/login", "/app/:path*"],
}
