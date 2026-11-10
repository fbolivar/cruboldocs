import "server-only"

// Las rutas de API (route handlers) NO tienen la protección CSRF que Next da a las Server Actions.
// Como se autentican por cookie, una página de otro sitio podría intentar un POST con la sesión del
// usuario. Exigimos que, si el navegador envía `Origin`, su host coincida con el de la solicitud
// (o con NEXT_PUBLIC_APP_URL). El navegador siempre envía `Origin` en un POST de fetch entre
// orígenes, así que esto corta el CSRF sin romper el uso normal (mismo origen).
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true // sin Origin: navegación same-origin o cliente no-navegador
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const allowed = new Set<string>()
  const host = request.headers.get("host")
  const fwd = request.headers.get("x-forwarded-host")
  if (host) allowed.add(host)
  if (fwd) allowed.add(fwd)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).host)
    } catch {
      /* ignora URL mal formada */
    }
  }
  return allowed.has(originHost)
}
