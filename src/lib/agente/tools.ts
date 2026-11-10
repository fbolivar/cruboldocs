import "server-only"

import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import { saveDocumentType, savePosition, saveProcess } from "@/lib/data/actions"
import type { Result } from "@/lib/types"

// Roles y tipos válidos (iguales al dominio). El agente solo puede proponer estos.
const ROLES = [
  "lider_sig",
  "lider_proceso",
  "elaborador",
  "revisor",
  "aprobador",
  "responsable_control",
  "auditor",
  "consulta",
] as const
const PROCESS_TYPES = ["estrategico", "misional", "apoyo", "evaluacion"] as const

/**
 * Herramientas que Claude puede PROPONER. La ejecución real pasa por `runTool`, que reusa las
 * mismas server actions que la UI (sesión del usuario → RLS y validación). El agente nunca firma,
 * aprueba ni toca documentos o riesgos: solo el catálogo.
 */
export const TOOL_SPECS: Anthropic.Tool[] = [
  {
    name: "crear_proceso",
    description:
      "Crea un proceso del mapa de procesos de la organización. El código son 2 a 6 letras o números en mayúscula (p. ej. GC, TH, SVC). El tipo es uno de: estrategico, misional, apoyo, evaluacion.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["code", "name", "type"],
      properties: {
        code: { type: "string", description: "2 a 6 letras/números en mayúscula, p. ej. GC" },
        name: { type: "string", description: "Nombre del proceso, p. ej. Gestión de Calidad" },
        type: { type: "string", enum: [...PROCESS_TYPES] },
      },
    },
  },
  {
    name: "crear_tipo_documento",
    description:
      "Crea un tipo documental. El código son 2 o 3 letras mayúsculas (p. ej. PR, MA, FO). El nombre, p. ej. Procedimiento, Manual, Formato.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["code", "name"],
      properties: {
        code: { type: "string", description: "2 o 3 letras mayúsculas, p. ej. PR" },
        name: { type: "string", description: "Nombre del tipo, p. ej. Procedimiento" },
      },
    },
  },
  {
    name: "crear_cargo",
    description:
      "Crea un cargo y le asigna roles. Roles válidos: lider_sig, lider_proceso, elaborador, revisor, aprobador, responsable_control, auditor, consulta. Para un documento se necesitan tres cargos distintos (elaborador, revisor, aprobador).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string", description: "Nombre del cargo, p. ej. Líder SIG" },
        roles: {
          type: "array",
          description: "Roles del cargo (opcional)",
          items: { type: "string", enum: [...ROLES] },
        },
      },
    },
  },
]

export const TOOL_NAMES = TOOL_SPECS.map((t) => t.name)

const crearProceso = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(200),
  type: z.enum(PROCESS_TYPES),
})
const crearTipo = z.object({ code: z.string().min(1).max(10), name: z.string().min(1).max(200) })
const crearCargo = z.object({
  name: z.string().min(1).max(200),
  roles: z.array(z.enum(ROLES)).max(8).optional(),
})

const badInput: Result = { ok: false, error: "No entendí los datos de la acción. Dímelos de nuevo." }

/**
 * Ejecuta una acción confirmada por el usuario. Valida el nombre y los argumentos, y delega en la
 * server action correspondiente (que aplica RLS, validación y mensajes claros). Nunca otorga
 * privilegios: si el usuario no puede crear algo, la acción falla igual.
 */
export async function runTool(name: string, input: unknown): Promise<Result> {
  switch (name) {
    case "crear_proceso": {
      const p = crearProceso.safeParse(input)
      if (!p.success) return badInput
      return saveProcess({ code: p.data.code, name: p.data.name, type: p.data.type, leaderPositionId: null })
    }
    case "crear_tipo_documento": {
      const p = crearTipo.safeParse(input)
      if (!p.success) return badInput
      return saveDocumentType({ code: p.data.code.toUpperCase(), name: p.data.name })
    }
    case "crear_cargo": {
      const p = crearCargo.safeParse(input)
      if (!p.success) return badInput
      return savePosition({
        name: p.data.name,
        processId: null,
        roles: (p.data.roles ?? []).map((role) => ({ role, processId: null })),
      })
    }
    default:
      return { ok: false, error: "Acción no reconocida." }
  }
}
