import type {
  CurrentUser,
  DocumentDetail,
  DocumentStatus,
  DocumentVersion,
  Role,
  SignatureAction,
  VersionStatus,
} from "@/lib/types"

export type BadgeTone = "exito" | "advertencia" | "error" | "info" | "neutro"

export const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; tone: BadgeTone }> = {
  borrador: { label: "Borrador", tone: "neutro" },
  en_revision: { label: "En revisión", tone: "advertencia" },
  en_aprobacion: { label: "En aprobación", tone: "advertencia" },
  vigente: { label: "Vigente", tone: "exito" },
  obsoleto: { label: "Obsoleto", tone: "neutro" },
}

export const VERSION_STATUS_META: Record<VersionStatus, { label: string; tone: BadgeTone }> = {
  borrador: { label: "Borrador", tone: "neutro" },
  en_revision: { label: "En revisión", tone: "advertencia" },
  en_aprobacion: { label: "En aprobación", tone: "advertencia" },
  aprobada: { label: "Aprobada", tone: "exito" },
  reemplazada: { label: "Reemplazada", tone: "neutro" },
}

export const ROLE_LABELS: Record<Role, string> = {
  lider_sig: "Líder SIG",
  lider_proceso: "Líder de proceso",
  elaborador: "Elaborador",
  revisor: "Revisor",
  aprobador: "Aprobador",
  responsable_control: "Responsable de control",
  auditor: "Auditor",
  consulta: "Consulta",
}

/** El usuario tiene el rol con alcance en el proceso (o en todos). */
export function hasRole(user: CurrentUser, role: Role, processId?: string): boolean {
  return user.roles.some(
    (r) => r.role === role && (r.processId === null || processId === undefined || r.processId === processId)
  )
}

/** Administrador de empresa sin rol funcional: ve metadatos, no contenido (ARQUITECTURA §2). */
export function isMetadataOnly(user: CurrentUser): boolean {
  return (user.isOrgAdmin || user.isPlatformAdmin) && user.roles.length === 0
}

export function canRegisterDocuments(user: CurrentUser): boolean {
  return hasRole(user, "elaborador") || hasRole(user, "lider_sig") || hasRole(user, "lider_proceso")
}

export type DocumentActionId =
  | "reemplazar_archivos"
  | "enviar_revision"
  | "devolver"
  | "firmar_revision"
  | "rechazar"
  | "firmar_aprobacion"
  | "confirmar_lectura"
  | "solicitar_actualizacion"
  | "rechazar_solicitud"
  | "crear_version"

export interface DocumentAction {
  id: DocumentActionId
  label: string
}

export interface ActionBarModel {
  /** Mensaje de la barra; null si no hay tarea asignada (acción solo disponible). */
  taskMessage: string | null
  primary: DocumentAction
  secondary: DocumentAction[]
}

const A: Record<DocumentActionId, string> = {
  reemplazar_archivos: "Reemplazar archivos",
  enviar_revision: "Enviar a revisión",
  devolver: "Devolver con comentarios",
  firmar_revision: "Firmar revisión",
  rechazar: "Rechazar",
  firmar_aprobacion: "Firmar aprobación",
  confirmar_lectura: "Confirmar lectura",
  solicitar_actualizacion: "Solicitar actualización",
  rechazar_solicitud: "Rechazar solicitud",
  crear_version: "Crear nueva versión",
}

const act = (id: DocumentActionId): DocumentAction => ({ id, label: A[id] })

/**
 * Barra de acción de la ficha: mapa rol × estado de spec-ficha-documento.md.
 * Una sola acción primaria. La segregación de funciones la valida además la BD.
 */
export function getActionBar(
  doc: DocumentDetail,
  version: DocumentVersion,
  user: CurrentUser
): ActionBarModel | null {
  if (isMetadataOnly(user)) return null
  const pos = user.positionId
  const latest = doc.versions[0]
  if (version.id !== latest.id && version.status !== "aprobada") return null

  if (version.status === "borrador" && pos === doc.elaboradorPositionId) {
    return {
      taskMessage: `Tienes esta tarea: completar y enviar la versión ${version.versionNo} a revisión`,
      primary: act("enviar_revision"),
      secondary: [act("reemplazar_archivos")],
    }
  }
  if (version.status === "en_revision" && pos === doc.revisorPositionId) {
    return {
      taskMessage: `Tienes esta tarea: revisar la versión ${version.versionNo}`,
      primary: act("firmar_revision"),
      secondary: [act("devolver")],
    }
  }
  if (version.status === "en_aprobacion" && pos === doc.aprobadorPositionId) {
    return {
      taskMessage: `Tienes esta tarea: aprobar la versión ${version.versionNo}`,
      primary: act("firmar_aprobacion"),
      secondary: [act("rechazar")],
    }
  }
  if (doc.status !== "vigente" || version.status !== "aprobada") return null

  const openRequest = doc.changeRequests.some((r) => r.status === "abierta")
  const canResolve =
    pos === doc.elaboradorPositionId ||
    hasRole(user, "lider_sig") ||
    hasRole(user, "lider_proceso", doc.processId)
  if (openRequest && canResolve) {
    return {
      taskMessage: "Tienes esta tarea: atender la solicitud de actualización",
      primary: act("crear_version"),
      secondary: [act("rechazar_solicitud")],
    }
  }

  const readPending =
    doc.readRequired &&
    pos !== null &&
    doc.distributionPositionIds.includes(pos) &&
    version.reads.some((r) => r.userId === user.id && r.acknowledgedAt === null)
  if (readPending) {
    return {
      taskMessage: `Tienes esta tarea: confirmar la lectura de la versión ${version.versionNo}`,
      primary: act("confirmar_lectura"),
      secondary: [],
    }
  }

  if (openRequest) return null
  return { taskMessage: null, primary: act("solicitar_actualizacion"), secondary: [] }
}

/** Código sugerido TIPO-PROC-NNN a partir de los códigos existentes. */
export function suggestDocumentCode(typeCode: string, processCode: string, existing: string[]): string {
  const prefix = `${typeCode}-${processCode}-`
  const max = existing
    .filter((c) => c.startsWith(prefix))
    .map((c) => Number.parseInt(c.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}

/** Segregación de funciones: elaborador ≠ revisor ≠ aprobador. Devuelve el mensaje de error o null. */
export function segregationError(elaborador: string, revisor: string, aprobador: string): string | null {
  if (!elaborador || !revisor || !aprobador) return null
  if (revisor === elaborador || aprobador === elaborador) {
    return "El revisor y el aprobador deben ser cargos distintos al elaborador."
  }
  if (revisor === aprobador) return "El revisor y el aprobador deben ser cargos distintos."
  return null
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024

/** Texto que el firmante acepta; se guarda en `signatures.meaning` (ADR-004). */
export const SIGNATURE_MEANING: Record<SignatureAction, string> = {
  revision: "Revisé este documento y es técnicamente correcto.",
  aprobacion: "Apruebo este documento para su uso en la organización.",
}
