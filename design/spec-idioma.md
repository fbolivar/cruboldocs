# Design Spec — Multi-idioma (selector de idioma + traducciones de contenido)

**Producto:** CrubolDocs · **Fecha:** 2026-11-11 · **Tokens:** design/tokens.md v1 · **Arquitectura:** docs/multiidioma/ARQUITECTURA.md (v1.4-4) + ADR-091/092/093.

## 1. Propósito y protagonista
- **Qué logra:** que el usuario vea la app en su idioma (ES/EN) y que un documento tenga su versión en inglés.
- **Protagonista:** en Ajustes, el **selector de idioma**; en el documento, el **editor de traducción**.
- **Principio:** nada nuevo de navegación; el idioma es transversal. Lo no traducido cae al original con una marca discreta, nunca a vacío.

## 2. Selector de idioma — menú de cuenta (UserMenu)
No existe una página de Ajustes; las preferencias de cuenta viven en el **menú de cuenta** del topbar (cambiar organización, cerrar sesión). El idioma es un **submenú** más, junto a "Cambiar organización":
```
Idioma / Language ▸
  ● Español
  ○ English
```
- Control: submenú con **radio** `Español` / `English`. Al elegir → guarda `profiles.locale` y **recarga** la vista (router.refresh) para aplicar el idioma.
- **Éxito:** toast ("Idioma actualizado" / "Language updated", ya en el idioma elegido).
- **Error:** toast humano; el radio vuelve al valor previo al recargar.
- Las etiquetas del propio menú ya están traducidas según el idioma activo.

## 3. Traducciones de un documento — `/app/documentos/[codigo]`
Sección nueva **"Traducciones" / "Translations"** (solo si el usuario puede gestionar el documento). Muestra el idioma original y permite agregar/editar la versión en el otro idioma.
```
Traducciones
Original (Español): «Procedimiento de compras»
┌───────────────────────────────┐
│ English                        │
│ Título    [___________________]│
│ Descripción (textarea)         │
│ [ Guardar ]   [ Quitar ]       │
└───────────────────────────────┘
```
- Campos: **Título** (requerido si se guarda) y **Descripción** (opcional), en inglés. (El contenido del documento es un archivo adjunto; aquí solo metadatos de texto.)
- **Guardar:** llama `set_content_translation` por campo; toast de éxito. **Quitar:** elimina la traducción (vuelve a verse el original); confirma en el propio botón (estado "¿Seguro?").
- **Marca "sin traducir":** donde se muestra un texto que cae al original por falta de traducción (p. ej. la ficha vista por un usuario EN), un chip discreto `Sin traducir / Not translated` tono neutro junto al texto.
- **Solo lectura:** si el usuario no gestiona el documento, la sección no aparece (ve el texto ya resuelto a su idioma).

## 4. Estados
| Estado | Comportamiento |
|---|---|
| Carga | La ficha/Ajustes ya traen el locale resuelto en servidor; sin skeleton extra. |
| Vacío (sin traducción) | En la sección Traducciones: campos EN vacíos con placeholder. En la ficha: original + chip "Sin traducir". |
| Enviando | Botón Guardar en loading. |
| Éxito | Toast; la traducción aparece en la lista/ficha. |
| Error | Toast humano; conserva lo escrito. |

## 5. Accesibilidad / Móvil
- Select y campos con `label`; el Select de idioma es operable por teclado. Chip "sin traducir" con texto (no solo color). En móvil, la sección Traducciones ocupa el ancho completo; botones a ancho completo.

## 6. Componentes
| Componente | ¿Nuevo? | Notas |
|---|---|---|
| Select, Input, Textarea, Button, Card, Badge | Reutilizados | |
| **LanguageSelect** (en Ajustes) | Nuevo | cambia `profiles.locale` + refresh |
| **DocumentTranslations** (en ficha documento) | Nuevo | editar/quitar versión EN |
| **UntranslatedChip** | Nuevo | marca discreta de fallback al original |
| **LocaleProvider** + `t()` | Nuevo (infra, no visual) | idioma a componentes cliente |

## 7. Decisiones
- **Idioma transversal sin prefijo de ruta** (ADR-091): menos fricción en la app autenticada.
- **Fallback visible al original** (nunca vacío) con marca discreta: el usuario siempre ve contenido útil.

---

> CONTRATO: implementar exactamente según design/tokens.md + esta spec. Desviaciones requieren actualizar la spec primero.
