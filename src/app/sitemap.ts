import type { MetadataRoute } from "next"

// Solo las páginas públicas e indexables (coherente con robots.ts): inicio y las dos legales.
// La app, el acceso y las invitaciones no se indexan.
const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(/\/$/, "")

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/terminos`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/tratamiento-de-datos`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ]
}
