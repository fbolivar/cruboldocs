# Auditoría de seguridad — PWA offline de formularios (4a)

- **Fecha:** 2026-11-11
- **Auditor:** revisión adversarial (skill `auditoria-seguridad` / `seguridad-saas`)
- **Alcance:** `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`; `src/lib/pwa/{queue,sync,cleanup}.ts`; `src/components/pwa/pwa-shell.tsx`; integración offline en `src/components/formularios/field-renderer.tsx` (`SubmissionForm`); montaje en `src/app/app/layout.tsx` y metadatos/viewport en `src/app/layout.tsx`; limpieza al cerrar sesión en `src/components/shell/user-menu.tsx`; nota de privacidad en `/tratamiento-de-datos` §7. **Sin cambios de base de datos** (reusa `submit_new_submission` con su validación y RLS).

## Resumen ejecutivo (3 líneas)
La PWA es **aditiva y conservadora**: el service worker usa **network-first** (el comportamiento en línea no cambia) y solo sirve caché como respaldo sin conexión; cachea únicamente **assets inmutables** y las **páginas de diligenciar**, y **nunca** cachea API, server actions ni respuestas de Supabase. Las respuestas offline se guardan en **IndexedDB por dispositivo** y se envían al reconectar **llamando a la misma server action** (validación server-side + RLS). Las cachés e IndexedDB **se limpian al cerrar sesión**. Sin dependencias nuevas. No se hallaron vulnerabilidades Críticas, Altas ni Medias.

## Veredicto: **APTO**
0 Críticos · 0 Altos · 0 Medios · **2 Bajos** (aceptados). Habilitado para desplegar.

## Hallazgos
| # | Severidad | Hallazgo | Evidencia | Remediación |
|---|-----------|----------|-----------|-------------|
| BAJ-01 | Bajo (aceptado) | Una respuesta diligenciada offline contra una versión del formulario que se **re-publica** antes de sincronizar se valida contra la versión vigente; podría quedar en "Error" para corregir. | `flushQueue` → `submit_new_submission` valida contra `published_version`. | Avisar y permitir corregir (ya implementado). Refinamiento futuro: enviar con la versión capturada. No bloquea. |
| BAJ-02 | Bajo (aceptado) | En un dispositivo compartido, el formulario cacheado y la respuesta en cola persisten en IndexedDB/cachés **hasta cerrar sesión**. | Datos locales por dispositivo. | Se limpian al cerrar sesión (`clearOfflineData`) y se declara en `/tratamiento-de-datos` §7; se instruye cerrar sesión en equipos compartidos. |

## Verificaciones (sin hallazgos)
- **No altera el online:** el SW es *network-first* en navegación y *cache-first* solo para assets con hash (`/_next/static`, `/icon.svg`, `/manifest`); todo lo demás (API/acciones/Supabase) va **network-only**. Un usuario en línea siempre recibe contenido fresco; si el SW falla al registrarse, la app sigue igual (el registro está en try/catch y solo en producción).
- **Caché acotada y por sesión:** solo se cachean las páginas `**/app/formularios/**/responder`; no se cachean endpoints autenticados que mezclen datos de sesiones. Las cachés se **versionan** (`cd-*-v1`) y se **borran al cerrar sesión** (mensaje `CLEAR_CACHES` al SW + `caches.delete`), junto con la cola (`clearQueue`).
- **Integridad al sincronizar:** `flushQueue` llama a `submit_new_submission`, que **valida en el servidor** (requeridos/tipos/opciones/cotas) y aplica **RLS** con la sesión actual; una respuesta en cola no evita la validación ni crea datos en otra organización. Una falla deja el ítem en "Error" para corregir/reintentar.
- **IndexedDB:** almacena solo lo que el usuario capturó (código/título del formulario y sus respuestas), por origen y dispositivo; sin PII añadida por el sistema. Lecturas/escrituras en try/catch; degrada a 0 si no hay IndexedDB.
- **CSP:** el service worker y el manifest se sirven desde `'self'`; la CSP vigente (`default-src 'self'`) cubre `worker-src` y `manifest-src` por *fallback*, y el registro corre desde el bundle con nonce (`'strict-dynamic'`). **No requirió cambios de CSP.**
- **Actualización del SW:** no hay `skipWaiting` automático; el nuevo SW espera y el usuario ve "Actualizar" (no recarga en medio de una captura). Sin dependencias nuevas; íconos y manifest primera-parte.

## Condiciones
- Ninguna que bloquee el despliegue. **Ampliación:** offline del resto de la app y adjuntos/fotos, diferidos; refinamiento de versión del formulario en la sincronización (BAJ-01).
