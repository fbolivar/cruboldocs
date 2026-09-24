// CSP con nonce por petición (MED-03). La arma el proxy; Next.js aplica el nonce a sus
// scripts al renderizar. 'strict-dynamic' deja cargar a Turnstile desde un script con nonce.
// Estilos con 'unsafe-inline': Radix y Sonner usan atributos style y <style> sin nonce
// (si style-src llevara nonce, el navegador ignoraría 'unsafe-inline').

const TURNSTILE = "https://challenges.cloudflare.com"

export function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development"
  // Storage: subida directa del navegador (connect) y visor del PDF (frame).
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // data: por el QR del registro MFA (SVG que entrega Supabase).
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${supabase}`,
    `frame-src ${TURNSTILE} ${supabase}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ")
}
