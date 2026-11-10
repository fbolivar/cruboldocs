import type { MetadataRoute } from "next"

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(/\/$/, "")

// Producto B2B sin páginas de marketing en v1: solo las páginas legales son indexables. La app,
// el acceso y las invitaciones (llevan un token en la URL) quedan fuera de los buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/tratamiento-de-datos", "/terminos"],
      disallow: ["/app", "/invitacion", "/api", "/auth", "/login", "/recuperar", "/restablecer", "/mfa", "/sin-acceso"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
