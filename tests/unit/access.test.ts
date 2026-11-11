import { describe, expect, it } from "vitest"

import { adminTabsFor, canManageRisks, canSeeAdmin, canSeeRisks, canSeeSignatureIp } from "@/lib/domain/access"

import { PROC, user } from "./fixtures"

const ALL_ORG_TABS = ["usuarios", "cargos", "procesos", "tipos", "normas", "recertificacion", "auditoria", "api", "flujos", "notificaciones"]

describe("adminTabsFor", () => {
  it("Admin de empresa: todas las pestañas de la organización, sin Organizaciones", () => {
    expect(adminTabsFor(user({ isOrgAdmin: true }))).toEqual(ALL_ORG_TABS)
  })
  it("Líder SIG: igual que el Admin", () => {
    expect(adminTabsFor(user({}, [{ role: "lider_sig", processId: null }]))).toEqual(ALL_ORG_TABS)
  })
  it("Auditor: solo auditoría", () => {
    expect(adminTabsFor(user({}, [{ role: "auditor", processId: null }]))).toEqual(["auditoria"])
  })
  it("Superadmin sin membresía: solo Organizaciones", () => {
    expect(adminTabsFor(user({ isPlatformAdmin: true }))).toEqual(["organizaciones"])
  })
  it("Consulta: ninguna pestaña y sin acceso a Administración", () => {
    const u = user({}, [{ role: "consulta", processId: null }])
    expect(adminTabsFor(u)).toEqual([])
    expect(canSeeAdmin(u)).toBe(false)
  })
})

describe("riesgos", () => {
  it("elaborador sin rol de riesgos no ve la pantalla", () => {
    expect(canSeeRisks(user({}, [{ role: "elaborador", processId: null }]))).toBe(false)
  })
  it.each(["lider_sig", "lider_proceso", "responsable_control", "auditor", "consulta"] as const)("%s ve riesgos", (role) => {
    expect(canSeeRisks(user({}, [{ role, processId: PROC.ti }]))).toBe(true)
  })
  it("líder de proceso gestiona riesgos solo de su proceso", () => {
    const u = user({}, [{ role: "lider_proceso", processId: PROC.sig }])
    expect(canManageRisks(u, PROC.sig)).toBe(true)
    expect(canManageRisks(u, PROC.ti)).toBe(false)
  })
  it("el auditor no gestiona riesgos", () => {
    expect(canManageRisks(user({}, [{ role: "auditor", processId: null }]), PROC.sig)).toBe(false)
  })
})

describe("canSeeSignatureIp (RA-12)", () => {
  it("Admin, Líder SIG y Auditor ven la IP", () => {
    expect(canSeeSignatureIp(user({ isOrgAdmin: true }))).toBe(true)
    expect(canSeeSignatureIp(user({}, [{ role: "lider_sig", processId: null }]))).toBe(true)
    expect(canSeeSignatureIp(user({}, [{ role: "auditor", processId: null }]))).toBe(true)
  })
  it("un revisor no la ve", () => {
    expect(canSeeSignatureIp(user({}, [{ role: "revisor", processId: null }]))).toBe(false)
  })
})
