import type { Locale } from "@/lib/types"
import type { NavIcon } from "@/components/shell/nav-items"

// Diccionarios tipados. El tipo Dictionary obliga en compilación a que `en` tenga EXACTAMENTE las
// mismas claves que `es` (ADR-093). Los módulos suman sus namespaces de forma incremental.

export interface Dictionary {
  nav: Record<NavIcon, string>
  common: {
    save: string
    cancel: string
    close: string
    remove: string
    edit: string
    confirmRemove: string
    loading: string
    untranslated: string
  }
  settings: {
    language: string
    languageHint: string
    spanish: string
    english: string
    languageUpdated: string
  }
  translations: {
    title: string
    original: string
    englishVersion: string
    fieldTitle: string
    fieldDescription: string
    saved: string
    removed: string
    emptyHint: string
  }
}

export const es: Dictionary = {
  nav: {
    inicio: "Inicio", tablero: "Tablero", documentos: "Documentos", contexto: "Contexto",
    procesos: "Procesos", riesgos: "Riesgos", noconf: "No conformidades", salidas: "Salidas no conformes",
    auditorias: "Auditorías", indicadores: "Indicadores", revisiones: "Revisión por la dirección",
    competencias: "Competencias", proveedores: "Proveedores", pqrs: "PQRS", actas: "Actas",
    objetivos: "Objetivos", legal: "Requisitos legales", peligros: "Peligros SST", ambiental: "Aspectos ambientales",
    sgsst: "SG-SST (0312)", metrologia: "Metrología", cambios: "Gestión del cambio", formularios: "Formularios",
    capacitacion: "Capacitación", conocimiento: "Conocimiento", solicitudes: "Solicitudes", admin: "Administración",
  },
  common: {
    save: "Guardar", cancel: "Cancelar", close: "Cerrar", remove: "Quitar", edit: "Editar",
    confirmRemove: "¿Seguro?", loading: "Cargando…", untranslated: "Sin traducir",
  },
  settings: {
    language: "Idioma", languageHint: "Elige el idioma de la interfaz.",
    spanish: "Español", english: "English", languageUpdated: "Idioma actualizado",
  },
  translations: {
    title: "Traducciones", original: "Original", englishVersion: "English",
    fieldTitle: "Título", fieldDescription: "Descripción",
    saved: "Traducción guardada", removed: "Traducción quitada",
    emptyHint: "Deja un campo vacío para no traducirlo.",
  },
}

export const en: Dictionary = {
  nav: {
    inicio: "Home", tablero: "Dashboard", documentos: "Documents", contexto: "Context",
    procesos: "Processes", riesgos: "Risks", noconf: "Nonconformities", salidas: "Nonconforming outputs",
    auditorias: "Audits", indicadores: "Indicators", revisiones: "Management review",
    competencias: "Competencies", proveedores: "Suppliers", pqrs: "Feedback (PQRS)", actas: "Minutes",
    objetivos: "Objectives", legal: "Legal requirements", peligros: "OHS hazards", ambiental: "Environmental aspects",
    sgsst: "OHS (0312)", metrologia: "Metrology", cambios: "Change management", formularios: "Forms",
    capacitacion: "Training", conocimiento: "Knowledge", solicitudes: "Requests", admin: "Administration",
  },
  common: {
    save: "Save", cancel: "Cancel", close: "Close", remove: "Remove", edit: "Edit",
    confirmRemove: "Sure?", loading: "Loading…", untranslated: "Not translated",
  },
  settings: {
    language: "Language", languageHint: "Choose the interface language.",
    spanish: "Español", english: "English", languageUpdated: "Language updated",
  },
  translations: {
    title: "Translations", original: "Original", englishVersion: "English",
    fieldTitle: "Title", fieldDescription: "Description",
    saved: "Translation saved", removed: "Translation removed",
    emptyHint: "Leave a field empty to skip translating it.",
  },
}

export const dictionaries: Record<Locale, Dictionary> = { es, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? es
}
