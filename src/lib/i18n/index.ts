import type { Locale } from "@/lib/types"

export type { Dictionary } from "@/lib/i18n/dictionaries"
export { getDictionary, dictionaries } from "@/lib/i18n/dictionaries"

export const SUPPORTED_LOCALES: Locale[] = ["es", "en"]
export const DEFAULT_LOCALE: Locale = "es"

/** Interpolación simple de {clave} con params. */
export function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
}

/** Idioma de una página pública a partir de Accept-Language (es por defecto). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase()
    if (code === "en") return "en"
    if (code === "es") return "es"
  }
  return DEFAULT_LOCALE
}
