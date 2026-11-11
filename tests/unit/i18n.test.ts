import { describe, expect, it } from "vitest"

import { es, en } from "@/lib/i18n/dictionaries"
import { interpolate, localeFromAcceptLanguage, DEFAULT_LOCALE } from "@/lib/i18n"

describe("interpolate", () => {
  it("sustituye {clave} por el parámetro", () => {
    expect(interpolate("Hola {n}", { n: "Ana" })).toBe("Hola Ana")
    expect(interpolate("{a} y {b}", { a: 1, b: 2 })).toBe("1 y 2")
  })
  it("deja intacto lo que no tiene params", () => {
    expect(interpolate("Sin nada")).toBe("Sin nada")
    expect(interpolate("Falta {x}", { y: "z" })).toBe("Falta {x}")
  })
})

describe("localeFromAcceptLanguage", () => {
  it("detecta en/es y cae a es por defecto", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en")
    expect(localeFromAcceptLanguage("es-CO,es;q=0.9")).toBe("es")
    expect(localeFromAcceptLanguage("fr-FR")).toBe(DEFAULT_LOCALE)
    expect(localeFromAcceptLanguage(null)).toBe("es")
  })
})

describe("diccionarios es/en", () => {
  it("tienen las mismas claves de navegación", () => {
    expect(Object.keys(en.nav).sort()).toEqual(Object.keys(es.nav).sort())
  })
  it("ningún texto queda vacío", () => {
    for (const dict of [es, en]) {
      for (const section of Object.values(dict) as Record<string, string>[]) {
        for (const v of Object.values(section)) expect(v.length).toBeGreaterThan(0)
      }
    }
  })
})
