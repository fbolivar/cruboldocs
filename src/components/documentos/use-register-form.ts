"use client"

import { useState } from "react"

import { segregationError, suggestDocumentCode } from "@/lib/domain/documents"
import type { DocumentType, Position, Process } from "@/lib/types"

export interface RegisterCatalogs {
  processes: Process[]
  types: DocumentType[]
  positions: Position[]
  existingCodes: string[]
  /** Cargo del usuario: elaborador por defecto. */
  defaultElaboradorId: string | null
}

/** Archivo elegido; se sube a Storage al enviar el formulario. */
export interface AttachedFile {
  name: string
  size: number
  file: File
}

export interface RegisterValues {
  processId: string
  typeId: string
  title: string
  code: string
  elaborador: string
  revisor: string
  aprobador: string
  distribution: string[]
  readRequired: boolean
  reviewMonths: string
  changeSummary: string
  pdf: AttachedFile | null
  source: AttachedFile | null
}

export type FieldKey = Exclude<keyof RegisterValues, "distribution" | "readRequired">

/** Orden de los campos en el formulario (resumen de errores y foco). */
export const FIELD_ORDER: FieldKey[] = [
  "processId", "typeId", "title", "code", "elaborador", "revisor", "aprobador", "pdf", "source", "reviewMonths", "changeSummary",
]

export const FIELD_IDS: Record<FieldKey, string> = {
  processId: "reg-proceso", typeId: "reg-tipo", title: "reg-titulo", code: "reg-codigo",
  elaborador: "reg-elaborador", revisor: "reg-revisor", aprobador: "reg-aprobador",
  pdf: "reg-pdf", source: "reg-fuente", reviewMonths: "reg-meses", changeSummary: "reg-resumen",
}

const CODE_RE = /^[A-Z]{2,3}-[A-Z]{2,4}-\d{3}$/

function validate(v: RegisterValues, existingCodes: string[]): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  const code = v.code.trim().toUpperCase()
  const months = Number(v.reviewMonths)
  if (!v.processId) e.processId = "Elige el proceso."
  if (!v.typeId) e.typeId = "Elige el tipo de documento."
  if (v.title.trim().length < 3) e.title = "Escribe el título del documento."
  if (!code) e.code = "Escribe el código del documento."
  else if (!CODE_RE.test(code)) e.code = "Usa el formato TIPO-PROC-NNN, por ejemplo PR-GC-015."
  else if (existingCodes.includes(code)) e.code = `El código ${code} ya existe. Usa otro consecutivo.`
  if (!v.elaborador) e.elaborador = "Elige el cargo que elabora."
  if (!v.revisor) e.revisor = "Elige el cargo que revisa."
  if (!v.aprobador) e.aprobador = "Elige el cargo que aprueba."
  const seg = segregationError(v.elaborador, v.revisor, v.aprobador)
  if (seg) {
    if (v.revisor === v.elaborador) e.revisor = seg
    if (v.aprobador === v.elaborador || v.aprobador === v.revisor) e.aprobador = seg
  }
  if (!v.pdf) e.pdf = "Adjunta el PDF de consulta."
  if (!v.source) e.source = "Adjunta el archivo fuente en Word o Excel."
  if (!Number.isInteger(months) || months < 1 || months > 60) e.reviewMonths = "Indica un número entero de meses entre 1 y 60."
  if (v.changeSummary.trim().length < 3) e.changeSummary = "Describe el cambio en una frase, por ejemplo: Versión inicial."
  return e
}

const initial = (c: RegisterCatalogs): RegisterValues => ({
  processId: "", typeId: "", title: "", code: "",
  elaborador: c.defaultElaboradorId ?? "", revisor: "", aprobador: "",
  distribution: [], readRequired: true, reviewMonths: "12", changeSummary: "",
  pdf: null, source: null,
})

/** Estado, sugerencia de código y validación inline (al perder foco) del registro. */
export function useRegisterForm(catalogs: RegisterCatalogs) {
  const [values, setValues] = useState<RegisterValues>(() => initial(catalogs))
  const [codeEdited, setCodeEdited] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const errors = validate(values, catalogs.existingCodes)

  const update = <K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      if ((key === "processId" || key === "typeId") && !codeEdited) {
        const proc = catalogs.processes.find((p) => p.id === next.processId)
        const type = catalogs.types.find((t) => t.id === next.typeId)
        if (proc && type) next.code = suggestDocumentCode(type.code, proc.code, catalogs.existingCodes)
      }
      return next
    })
    if (key === "code") setCodeEdited(true)
  }

  /** Archivos: acepta función para las actualizaciones de progreso. */
  const updateFile = (key: "pdf" | "source", fn: (prev: AttachedFile | null) => AttachedFile | null) =>
    setValues((prev) => ({ ...prev, [key]: fn(prev[key]) }))

  const touch = (key: FieldKey) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
  const errorFor = (key: FieldKey): string | null => ((submitted || touched[key]) && errors[key]) || null

  const reset = () => {
    setValues(initial(catalogs))
    setCodeEdited(false)
    setTouched({})
    setSubmitted(false)
  }

  return { values, errors, update, updateFile, touch, errorFor, submitted, setSubmitted, reset, catalogs }
}

export type RegisterForm = ReturnType<typeof useRegisterForm>
