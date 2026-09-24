import { describe, expect, it } from "vitest"

import {
  canRegisterDocuments,
  getActionBar,
  hasRole,
  isMetadataOnly,
  segregationError,
  suggestDocumentCode,
} from "@/lib/domain/documents"
import type { ChangeRequest, ReadAcknowledgement } from "@/lib/types"

import { doc, POS, PROC, user, version } from "./fixtures"

describe("hasRole", () => {
  it("un rol sin proceso aplica en todos los procesos", () => {
    const u = user({}, [{ role: "revisor", processId: null }])
    expect(hasRole(u, "revisor", PROC.ti)).toBe(true)
  })
  it("un rol con alcance solo aplica en su proceso", () => {
    const u = user({}, [{ role: "lider_proceso", processId: PROC.sig }])
    expect(hasRole(u, "lider_proceso", PROC.sig)).toBe(true)
    expect(hasRole(u, "lider_proceso", PROC.ti)).toBe(false)
  })
  it("otro rol no cuenta", () => {
    expect(hasRole(user({}, [{ role: "consulta", processId: null }]), "aprobador")).toBe(false)
  })
})

describe("isMetadataOnly (Admin sin rol funcional)", () => {
  it("Admin de empresa sin roles ve solo metadatos", () => {
    expect(isMetadataOnly(user({ isOrgAdmin: true }))).toBe(true)
  })
  it("Superadmin sin roles ve solo metadatos", () => {
    expect(isMetadataOnly(user({ isPlatformAdmin: true }))).toBe(true)
  })
  it("Admin con un rol funcional ve contenido", () => {
    expect(isMetadataOnly(user({ isOrgAdmin: true }, [{ role: "consulta", processId: null }]))).toBe(false)
  })
  it("un usuario común no es solo metadatos", () => {
    expect(isMetadataOnly(user())).toBe(false)
  })
})

describe("canRegisterDocuments", () => {
  it.each(["elaborador", "lider_sig", "lider_proceso"] as const)("%s puede registrar", (role) => {
    expect(canRegisterDocuments(user({}, [{ role, processId: null }]))).toBe(true)
  })
  it.each(["revisor", "aprobador", "consulta", "auditor"] as const)("%s no puede registrar", (role) => {
    expect(canRegisterDocuments(user({}, [{ role, processId: null }]))).toBe(false)
  })
})

describe("getActionBar (rol × estado)", () => {
  const as = (positionId: string) => user({ positionId }, [{ role: "consulta", processId: null }])

  it("elaborador con borrador: enviar a revisión", () => {
    const v = version({ status: "borrador" })
    const bar = getActionBar(doc([v]), v, as(POS.elaborador))
    expect(bar?.primary.id).toBe("enviar_revision")
    expect(bar?.secondary.map((a) => a.id)).toEqual(["reemplazar_archivos"])
  })
  it("revisor con versión en revisión: firmar revisión o devolver", () => {
    const v = version({ status: "en_revision" })
    const bar = getActionBar(doc([v], { status: "en_revision" }), v, as(POS.revisor))
    expect(bar?.primary.id).toBe("firmar_revision")
    expect(bar?.secondary.map((a) => a.id)).toEqual(["devolver"])
  })
  it("aprobador con versión en aprobación: firmar aprobación o rechazar", () => {
    const v = version({ status: "en_aprobacion" })
    const bar = getActionBar(doc([v], { status: "en_aprobacion" }), v, as(POS.aprobador))
    expect(bar?.primary.id).toBe("firmar_aprobacion")
    expect(bar?.secondary.map((a) => a.id)).toEqual(["rechazar"])
  })
  it("el revisor no puede enviar un borrador ajeno", () => {
    const v = version({ status: "borrador" })
    expect(getActionBar(doc([v]), v, as(POS.revisor))).toBeNull()
  })
  it("el elaborador no firma la revisión de su propio documento", () => {
    const v = version({ status: "en_revision" })
    expect(getActionBar(doc([v], { status: "en_revision" }), v, as(POS.elaborador))).toBeNull()
  })
  it("Admin solo metadatos no recibe acciones", () => {
    const v = version({ status: "borrador" })
    expect(getActionBar(doc([v]), v, user({ positionId: POS.elaborador, isOrgAdmin: true }))).toBeNull()
  })
  it("una versión antigua no aprobada no tiene acciones", () => {
    const vieja = version({ id: "v1", status: "borrador" })
    const nueva = version({ id: "v2", versionNo: 2, status: "borrador" })
    expect(getActionBar(doc([nueva, vieja]), vieja, as(POS.elaborador))).toBeNull()
  })

  describe("documento vigente", () => {
    const lectorId = "user-lector"
    const lector = user({ id: lectorId, positionId: POS.lector }, [{ role: "consulta", processId: null }])
    const read = (acknowledgedAt: string | null): ReadAcknowledgement => ({
      userId: lectorId,
      positionName: "Lector",
      userName: "Lector",
      acknowledgedAt,
    })
    const aprobada = (reads: ReadAcknowledgement[] = []) => version({ status: "aprobada", reads })

    it("lector de distribución con lectura pendiente: confirmar lectura", () => {
      const v = aprobada([read(null)])
      expect(getActionBar(doc([v], { status: "vigente" }), v, lector)?.primary.id).toBe("confirmar_lectura")
    })
    it("lectura ya confirmada: solo solicitar actualización", () => {
      const v = aprobada([read("2026-09-20T10:00:00Z")])
      const bar = getActionBar(doc([v], { status: "vigente" }), v, lector)
      expect(bar?.primary.id).toBe("solicitar_actualizacion")
      expect(bar?.taskMessage).toBeNull()
    })
    it("sin lectura obligatoria no se pide confirmar", () => {
      const v = aprobada([read(null)])
      expect(getActionBar(doc([v], { status: "vigente", readRequired: false }), v, lector)?.primary.id).toBe(
        "solicitar_actualizacion"
      )
    })

    const solicitud: ChangeRequest = {
      id: "cr1",
      requestedBy: { id: "p", fullName: "P", positionName: "C" },
      reason: "Cambió la norma",
      status: "abierta",
      createdAt: "2026-09-20T10:00:00Z",
      resolvedBy: null,
      resolution: null,
    }
    it("solicitud abierta: el elaborador la atiende (crear versión o rechazar)", () => {
      const v = aprobada()
      const bar = getActionBar(doc([v], { status: "vigente", changeRequests: [solicitud] }), v, as(POS.elaborador))
      expect(bar?.primary.id).toBe("crear_version")
      expect(bar?.secondary.map((a) => a.id)).toEqual(["rechazar_solicitud"])
    })
    it("solicitud abierta: el líder del proceso del documento la atiende", () => {
      const v = aprobada()
      const lider = user({ positionId: POS.otro }, [{ role: "lider_proceso", processId: PROC.sig }])
      expect(getActionBar(doc([v], { status: "vigente", changeRequests: [solicitud] }), v, lider)?.primary.id).toBe(
        "crear_version"
      )
    })
    it("solicitud abierta: el líder de otro proceso no la atiende ni duplica la solicitud", () => {
      const v = aprobada()
      const lider = user({ positionId: POS.otro }, [{ role: "lider_proceso", processId: PROC.ti }])
      expect(getActionBar(doc([v], { status: "vigente", changeRequests: [solicitud] }), v, lider)).toBeNull()
    })
  })
})

describe("suggestDocumentCode", () => {
  it("primer código del tipo y proceso", () => {
    expect(suggestDocumentCode("PR", "GC", [])).toBe("PR-GC-001")
  })
  it("siguiente al mayor existente, ignorando otros prefijos", () => {
    expect(suggestDocumentCode("PR", "GC", ["PR-GC-001", "PR-GC-007", "FO-GC-020", "PR-TI-050"])).toBe("PR-GC-008")
  })
  it("ignora sufijos no numéricos", () => {
    expect(suggestDocumentCode("PR", "GC", ["PR-GC-ABC", "PR-GC-002"])).toBe("PR-GC-003")
  })
})

describe("segregationError (elaborador ≠ revisor ≠ aprobador)", () => {
  it("cargos distintos: sin error", () => {
    expect(segregationError("a", "b", "c")).toBeNull()
  })
  it("revisor igual al elaborador", () => {
    expect(segregationError("a", "a", "c")).toMatch(/distintos al elaborador/)
  })
  it("aprobador igual al elaborador", () => {
    expect(segregationError("a", "b", "a")).toMatch(/distintos al elaborador/)
  })
  it("revisor igual al aprobador", () => {
    expect(segregationError("a", "b", "b")).toBe("El revisor y el aprobador deben ser cargos distintos.")
  })
  it("campos incompletos no se validan todavía", () => {
    expect(segregationError("a", "", "a")).toBeNull()
  })
})
