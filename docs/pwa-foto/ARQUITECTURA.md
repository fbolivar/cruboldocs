# Arquitectura — PWA con foto / inspecciones móviles

**Producto:** CrubolDocs · **Feature:** v1.3-4 · **Fecha:** 2026-11-11 · **Responsable:** Fernando Bolívar.
**Stack fijo:** Next.js (App Router) + TypeScript · Tailwind + tokens Hex Core · Supabase (Postgres + RLS + Storage) · Vercel.

> PARADA OBLIGATORIA: este documento fija el **alcance del MVP** y requiere la aprobación de Fernando antes de pasar a diseño.

## 1. Negocio
- **Problema:** las inspecciones de campo necesitan **evidencia fotográfica**. Hoy los formularios (y su modo offline, v1.2-4a) no capturan fotos; ISOTools vende "inspecciones móviles".
- **Acción de valor:** un **campo de tipo "imagen"** en el constructor de formularios; al diligenciar (con la cámara del celular) se adjuntan fotos, **también sin conexión**, y se suben al sincronizar. "Inspección móvil" = un formulario con fotos.
- **Decisiones (Fernando, 2026-11-11):** fotos en **Supabase Storage** (bucket con RLS); **nuevo tipo de campo "imagen"**; **offline con foto** (captura y encola, sube al reconectar); **compresión en el cliente** (canvas, sin dependencia).
- **Privacidad:** una foto puede contener **dato personal** (rostros, matrículas). Se añade una nota en `/tratamiento-de-datos` (el Cliente es responsable del contenido que carga, 7.6-1) **antes de habilitar** el campo; sin reconocimiento facial ni IA sobre las imágenes.

## 2. Modelo de dominio
Reutiliza el pipeline de archivos ya probado (documentos/evidencias): **subida solo por el servidor** (ticket firmado a zona temporal → el servidor valida la **firma binaria** y promueve a la ruta final). No cambia `submission_values` (el valor del campo imagen es una **lista de rutas** de Storage).

### Storage: bucket `form-photos` (nuevo) — ADR-070
- Privado; `allowed_mime_types` = image/jpeg, image/png, image/webp; `file_size_limit` ≈ 10 MB.
- Ruta final: `<organization_id>/<template_id>/<uuid>.<ext>`. Zona temporal `<base>/subida/<archivo>` (no legible por RLS, como hoy).
- **Lectura:** `storage_can_read_form_photo(name)` = `is_active_member(<org de la ruta>)`; política `select` en `storage.objects` para el bucket. El servidor emite **URLs firmadas cortas** solo al renderizar una respuesta que el usuario ya puede ver (la RLS de `submission_values`/`form_submissions` manda).
- **Escritura:** sin políticas de insert/update/delete para clientes; el servidor emite el ticket con `createUploadTicket` (service role) y promueve con `promoteUpload` (valida tamaño + magic bytes de imagen, que **ya** soporta `matchesSignature`).

### Campo "imagen" en el constructor — ADR-071
- Se agrega `'imagen'` al enum de tipos de `form_fields` (y a `add_field`/`update_field`).
- `config` del campo: `{ max?: number }` (máx. de fotos, def. 3, tope 10).
- `validate_submission_values` acepta `'imagen'`: el valor debe ser **arreglo de strings** (rutas), cada una con prefijo `<org>/<template_id>/`, cantidad ≤ `max`; requerido ⇒ ≥1.

### Offline con foto — ADR-072
- Al capturar, la imagen se **comprime en canvas** (máx. 1600 px lado mayor, JPEG ~0.85) → `Blob`.
- **En línea:** se pide ticket → se sube el blob → la ruta (temporal) viaja en el valor; al **enviar**, el servidor promueve a final.
- **Sin conexión:** el blob se guarda en **IndexedDB** junto a la respuesta encolada (store nuevo `photos`, versión de BD +1). Al **sincronizar** (online): por cada foto se pide ticket, se sube el blob y se envía la respuesta (que promueve). Un fallo deja el ítem en "error" para reintentar (igual que hoy).

## 3. Alcance del MVP
| Feature | ¿v1? | Justificación |
|---|---|---|
| Tipo de campo "imagen" (constructor + diligenciar) | **Sí** | Núcleo |
| Captura con cámara en móvil (`capture`) | **Sí** | Inspección móvil |
| Compresión en el cliente (canvas) | **Sí** | Costo/tamaño (decisión de Fernando) |
| Bucket `form-photos` + subida servidor + URLs firmadas | **Sí** | Reusa el patrón probado |
| Offline: capturar, encolar y subir al sincronizar | **Sí** | Decisión de Fernando |
| Ver las fotos en la respuesta (miniaturas + ampliar) | **Sí** | Sin esto no sirve |
| Varias fotos por campo (máx. configurable) | **Sí** | Inspecciones reales |
| Anotaciones/marcas sobre la foto, geolocalización, EXIF | No | Diferido |
| Fotos en el PDF/CSV del informe | No | Diferido (CSV: cuenta de fotos) |
| Limpieza de huérfanas en zona temporal | No | Se difiere (las finales quedan atadas a la respuesta) |

**Camino dorado:** diseñar un formulario "Inspección de EPP" con un campo **foto** → en el celular, sin señal, diligenciar y **tomar 2 fotos** → se encolan → al volver la señal, se **suben y envían** solas → ver la respuesta con sus fotos.

## 4. Mapa de rutas
Sin rutas nuevas: todo vive en **Formularios** (`/app/formularios/.../disenar`, `/responder`, y la ficha de respuesta). Permisos actuales: diseñar = Líder SIG / Líder del proceso; diligenciar = cualquier miembro activo; ver respuestas = roles del SIG.

## 5. Integraciones y riesgos
**Servicios externos / dependencias:** **ninguno nuevo** (Storage ya es parte del stack; compresión con canvas nativo).

**Top 3 riesgos y mitigación:**
1. **Costo/abuso de almacenamiento** → compresión en cliente + `file_size_limit` del bucket + máx. de fotos por campo + validación de **magic bytes** en el servidor (no se confía del cliente); tipos restringidos a imagen.
2. **Fuga entre organizaciones** → ruta con `<org>` validada; lectura por `is_active_member` del org de la ruta + URLs firmadas cortas emitidas solo sobre respuestas visibles; escritura solo por el servidor.
3. **Peso de los blobs offline en IndexedDB** → se guarda **ya comprimido**; límite de fotos; si falla la subida, queda en "error" para reintentar sin perder lo capturado.

## ADRs

### ADR-070 — Bucket `form-photos` con subida solo-servidor (reusa el patrón de archivos)
**Contexto:** ya existe un pipeline de Storage privado con ticket firmado + promoción validada por firma binaria; no hay que inventar otro.
**Decisión:** nuevo bucket `form-photos` (privado, solo imagen, ~10 MB); lectura por `storage_can_read_form_photo` + URLs firmadas; escritura por `createUploadTicket`/`promoteUpload` (service role en el servidor).
**Consecuencias:** seguridad equivalente a documentos/evidencias; el cliente nunca escribe con su sesión; limpieza de huérfanas diferida.

### ADR-071 — Tipo de campo "imagen" en el constructor
**Contexto:** las inspecciones son formularios con fotos; reusar el constructor y el offline evita un módulo nuevo.
**Decisión:** `'imagen'` como noveno… décimo tipo de campo; `config.max`; el valor es una lista de rutas; `validate_submission_values` lo valida (arreglo de rutas del org, cantidad ≤ max, requerido ⇒ ≥1).
**Consecuencias:** "inspección" sin entidad nueva; el CSV/informe de fotos se difiere (el CSV muestra la cuenta).

### ADR-072 — Offline con blobs comprimidos en IndexedDB
**Contexto:** el valor de una foto offline no puede ser una ruta (aún no se subió); hay que guardar el binario.
**Decisión:** comprimir en canvas al capturar; store `photos` en IndexedDB (BD versión +1) atado a la respuesta encolada; subir y promover al sincronizar.
**Consecuencias:** inspección 100% offline; más complejidad en la cola y la sincronización; el tamaño se controla con la compresión.

---
**Siguiente:** aprobación de Fernando del alcance (PARADA) → fase de **diseño** (campo imagen en el diseñador, captura/galería al diligenciar, miniaturas en la respuesta). Luego backend, seguridad y deploy. Después, #5 Salida no conforme (8.7) + SSO/API.
