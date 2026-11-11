# Arquitectura — Multi-idioma (v1.4-4)

**Producto:** CrubolDocs · **Feature:** v1.4-4 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Supabase (Postgres + RLS) · Vercel.

> PARADA OBLIGATORIA: fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** la app está 100 % en español. Para vender a clientes que operan en inglés (y luego portugués) la interfaz debe poder mostrarse en otro idioma, y el contenido del SGC que un usuario o auditor anglófono necesita leer (empezando por los documentos controlados) debe poder tener su versión en ese idioma. La competencia (SoftExpert, MasterControl) ofrece interfaz multi-idioma.
- **Decisiones (Fernando):** (1) se traduce **la interfaz del producto Y el contenido del cliente**; (2) idiomas v1 = **español + inglés**; (3) selección **por preferencia del usuario** (sin cambiar la URL); (4) **sistema propio de diccionarios**, sin librería nueva.
- **Dato personal:** ninguno nuevo. `profiles.locale` es una preferencia, no dato sensible.

## 2. Modelo / técnica

### 2a. Interfaz (i18n de la UI)
- **Idioma del usuario:** columna `profiles.locale text not null default 'es'` (check `in ('es','en')`). Selector en **Ajustes**. Las páginas públicas (landing, login, portal) detectan el idioma por `Accept-Language`, con `es` por defecto.
- **Diccionarios tipados:** `src/lib/i18n/es.ts` y `en.ts` (mismo tipo `Dictionary`, claves por namespace: `shell`, `common`, `auth`, `settings`, …). Helper `t(dict, key, params?)` con interpolación simple `{n}`.
- **Resolución:** el locale se resuelve **en servidor** (desde el perfil) una vez por request y se pasa a los componentes; un `LocaleProvider` (client context) lo expone a los componentes cliente. Fechas/números con `Intl` nativo según locale. Sin dependencia nueva, sin rutas `/en/`.
- **Extracción por fases (ADR-093):** v1 traduce el **marco transversal completo** (navegación, encabezados, acciones y estados comunes, auth, ajustes, formato de fecha/número) y deja la infraestructura y el tipo `Dictionary` listos para que **cada módulo** sume sus textos de forma incremental sin tocar componentes de otros módulos. No se re-extrae toda la app en una sola fase (es L).

### 2b. Contenido del cliente (traducción multilingüe) — ADR-092
- **Tabla genérica** `content_translations` en lugar de duplicar columnas/tablas por idioma:
  `(id, organization_id, entity_type text, entity_id uuid, locale text, field text, value text, updated_by, updated_at; unique(organization_id, entity_type, entity_id, locale, field))`.
- La fila base de cada entidad conserva el texto en el **idioma original**; `content_translations` guarda la versión en otro idioma de **campos de texto seleccionados**. Al renderizar, si `user.locale ≠ original` y existe traducción, se muestra; si no, se muestra el original (con una marca discreta "sin traducir").
- **Entidades traducibles en v1 (acotado):** **documentos** (campos `title`, `description`) — el contenido controlado que un usuario/auditor anglófono lee primero. El resto de entidades queda **diferido** (la tabla ya las soporta sin migración: solo se habilita el control en su ficha cuando se decida).
- **Escritura:** RPC `set_content_translation(entity_type, entity_id, locale, field, value)` / `delete_content_translation(...)`, con la misma autorización que editar esa entidad (p. ej. gestionar el documento). RLS select por `organization_id` (miembro activo).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| `profiles.locale` + selector de idioma en Ajustes | **Sí** | Base de todo |
| Infraestructura de diccionarios (`t()`, tipo `Dictionary`, provider) | **Sí** | Núcleo |
| Traducción de la UI: **marco transversal** (shell, común, auth, ajustes) a EN | **Sí** | Valor visible inmediato; acota la L |
| Formato de fecha/número por locale (`Intl`) | **Sí** | Coherencia |
| Páginas públicas detectan idioma por navegador | **Sí** | Landing/login/portal |
| `content_translations` + RPC + control en la ficha de **documentos** | **Sí** | Contenido multilingüe (decisión de Fernando), acotado a 1 entidad |
| Traducción EN de **todos** los módulos de la app en esta fase | No | Incremental por módulo (ADR-093); es L |
| Contenido multilingüe en todas las entidades (NC, procesos, indicadores…) | No | La tabla ya lo soporta; se habilita por entidad luego |
| Portugués; rutas `/en/`; SEO por idioma en públicas | No | Fuera de las decisiones de v1 |
| Traducción automática (IA) de contenido | No | Diferido; hoy la carga el usuario |

**Camino dorado:** un usuario entra a **Ajustes**, elige **Inglés** → la navegación, encabezados y pantallas transversales se muestran en inglés con fechas en formato EN. · En un **documento**, el gestor agrega la **versión en inglés** de título/descripción → un usuario con idioma inglés la ve traducida; quien usa español sigue viendo el original.

## 4. Mapa de rutas
- **Sin rutas nuevas ni prefijos de idioma.** El idioma es transversal.
- **`/app/ajustes`**: nuevo **selector de idioma** (perfil del usuario) — cualquier usuario autenticado.
- **`/app/documentos/[codigo]`**: sección **"Traducciones"** (idioma inglés: título/descripción) — quien puede gestionar el documento.
- Públicas (`/`, `/login`, `/pqrs/[token]`…): idioma por `Accept-Language`.

## 5. Integraciones y riesgos
**Dependencias nuevas:** ninguna (diccionarios propios + `Intl` nativo).

**Top 3 riesgos y mitigación:**
1. **Esfuerzo desbordado (traducir toda la UI)** → se acota: v1 cubre el marco transversal y deja el patrón para sumar módulos incrementalmente (ADR-093); no se promete toda la app en una fase.
2. **Claves faltantes / textos sin traducir** → el tipo `Dictionary` obliga en compilación a que `en` tenga las mismas claves que `es`; el contenido sin traducir cae al original con marca discreta (nunca pantalla vacía).
3. **Explosión del modelo de datos** → tabla genérica `content_translations` (no se duplica ninguna tabla); habilitación por entidad sin migración adicional.

## ADRs

### ADR-091 — i18n por preferencia de usuario + diccionarios propios
**Contexto:** app autenticada (no SEO-driven en `/app`), español-first, regla de no sumar dependencias sin justificación.
**Decisión:** idioma en `profiles.locale`; diccionarios TypeScript tipados con helper `t()`; resolución en servidor + provider cliente; `Intl` para fecha/número; sin librería ni rutas por idioma.
**Consecuencias:** cero dependencias nuevas; sin reestructurar el enrutado; las públicas usan `Accept-Language`. Contra: no hay URLs localizadas para SEO por idioma (aceptado; no es objetivo de v1).

### ADR-092 — Contenido multilingüe por tabla genérica (no por columna/tabla)
**Contexto:** traducir contenido del cliente sin multiplicar el esquema.
**Decisión:** una tabla `content_translations (entity_type, entity_id, locale, field, value)` con RPC de escritura autorizada como la edición de la entidad; la fila base guarda el idioma original; el render hace fallback al original.
**Consecuencias:** un solo punto de extensión; se habilita por entidad sin nuevas migraciones. Contra: las traducciones no se validan contra el esquema de cada entidad (se controla con una lista blanca de `entity_type`/`field` en la RPC).

### ADR-093 — Extracción de textos de la UI por fases
**Contexto:** la app tiene cientos de textos en español incrustados; extraerlos todos es esfuerzo L.
**Decisión:** v1 traduce el marco transversal (shell/común/auth/ajustes) y entrega la infraestructura; cada módulo suma sus textos después, sin tocar otros módulos.
**Consecuencias:** valor visible pronto y riesgo acotado; durante la transición conviven módulos traducidos y no traducidos (aceptable: el no traducido se ve en español).

---
**Siguiente:** aprobación de Fernando (PARADA) → **diseño** (selector de idioma en Ajustes + sección Traducciones en documentos + marco de textos). Luego backend, seguridad, deploy. Después #5 BPM-lite.
