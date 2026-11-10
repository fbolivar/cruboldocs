import "server-only"

// Verificación de Cloudflare Turnstile en el servidor. Las llamadas del servidor a Supabase
// Auth usan la clave secreta y Auth no les exige CAPTCHA: la verificación ocurre aquí. El
// CAPTCHA nativo de Supabase protege los llamados directos con la clave publicable.

export type TurnstileAction = "login" | "recuperar" | "invitacion"

export const CAPTCHA_FAILED = "No pudimos verificar que no eres un robot. Vuelve a intentarlo."

/** En producción el token debe venir del dominio de la app, no de localhost ni de previews (AUD RA-09). */
function hostnameAllowed(hostname: string | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true
  const app = process.env.NEXT_PUBLIC_APP_URL
  if (!app) throw new Error("Falta NEXT_PUBLIC_APP_URL en producción.")
  return hostname === new URL(app).hostname
}

export async function verifyTurnstile(token: string | undefined, action: TurnstileAction, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta TURNSTILE_SECRET_KEY en producción.")
    console.warn("turnstile: sin configurar; verificación omitida en desarrollo.")
    return true
  }
  if (!token || token.length > 2048) return false
  // `remoteip` es opcional y, detrás de un CDN/proxy (Cloudflare), la IP que ve el servidor
  // puede no coincidir con la que resolvió el reto → siteverify devuelve success:false. No lo
  // enviamos: el control por IP vive en el rate limiting, no aquí. `ip` se mantiene en la firma.
  void ip
  const body = new URLSearchParams({ secret, response: token })
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string }
    return data.success === true && data.action === action && hostnameAllowed(data.hostname)
  } catch (e) {
    console.error("turnstile", e)
    return false
  }
}
