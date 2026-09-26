import type { MetadataRoute } from "next"

// Producto B2B sin páginas de marketing en v1: solo la política de datos es indexable. La app,
// el acceso y las invitaciones (llevan un token en la URL) quedan fuera de los buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/tratamiento-de-datos"],
      disallow: ["/app", "/invitacion", "/api", "/auth", "/login", "/recuperar", "/restablecer", "/mfa", "/sin-acceso"],
    },
  }
}
