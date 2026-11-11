import type { AdminTab } from "@/lib/domain/access"
import type { MembershipStatus, OrganizationStatus, ProcessType } from "@/lib/types"

export const ADMIN_TAB_LABELS: Record<AdminTab, string> = {
  usuarios: "Usuarios",
  cargos: "Cargos y roles",
  procesos: "Procesos",
  tipos: "Tipos de documento",
  normas: "Normas",
  recertificacion: "Recertificación",
  auditoria: "Auditoría",
  api: "API",
  flujos: "Flujos",
  organizaciones: "Organizaciones",
}

type Tone = "exito" | "advertencia" | "neutro"

export const MEMBER_STATUS_META: Record<MembershipStatus, { label: string; tone: Tone }> = {
  activo: { label: "Activo", tone: "exito" },
  invitado: { label: "Invitado", tone: "advertencia" },
  vencido: { label: "Vencido", tone: "neutro" },
  revocado: { label: "Revocado", tone: "neutro" },
}

export const ORG_STATUS_META: Record<OrganizationStatus, { label: string; tone: Tone }> = {
  activa: { label: "Activa", tone: "exito" },
  suspendida: { label: "Suspendida", tone: "neutro" },
}

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  estrategico: "Estratégico",
  misional: "Misional",
  apoyo: "Apoyo",
  evaluacion: "Evaluación",
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  firmar_revision: "Firmar revisión",
  firmar_aprobacion: "Firmar aprobación",
  solicitar_actualizacion: "Solicitar actualización",
  devolver: "Devolver",
  enviar_revision: "Enviar a revisión",
  registrar_evidencia: "Registrar evidencia",
  invitar_usuario: "Invitar usuario",
  revocar_acceso: "Revocar acceso",
  vencer_acceso: "Vencer acceso",
  valorar_riesgo: "Valorar riesgo",
}

/** Etiqueta legible de una acción de auditoría; acciones desconocidas se humanizan. */
export function auditActionLabel(action: string): string {
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action]
  const text = action.replace(/_/g, " ")
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1)
}

/** Nombre de la pestaña de la URL o la primera visible. */
export function resolveTab(requested: string | undefined, tabs: AdminTab[]): AdminTab {
  return tabs.find((t) => t === requested) ?? tabs[0]
}

export const TAB_ERROR_TITLE = "No pudimos cargar esta sección."
