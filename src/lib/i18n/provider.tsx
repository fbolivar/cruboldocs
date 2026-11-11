"use client"

import { createContext, useContext } from "react"

import type { Locale } from "@/lib/types"
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries"

type LocaleContextValue = { locale: Locale; dict: Dictionary }

const LocaleContext = createContext<LocaleContextValue>({ locale: "es", dict: getDictionary("es") })

/** Expone el idioma y el diccionario del usuario a los componentes cliente. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, dict: getDictionary(locale) }}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}

/** Diccionario del idioma activo para componentes cliente. */
export function useDict(): Dictionary {
  return useContext(LocaleContext).dict
}
