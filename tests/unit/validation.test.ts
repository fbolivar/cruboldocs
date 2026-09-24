import { afterEach, describe, expect, it, vi } from "vitest"

import { codeError, emailError, fromDateInput, nitError, toDateInput, validUntilError } from "@/components/admin/validation"
import {
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRequired,
} from "@/components/auth/validation"

describe("formularios de acceso", () => {
  it("correo", () => {
    expect(validateEmail("  ")).toBe("Escribe tu correo.")
    expect(validateEmail("sin-arroba")).toMatch(/correo válido/)
    expect(validateEmail(" laura@acme.co ")).toBeNull()
  })
  it("contraseña nueva: mínimo 10 caracteres (igual que Supabase Auth)", () => {
    expect(validateNewPassword("")).toBe("Crea una contraseña.")
    expect(validateNewPassword("123456789")).toMatch(/al menos 10/)
    expect(validateNewPassword("1234567890")).toBeNull()
  })
  it("confirmación", () => {
    expect(validatePasswordConfirmation("a", "")).toBe("Repite la contraseña.")
    expect(validatePasswordConfirmation("a", "b")).toMatch(/no coinciden/)
    expect(validatePasswordConfirmation("a", "a")).toBeNull()
  })
  it("requerido", () => {
    expect(validateRequired("  ", "Falta")).toBe("Falta")
    expect(validateRequired("x", "Falta")).toBeNull()
  })
})

describe("formularios de administración", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("correo de invitación", () => {
    expect(emailError("")).toMatch(/Escribe el correo/)
    expect(emailError("a@b")).toMatch(/correo válido/)
    expect(emailError("a@b.co")).toBeNull()
  })
  it("NIT con dígito de verificación", () => {
    expect(nitError("900123456-7")).toBeNull()
    expect(nitError("900123456")).toMatch(/9 dígitos/)
    expect(nitError("90012345-7")).toMatch(/9 dígitos/)
  })
  it("código de tipo de documento: 2–3 mayúsculas", () => {
    expect(codeError("PR")).toBeNull()
    expect(codeError("MAN")).toBeNull()
    expect(codeError("pr")).not.toBeNull()
    expect(codeError("P1")).not.toBeNull()
    expect(codeError("ÁB")).not.toBeNull()
  })
  it("vigencia de externo: obligatoria y posterior a hoy en Bogotá", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-25T03:00:00Z")) // 24/09 22:00 en Bogotá
    expect(validUntilError("")).toMatch(/hasta cuándo/)
    expect(validUntilError("2026-09-24")).toMatch(/posterior a hoy/)
    expect(validUntilError("2026-09-25")).toBeNull()
  })
  it("fechas de input ↔ ISO", () => {
    expect(toDateInput("2026-12-31T23:59:00-05:00")).toBe("2026-12-31")
    expect(toDateInput(null)).toBe("")
    expect(fromDateInput("2026-12-31")).toBe("2026-12-31T23:59:00-05:00")
  })
})
