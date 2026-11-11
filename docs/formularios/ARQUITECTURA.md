# Arquitectura — v1.1-5: Constructor de formularios / listas de verificación configurables

> Estado: **PROPUESTA — pendiente de decisiones y aprobación de Fernando (parada obligatoria).**
> Fecha: 2026-11-10. Esfuerzo: XL. Es lo que separa "app de calidad" de "plataforma": que el cliente **diseñe sus propios formatos** (inspecciones, listas de verificación, formatos de acta, encuestas internas) sin programar y **recolecte respuestas**.

## 1. Negocio

- **Problema y para quién.** Cada organización tiene formatos propios (inspección de EPP, lista de verificación de orden y aseo, preoperacional de vehículos, formato de reunión…). Hoy no puede crearlos en la app. Lo usa el **Líder SIG / Líder de proceso** (diseña y publica) y cualquier **miembro** (diligencia).
- **Acción de valor principal.** (a) **Diseñar** un formulario arrastrando/añadiendo campos; (b) **publicarlo**; (c) que la gente lo **diligencie**; (d) ver/exportar las **respuestas**.
- **Cobro.** Sin cobro por módulo; es el gran diferenciador "plataforma".
- **Mercado.** Colombia/B2B; habilita infinidad de casos (SST, calidad, ambiental) con un solo motor.

## 2. Modelo de dominio (propuesta)

Multi-tenant por `organization_id`, FKs compuestas, RLS solo-SELECT + escritura por RPC. Patrón "plantilla versionada + respuestas con snapshot del esquema".

1. **`form_templates`** — plantilla. `id, organization_id, code (FORM-AAAA-###), title, description?, category ('inspeccion'|'lista_verificacion'|'formato'|'encuesta_interna'|'otro'), process_id?, status ('borrador'|'publicado'|'archivado'), version int, created_by/at, updated_at, published_at?`.
2. **`form_fields`** — campos de la plantilla (ordenados). `id, organization_id, template_id, order_index, type ('texto'|'texto_largo'|'numero'|'fecha'|'seleccion'|'multiseleccion'|'si_no'|'puntaje'|'seccion'), label, help?, required bool, options jsonb? (para selección/multiselección), config jsonb? (min/max, escala…)`.
3. **`form_submissions`** — una respuesta diligenciada. `id, organization_id, template_id, template_version int, process_id?, submitted_by, submitted_at, status ('borrador'|'enviada')`.
4. **`submission_values`** — valores por campo. `id, organization_id, submission_id, field_id, value jsonb` (tipado según el campo; se valida en el servidor contra el esquema de la versión).
5. **`form_counters`** — `FORM-AAAA-###`.

El **snapshot**: la respuesta guarda `template_version`; si la plantilla se re-publica con cambios, las respuestas viejas conservan su versión. (Para el MVP, los valores referencian `field_id`; al versionar se clonan los campos → ver ADR.)

## 3. Decisiones de alcance (lo que necesito que decidas)

| Decisión | Opciones | Recomendación |
|---|---|---|
| **A. Tipos de campo del MVP** | mínimo (texto, texto largo, número, fecha, sí/no, selección, multiselección, puntaje, sección) · + avanzados (archivo adjunto, firma, tabla/grilla, lógica condicional, fórmulas) | **Mínimo** (los 9 listados). Archivo/firma/condicional/fórmulas **diferidos** (cada uno re-audita: Storage, firma ADR-004, motor de reglas). |
| **B. Quién diligencia en v1** | (1) **interno** (usuarios con sesión, asignable a cargo/proceso) · (2) interno + **público por link** (como la encuesta) | **(1) Interno** en el MVP. El público reusaría el patrón de la encuesta (token + anti-abuso) y abre superficie; se añade después como v1.1-5b. |
| **C. Versionado** | (1) **clonar al publicar** (editar crea borrador de nueva versión; respuestas guardan su versión) · (2) plantilla mutable sin versión | **(1) Clonar/congelar**: una plantilla publicada es evidencia; editar genera una nueva versión y las respuestas apuntan a la versión con la que se diligenciaron. |
| **D. ¿Reemplaza módulos existentes?** | integrarlo con auditorías/actas/PQRS · módulo **independiente** | **Independiente** (`/app/formularios`) en v1; integraciones (p. ej. lista de verificación de auditoría) como ampliación. No tocar los módulos en producción. |
| **E. Relación con la Encuesta (v1.1-2)** | fusionar · mantener separadas | **Separadas**: la encuesta es pública/anónima y específica de 9.1.2; el constructor es interno y genérico. Si luego se quiere encuesta multi-pregunta pública, se une el motor con el patrón de token. |

## 4. Alcance MVP propuesto (si A=mínimo, B=interno, C=clonar, D=independiente)

| Feature | ¿v1.1-5? | Justificación |
|---|---|---|
| **Diseñador** de plantilla: añadir/ordenar/editar campos (9 tipos), marcar requeridos, opciones de selección | **Sí** | El corazón del constructor. |
| **Publicar/archivar** plantilla; **versionado** por clonación | **Sí** | Congela la evidencia. |
| **Diligenciar** (interno): render dinámico desde el esquema + **validación server-side**; guardar borrador y enviar | **Sí** | La recolección. |
| Lista de **respuestas** por plantilla + ver una respuesta + **export CSV** (una fila por respuesta, columnas = campos) | **Sí** | La evidencia exportable. |
| Asignar una plantilla a un **proceso**/categoría y filtrar | **Sí** | Orden. |
| Adjuntos, firma, lógica condicional, fórmulas, tabla/grilla | **No (diferido)** | Cada uno con su auditoría. |
| Diligenciar **público por link** | **No (v1.1-5b)** | Reusará el patrón de la encuesta. |
| Analítica/tablero de respuestas | **No** | El CSV basta en v1; luego alimenta el Tablero. |

**Camino dorado:** el Líder SIG crea una plantilla **"Inspección de EPP"** → añade campos (texto, sí/no, puntaje, selección) → **publica** → un miembro la **diligencia** desde `/app/formularios` → el Líder ve las **respuestas** y las **exporta** para la evidencia/auditoría.

Pantallas: `/app/formularios` (lista de plantillas), `/app/formularios/[code]/editar` (diseñador), `/app/formularios/[code]` (ficha: info + respuestas), `/app/formularios/[code]/responder` (diligenciar). ~4 vistas.

## 5. Integraciones y riesgos

**Integraciones:** procesos/cargos, tareas (asignar diligenciamiento — opcional), `log_event`, CSV. Sin dependencias nuevas (el diseñador y el render se hacen con los primitivos existentes). Diferidos: Storage (adjuntos), firma, público.

**Top 3 riesgos y mitigación:**
1. **Complejidad del esquema dinámico.** → Tipos de campo **acotados** (9) con `options/config` en `jsonb`; la **validación de valores se hace en el servidor** contra el esquema de la versión (no se confía del cliente). Empezar simple; lo avanzado difiere.
2. **Versionado/evidencia.** → Publicar **congela**; editar **clona** a una nueva versión; las respuestas guardan `template_version` y referencian campos de esa versión → trazabilidad sin romper respuestas viejas.
3. **Aislamiento multi-tenant.** → `organization_id` + FKs compuestas + RLS solo-SELECT; escritura por RPC con `can_manage`/autor; prueba de 2 organizaciones. Los `jsonb` de valores se validan en tipo/longitud en el servidor.

## Decisiones (ADR, al aprobar)
- **ADR-046** — Motor de formularios: `form_templates` + `form_fields` (9 tipos) + `form_submissions` + `submission_values` (`jsonb` validado en servidor) + contador `FORM-AAAA-###`.
- **ADR-047** — Versionado por **clonación al publicar** (plantilla publicada = evidencia inmutable; respuestas con `template_version`).
- **ADR-048** — MVP **interno e independiente** (`/app/formularios`); público por link, adjuntos, firma, lógica condicional y analítica **diferidos**; separado de la Encuesta (v1.1-2).

## Checklist de salida
- [x] Multi-tenant (org + RLS).
- [x] Camino dorado de punta a punta (diseñar → publicar → diligenciar → exportar).
- [x] Riesgos con mitigación.
- [ ] **Fernando decide A–E y aprueba el alcance antes de pasar a diseño.**
