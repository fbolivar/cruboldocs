# Auditoría de seguridad — Multi-idioma (v1.4-4)

**Fecha:** 2026-11-11 · **Auditor:** rol adversarial (skill seguridad-saas) · **Alcance:** migración 050 (`profiles.locale`, `content_translations`, RPCs `set_user_locale`/`set_content_translation`/`content_translation_authorize`), infraestructura i18n (`src/lib/i18n/*`, `LocaleProvider`), server actions `setUserLocale`/`setContentTranslation`, UI (selector de idioma en el menú de cuenta, sección de traducciones en la ficha de documento, chip "sin traducir").

## Resumen ejecutivo (3 líneas)
El idioma es una preferencia por usuario (`profiles.locale`) que solo el propio usuario modifica vía RPC `security definer` sobre `auth.uid()`. La traducción de contenido usa una tabla genérica `content_translations` con RLS por `organization_id` y escritura por RPC con **lista blanca de entidad/campo** y la **misma autorización que editar esa entidad** (documentos: elaborador/Líder SIG/Líder del proceso). No se agregó superficie `anon` ni datos personales. **Veredicto: APTO.**

## Veredicto
**APTO** — sin hallazgos Críticos ni Altos abiertos.

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| I-01 | Info | `content_translations` es legible por cualquier miembro activo de la org. | RLS select `is_active_member(organization_id)`; es metadato del mismo contenido que el miembro ya puede ver (título del documento). Sin dato sensible. | Aceptado |
| I-02 | Bajo | Escritura genérica podría intentar traducir entidades/campos arbitrarios. | `set_content_translation` valida lista blanca (`entity_type='documento'` y `field in (title,description)`) **antes** de autorizar; `content_translation_authorize` resuelve el `org` de la entidad y exige rol de edición; entidad/campo fuera de lista → excepción. | Mitigado |
| I-03 | Info | `set_user_locale` escribe en `profiles`. | Solo actualiza la fila de `auth.uid()`; valida `locale in ('es','en')`; no toca otras columnas ni otros usuarios. | Aceptado |

## Verificaciones realizadas
- **Aislamiento multi-tenant:** `content_translations` con RLS select por `organization_id`; el `org` de la traducción se deriva **de la entidad** (documento), nunca del cliente. Pruebas RLS 050: Beto (org B) no traduce ni ve traducciones de A; nadie inserta por REST.
- **Autorización de escritura:** misma regla que editar el documento (elaborador/Líder SIG/Líder del proceso); la consulta (Sofía) es rechazada ("No puedes traducir"); documento de otra org → "sin acceso".
- **Lista blanca:** campo fuera de lista ("body") y entidad fuera de lista ("otra") rechazados; idioma inválido (`fr`) rechazado tanto en `set_user_locale` como en `set_content_translation`.
- **Sin superficie anon nueva:** `set_user_locale`/`set_content_translation`/`content_translation_authorize` revocadas de `public`/`anon`; `anon`-ejecutables = las 6 ya existentes (encuesta + portal). Sin `function_search_path_mutable` (todas con `search_path=''`).
- **Sin hard delete:** "sin traducción" se representa con valor vacío (coherente con la baja lógica del proyecto); no hay sentencias destructivas nuevas.
- **UI/Server actions:** `setUserLocale`/`setContentTranslation` validan locale y uuid, pasan por `guard/ok/fail/dbMessage` (sin fuga de errores); el fallback de contenido cae al original con marca visible "sin traducir" (nunca expone vacío ni contenido de otra org).
- **Dato personal:** ninguno nuevo; `locale` es preferencia.

## Conclusión
Multi-idioma se puede desplegar. No hay Críticos ni Altos. Los ítems Info/Bajo quedan aceptados o mitigados conforme al diseño aprobado (ADR-091/092/093).
