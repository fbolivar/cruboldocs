// Metadatos de importación CSV (compartidos cliente/servidor). Columnas fijas por entidad + ejemplo
// para la plantilla. La validación y creación reales viven en las server actions (actions.ts).
// Arquitectura: docs/integraciones/ARQUITECTURA.md, ADR-125/126.

export type ImportEntity = "procesos" | "cargos" | "proveedores" | "requisitos"

export interface ImportColumn {
  key: string
  label: string
  required: boolean
  hint?: string
}

export interface ImportEntityDef {
  label: string
  description: string
  columns: ImportColumn[]
  example: Record<string, string>
}

export const IMPORT_ENTITIES: Record<ImportEntity, ImportEntityDef> = {
  procesos: {
    label: "Procesos",
    description: "Mapa de procesos. El líder se referencia por el nombre de un cargo existente.",
    columns: [
      { key: "codigo", label: "codigo", required: true, hint: "2–6 letras/números, p. ej. GC" },
      { key: "nombre", label: "nombre", required: true },
      { key: "tipo", label: "tipo", required: true, hint: "estrategico | misional | apoyo | evaluacion" },
      { key: "lider_cargo", label: "lider_cargo", required: false, hint: "nombre de un cargo existente" },
    ],
    example: { codigo: "GC", nombre: "Gestión de Calidad", tipo: "estrategico", lider_cargo: "Coordinador de Calidad" },
  },
  cargos: {
    label: "Cargos",
    description: "Cargos de la organización. El proceso se referencia por código o nombre existente.",
    columns: [
      { key: "nombre", label: "nombre", required: true, hint: "2–120 caracteres, único" },
      { key: "proceso", label: "proceso", required: false, hint: "código o nombre de un proceso existente" },
    ],
    example: { nombre: "Coordinador de Calidad", proceso: "GC" },
  },
  proveedores: {
    label: "Proveedores",
    description: "Maestro de proveedores. El código PRV-AAAA-### se asigna automáticamente.",
    columns: [
      { key: "nombre", label: "nombre", required: true },
      { key: "nit", label: "nit", required: false },
      { key: "tipo", label: "tipo", required: true, hint: "bien | servicio | ambos" },
      { key: "categoria", label: "categoria", required: false },
      { key: "criticidad", label: "criticidad", required: true, hint: "alta | media | baja" },
      { key: "proceso", label: "proceso", required: false, hint: "código o nombre de un proceso existente" },
      { key: "contacto_nombre", label: "contacto_nombre", required: false },
      { key: "contacto_email", label: "contacto_email", required: false },
      { key: "contacto_telefono", label: "contacto_telefono", required: false },
    ],
    example: {
      nombre: "Aceros del Norte S.A.", nit: "900123456-7", tipo: "bien", categoria: "Materia prima",
      criticidad: "alta", proceso: "GC", contacto_nombre: "Ana Ruiz", contacto_email: "ventas@aceros.co", contacto_telefono: "3001234567",
    },
  },
  requisitos: {
    label: "Requisitos legales",
    description: "Matriz de requisitos legales. El código se asigna automáticamente.",
    columns: [
      { key: "titulo", label: "titulo", required: true },
      { key: "tipo_fuente", label: "tipo_fuente", required: true, hint: "ley | decreto | resolucion | norma_iso | contractual | otro" },
      { key: "referencia", label: "referencia", required: true, hint: "p. ej. Ley 1581 de 2012" },
      { key: "emisor", label: "emisor", required: false },
      { key: "descripcion", label: "descripcion", required: true },
      { key: "proceso", label: "proceso", required: false, hint: "código o nombre de un proceso existente" },
      { key: "url", label: "url", required: false },
      { key: "frecuencia", label: "frecuencia", required: false, hint: "semestral | anual | bienal (def. anual)" },
    ],
    example: {
      titulo: "Protección de datos personales", tipo_fuente: "ley", referencia: "Ley 1581 de 2012",
      emisor: "Congreso de la República", descripcion: "Régimen general de protección de datos.",
      proceso: "GC", url: "https://example.co/ley-1581", frecuencia: "anual",
    },
  },
}

export const IMPORT_ENTITY_KEYS = Object.keys(IMPORT_ENTITIES) as ImportEntity[]

export function isImportEntity(v: unknown): v is ImportEntity {
  return typeof v === "string" && v in IMPORT_ENTITIES
}
