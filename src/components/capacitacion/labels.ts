import type { CourseStatus } from "@/lib/types"

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  archivado: "Archivado",
}

export const COURSE_STATUS_TONE: Record<CourseStatus, "advertencia" | "exito" | "neutro"> = {
  borrador: "advertencia",
  publicado: "exito",
  archivado: "neutro",
}

export const ENROLLMENT_LABELS: Record<"aprobado" | "no_aprobado", string> = {
  aprobado: "Aprobado",
  no_aprobado: "No aprobado",
}

export const ENROLLMENT_TONE: Record<"aprobado" | "no_aprobado", "exito" | "error"> = {
  aprobado: "exito",
  no_aprobado: "error",
}
