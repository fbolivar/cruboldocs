import { describe, expect, it } from "vitest"

import { render } from "@/lib/email/outbox"

// Plantilla del aviso de seguridad "contraseña cambiada": asunto claro, fecha y enlace a
// recuperar la cuenta; sin la nueva contraseña ni datos sensibles.
describe("render contrasena_cambiada", () => {
  it("genera asunto, fecha y enlace a recuperar", () => {
    const mail = render("contrasena_cambiada", { cuando: "10 de noviembre de 2026, 9:00 a. m." })
    expect(mail).not.toBeNull()
    expect(mail!.subject).toBe("Tu contraseña de CrubolDocs fue cambiada")
    expect(mail!.text).toContain("10 de noviembre de 2026")
    expect(mail!.text).toContain("/recuperar")
    expect(mail!.html).toContain("/recuperar")
    expect(mail!.html).toContain("Recuperar mi cuenta")
    // No filtra la nueva contraseña.
    expect(mail!.text.toLowerCase()).not.toContain("contraseña:")
  })

  it("funciona sin fecha", () => {
    const mail = render("contrasena_cambiada", {})
    expect(mail).not.toBeNull()
    expect(mail!.subject).toContain("fue cambiada")
  })

  it("plantilla desconocida → null", () => {
    expect(render("inexistente", {})).toBeNull()
  })
})
