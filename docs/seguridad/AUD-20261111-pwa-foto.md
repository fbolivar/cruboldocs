# Auditoría de seguridad — PWA con foto / inspecciones móviles (v1.3-4)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** campo de foto en formularios + subida/lectura en Storage + offline.
**Migración:** `supabase/migrations/044_formulario_fotos.sql` · **Servidor:** `actions.ts` (prepareFormPhotos/getFormPhotoUrls/promoteImageValues) + `storage.ts` · **Cliente:** `src/components/formularios/photo-field.tsx`, `src/lib/pwa/photos.ts`, `queue.ts`, `sync.ts`.

## Resumen ejecutivo
Reutiliza el pipeline de archivos ya probado (ticket firmado → promoción que valida **magic bytes** de imagen), un bucket privado `form-photos` con lectura por `is_active_member` del org de la ruta, y un tipo de campo `imagen` cuyo valor (lista de rutas) se valida en el servidor (prefijo `<org>/<template>/`, cantidad ≤ máx). La subida es **solo por el servidor**; el cliente nunca escribe con su sesión. Offline: blobs comprimidos en IndexedDB, subidos al sincronizar. Sin críticos ni altos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | Verificado (control clave) | La ruta de la foto no cruza organización ni plantilla | `validate_submission_values` exige que cada ruta empiece por `<org_del_campo>/<template>/` y limita la cantidad al `max`; ruta de otra org rechazada ("no es válida"), exceso rechazado, requerido vacío rechazado. Pruebas RLS. | OK |
| 2 | Verificado | Lectura de fotos acotada a la organización | `storage_can_read_form_photo` = `is_active_member(<org de la ruta>)` con ruta de 3 segmentos; otra org y rutas mal formadas → false. URLs firmadas cortas (600 s) emitidas con el cliente del usuario (RLS del bucket manda). Pruebas RLS. | OK |
| 3 | Verificado | Escritura solo por el servidor | Sin políticas insert/update/delete para clientes; el servidor emite el ticket (`createUploadTicket`, service role) a zona temporal de 4 segmentos (no legible por RLS) y **promueve validando tamaño + firma binaria de imagen** (`matchesSignature`); el tipo declarado por el navegador no se confía. | OK |
| 4 | Verificado | Autorización de la preparación de subida | `prepareFormPhotos` exige organización activa, plantilla de la **misma org** y **publicada**; sin eso no emite tickets. | OK |
| 5 | Verificado | Offline sin fuga | Los blobs se guardan en IndexedDB del dispositivo, se suben al reconectar y se **borran** al enviar y **al cerrar sesión** (`clearPhotos`). Comprimidos antes de almacenar. | OK |
| 6 | Info / Privacidad | Una foto puede contener dato personal | Nota añadida en `/tratamiento-de-datos`: almacenamiento privado por organización, responsabilidad del Cliente sobre el contenido, sin IA/reconocimiento facial. | Aceptado |
| 7 | Info | Bucket/tipos y advisors | Bucket privado, `allowed_mime_types` solo imagen, `file_size_limit` 10 MB; advisor anon sigue en 2; `function_search_path_mutable` = 0; `rls_enabled_no_policy` sin cambios (19). | Aceptado |

## Diferido sin hueco
- Limpieza de huérfanas en la zona temporal (las finales quedan atadas a la respuesta); fotos dentro del PDF/CSV (el CSV muestra la **cuenta**); anotaciones/EXIF/geolocalización.

## Checklist
- [x] Ruta validada por org+plantilla; cantidad ≤ máx (servidor) — probado
- [x] Lectura por `is_active_member` del org; URLs firmadas cortas — probado
- [x] Subida solo-servidor con validación de magic bytes
- [x] Offline: blobs comprimidos, borrados al enviar y al cerrar sesión
- [x] Nota de privacidad por imágenes
- [x] tsc + lint + 543 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, search_path 0)
