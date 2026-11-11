# PWA offline de formularios (4a) y LMS / Capacitación (4b) — Arquitectura

> Entregable de la **fase de arquitectura** del feature #4 del roadmap v1.2. Se arquitecturan las dos
> piezas ahora, pero se **construyen por separado** (cada una con su pipeline). Fecha: 2026-11-11.
> **Pendiente de aprobación de Fernando (parada obligatoria de alcance).** No se escribe código ni
> migraciones en esta fase.

Decisiones de Fernando (2026-11-11): **dos sub-features separadas**; 4a = **PWA instalable +
diligenciar offline con cola de envío**; 4b = **módulo propio de capacitación** (curso + inscripción/
avance + evaluación auto-calificada + constancia).

---

# 4a — PWA offline de formularios

## A.1 Negocio
- **Problema:** las inspecciones y listas de verificación en **campo** (planta, obra, bodega) ocurren
  **sin señal**. El Constructor de formularios (#5) ya existe, pero solo funciona en línea. Falta poder
  **instalar la app** y **diligenciar offline**, sincronizando al reconectar.
- **Acción de valor:** el usuario abre un formulario publicado (queda cacheado), lo diligencia sin red y
  la respuesta se **envía sola** cuando vuelve la conexión.

## A.2 Diseño técnico
- **App instalable:** `manifest.webmanifest` (nombre, íconos, `start_url=/app`, `display=standalone`,
  colores de `design/tokens.md`), enlazado desde el layout.
- **Service worker propio** (sin dependencia nueva; archivo estático `public/sw.js` registrado en
  cliente): 
  - **Precache** del shell mínimo de la vista de diligenciar.
  - **Runtime cache** del formulario publicado que el usuario abre (resultado de
    `get_published_form_by_code`) → disponible offline. Estrategia: *network-first* con *fallback* a
    caché en navegación; *cache-first* para assets con hash.
  - **Versionado del SW** (nombre de caché por versión) + aviso simple de "hay una actualización".
- **Diligenciar offline:** la respuesta se guarda en **IndexedDB** (cola local por usuario). Al "Enviar"
  sin red, se **encola**; con red, se envía de inmediato.
- **Sincronización:** al volver online (evento `online`, o Background Sync donde exista) se envían las
  respuestas encoladas vía `submit_new_submission`; la **validación server-side** se aplica al sincronizar
  (si falla, el ítem queda marcado con el error para corregir y reintentar).

## A.3 Seguridad y privacidad
- **Datos en el dispositivo:** el formulario cacheado y las respuestas en cola viven en el navegador (por
  dispositivo). **Se limpian las cachés e IndexedDB al cerrar sesión** y se acotan al usuario autenticado;
  no se cachean respuestas de API sensibles ni datos de otra sesión.
- **Nada de terceros:** todo es primera-parte; sin nuevas dependencias ni CDNs. El SW solo cachea lo que
  el usuario autenticado ya pidió.
- **Declaración de privacidad:** añadir una nota de "almacenamiento local para uso sin conexión" en
  `/tratamiento-de-datos` (no es transferencia a terceros; es almacenamiento en el equipo del usuario).

## A.4 Alcance del MVP (4a)
| Feature | ¿v1? | Justificación |
|---|---|---|
| App instalable (manifest + SW) | **Sí** | Base de la experiencia offline. |
| Cachear el formulario publicado abierto | **Sí** | Permite diligenciar sin red. |
| Cola de respuestas en IndexedDB + sync al reconectar | **Sí** | El valor real (inspecciones sin señal). |
| Limpieza de cachés al cerrar sesión | **Sí** | Privacidad en dispositivos compartidos. |
| Offline del resto de la app (todos los módulos) | **No** (diferido) | Alcance acotado a formularios. |
| Fotos/adjuntos offline | **No** (diferido) | Sin Storage de adjuntos todavía. |

## A.5 Riesgos y mitigación (4a)
1. **Fuga de caché entre usuarios** en dispositivo compartido → limpiar cachés/IndexedDB al cerrar
   sesión; cachear solo lo del usuario actual.
2. **Versión del formulario tras re-publicar** (respuesta offline contra v1, enviada ya con v2) →
   `submit_new_submission` valida contra la versión vigente; se avisa y se permite corregir. Refinamiento
   futuro: enviar con la versión capturada.
3. **SW con caché obsoleto rompiendo la app** → versionar el caché, actualización controlada y botón de
   "recargar para actualizar".

---

# 4b — LMS / Capacitación (ISO 9001 7.2 Competencia)

## B.1 Negocio
- **Problema:** formar al personal y **medir el aprendizaje** (no solo registrar asistencia). Extiende
  Competencias con **cursos** y **evaluación auto-calificada** + constancia.
- **Acción de valor:** el gestor crea un curso con material y una evaluación; el colaborador lo toma, es
  evaluado automáticamente y obtiene una **constancia** si aprueba.

## B.2 Modelo de dominio (multi-tenant, RLS por `organization_id`)
- **`courses`**: `id`, `organization_id`, `code` (CAP-AAAA-###), `title`, `description`, `content`
  (texto/markdown o enlace), `process_id` (opc.), `passing_score` (umbral %, def. 70), `status`
  (borrador/publicado/archivado), `created_by`, timestamps.
- **`course_questions`**: `id`, `organization_id`, `course_id`, `order_index`, `text`, `options` (jsonb:
  `[{text, correct}]`, opción múltiple de **respuesta única**), `is_active`.
- **`course_enrollments`**: `id`, `organization_id`, `course_id`, `user_id`, `status`
  (inscrito/aprobado/no_aprobado), `score` (0–100, **calculado en servidor**), `answers` (jsonb del
  intento), `completed_at`.
- **`course_counters`** (deny-all) para `CAP-AAAA-###`.
- **Auto-calificación en servidor:** al enviar la evaluación, un RPC calcula `score = correctas/total ×
  100` y fija `status` (aprobado si `score ≥ passing_score`). El cliente nunca califica.
- **Constancia:** en pantalla (código, persona, curso, fecha, puntaje). **PDF diferido.**

## B.3 Rutas y roles
- **`/app/capacitacion`** (lista de cursos + "Nuevo curso"): ver = roles del SIG; crear/publicar =
  Líder SIG o Líder del proceso.
- **`/app/capacitacion/[codigo]`** (ficha): material, editor de preguntas (si gestiona), publicar, y
  **resultados/inscripciones**.
- **`/app/capacitacion/[codigo]/tomar`** (tomar el curso): material + evaluación → resultado + constancia.
  Diligenciar = **cualquier miembro activo** (vía RPC definer, como el diligenciar de formularios).

## B.4 Alcance del MVP (4b)
| Feature | ¿v1? | Justificación |
|---|---|---|
| Curso (material en texto/enlace) + publicar | **Sí** | Núcleo. |
| Evaluación de opción múltiple auto-calificada + umbral | **Sí** | Mide aprendizaje (server-side). |
| Inscripción y resultado (aprobado/no aprobado) + constancia en pantalla | **Sí** | Evidencia de competencia. |
| Certificado en PDF | **No** (diferido) | La constancia en pantalla cubre el MVP. |
| Video/SCORM, secciones, versionado del curso | **No** (diferido) | Fuera del MVP. |
| Alimentar automáticamente el registro de Competencias | **No** (diferido) | Enlace suave; se evalúa luego. |

## B.5 Riesgos y mitigación (4b)
1. **Fuga de la respuesta correcta al cliente** (el tomador vería `correct` en las opciones) → al tomar
   el curso, el RPC entrega las preguntas **sin** la marca de correcta; la calificación ocurre en el
   servidor.
2. **Puntaje manipulado** → se calcula en el servidor (RPC), nunca se confía del cliente.
3. **Alcance creciente** (PDF, video) → diferidos explícitamente.

## ADRs
- **ADR-058** — PWA offline de formularios: **service worker propio** (sin dependencia nueva), **cola en
  IndexedDB** + sincronización al reconectar con **validación server-side**; limpieza de cachés al cerrar
  sesión; alcance acotado a formularios.
- **ADR-059** — LMS módulo propio (Capacitación): curso + **evaluación de opción múltiple
  auto-calificada en servidor** (umbral de aprobación) + constancia en pantalla; las preguntas se
  entregan **sin la respuesta correcta**; PDF, video y alimentación de Competencias **diferidos**.

---

> Parada obligatoria: Fernando aprueba este alcance antes de pasar a diseño. Al aprobar, se elige cuál
> construir primero (4a o 4b); se desarrollan en pipelines separados.
