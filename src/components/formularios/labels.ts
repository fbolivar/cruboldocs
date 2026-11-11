import type { FieldType, FormCategory, FormStatus } from "@/lib/types"

export const FORM_CATEGORY_LABELS: Record<FormCategory, string> = {
  inspeccion: "Inspección",
  lista_verificacion: "Lista de verificación",
  formato: "Formato",
  encuesta_interna: "Encuesta interna",
  otro: "Otro",
}

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  archivado: "Archivado",
}

export const FORM_STATUS_TONE: Record<FormStatus, "advertencia" | "exito" | "neutro"> = {
  borrador: "advertencia",
  publicado: "exito",
  archivado: "neutro",
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  texto: "Texto",
  texto_largo: "Texto largo",
  numero: "Número",
  fecha: "Fecha",
  si_no: "Sí/No",
  seleccion: "Selección",
  multiseleccion: "Multiselección",
  puntaje: "Puntaje",
  seccion: "Sección",
  imagen: "Imagen",
}

/** Los tipos en el orden de la paleta del diseñador (spec-disenador). */
export const FIELD_PALETTE: FieldType[] = [
  "texto", "texto_largo", "numero", "fecha", "si_no",
  "seleccion", "multiseleccion", "puntaje", "imagen", "seccion",
]

/** Tipos que capturan fotos (lista de rutas de Storage). */
export const PHOTO_TYPES: FieldType[] = ["imagen"]

/** Tipos que usan lista de opciones. */
export const OPTION_TYPES: FieldType[] = ["seleccion", "multiseleccion"]
/** Tipos con configuración mínimo/máximo. */
export const RANGE_TYPES: FieldType[] = ["numero", "puntaje"]
