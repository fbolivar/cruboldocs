// Validaciones de los formularios de acceso. Mensajes que dicen cómo corregir.

export const PASSWORD_MIN_LENGTH = 10

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | null {
  const v = value.trim()
  if (!v) return "Escribe tu correo."
  if (!EMAIL_RE.test(v)) return "Escribe un correo válido, por ejemplo nombre@empresa.co."
  return null
}

export function validateRequired(value: string, message: string): string | null {
  return value.trim() ? null : message
}

export function validateNewPassword(value: string): string | null {
  if (!value) return "Crea una contraseña."
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  return null
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) return "Repite la contraseña."
  if (password !== confirmation) return "Las contraseñas no coinciden. Escríbela igual en ambos campos."
  return null
}
