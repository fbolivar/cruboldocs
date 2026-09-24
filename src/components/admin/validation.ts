// Validaciones de formularios de Administración (mensajes que dicen cómo corregir).

import { todayIsoDate } from "@/lib/format"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailError(email: string): string | null {
  if (!email.trim()) return "Escribe el correo de la persona."
  if (!EMAIL_RE.test(email.trim())) return "Escribe un correo válido, p. ej. nombre@empresa.co."
  return null
}

/** Vigencia de un usuario externo: obligatoria y posterior a hoy. */
export function validUntilError(value: string): string | null {
  if (!value) return "Indica hasta cuándo tendrá acceso."
  if (value <= todayIsoDate()) return "Elige una fecha posterior a hoy."
  return null
}

export function nitError(nit: string): string | null {
  if (!/^\d{9}-\d$/.test(nit.trim())) return "El NIT debe tener 9 dígitos y su dígito de verificación (p. ej. 900123456-7)."
  return null
}

export function codeError(code: string): string | null {
  if (!/^[A-Z]{2,3}$/.test(code)) return "Usa 2 o 3 letras mayúsculas, sin tildes ni números (p. ej. PR)."
  return null
}

/** "2026-12-31T…" → "2026-12-31" para inputs de fecha. */
export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ""
}

/** Fecha de un input (AAAA-MM-DD) a ISO al final del día en Bogotá. */
export function fromDateInput(value: string): string {
  return `${value}T23:59:00-05:00`
}
