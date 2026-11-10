# Arquitectura — Módulo 5: Competencias y formación (ISO 9001 7.2 / 7.3)

> Estado: **PROPUESTA — pendiente de aprobación de Fernando (parada obligatoria antes de diseño).**
> Fecha: 2026-11-10. Esfuerzo: M. Primer módulo de la fase "Apoyo" (cap. 7).

## 1. Negocio

- **Problema y para quién.** La norma 7.2 exige que la organización determine la **competencia necesaria** de quien hace trabajo que afecta la calidad, asegure esa competencia (educación, formación, habilidades, experiencia) y **conserve evidencia**. Hoy CrubolDocs tiene cargos (`positions`) y personas (`memberships`), pero no registra qué competencias requiere cada cargo, qué formación tiene cada persona, ni las **brechas**. Lo usa el **Líder SIG** (y RR. HH. donde exista) para auditar y cerrar brechas; cada **persona** ve su propia ficha.
- **Acción de valor principal.** Ver la **matriz de competencias** (persona × competencia) con su estado **cumple / brecha**, a partir del perfil del cargo y la evaluación registrada — y tener la evidencia (certificados) a un clic. Es el entregable que piden los auditores y que los competidores resuelven con hojas de cálculo.
- **Cobro.** Sin cobro por módulo (principio del proyecto); entra en el plan único de v1.
- **Mercado.** Colombia/B2B; dato personal sensible (formación y evaluación de personas) → Ley 1581, RLS estricto.

## 2. Modelo de dominio

Reutiliza `organizations`/`profiles`/`memberships`/`positions`/`processes`. **La persona se modela por `membership`** (no por `profile`): así el dato de competencia queda aislado por organización (una persona en dos organizaciones tiene dos fichas; ver ADR-022). Multi-tenant por `organization_id` en toda tabla, FKs compuestas `(id, organization_id)`, RLS solo-SELECT + escritura por RPC `SECURITY DEFINER` (espejo de los módulos 1–4).

### Entidades nuevas (MVP)

1. **`competencies`** — catálogo de competencias de la organización.
   `id, organization_id, name, description, kind ('educacion'|'formacion'|'habilidad'|'experiencia'), is_active, created_by/at, updated_at`. `unique(organization_id, name)`. **Dato sensible: no** (es catálogo, no de persona).

2. **`position_competencies`** — perfil de competencias del **cargo** (qué exige el puesto).
   `id, organization_id, position_id→positions(id,org), competency_id→competencies(id,org), required_level smallint (1..3 = básico/intermedio/avanzado), is_mandatory bool, note`. `unique(position_id, competency_id)`. Es la "descripción del cargo" en términos de 7.2.

3. **`trainings`** — eventos de formación/capacitación (interna o externa).
   `id, organization_id, title, kind ('interna'|'externa'), provider, training_date date, hours numeric, process_id?, note, created_by/at`. Numeración **no** necesaria (se listan por fecha).

4. **`training_attendees`** — persona ↔ formación, con evidencia y vencimiento.
   `id, organization_id, training_id→trainings(id,org), membership_id→memberships(id,org), completed bool, result ('aprobado'|'no_aprobado'|'asistio'), certificate_path text? , certificate_sha256 text?, certificate_name text?, valid_until date?, created_by/at`. El certificado va al **bucket privado** con el patrón endurecido de evidencias (registro server-only). `valid_until` dispara recordatorio de recertificación.

5. **`competency_assessments`** — evaluación de una **persona** frente a una competencia (análisis de brecha).
   `id, organization_id, membership_id→memberships(id,org), competency_id→competencies(id,org), position_id→positions(id,org) (el cargo frente al que se evalúa), assessed_level smallint (0..3), meets bool (derivado: assessed_level ≥ required_level del perfil), gap_plan text?, status ('cumple'|'brecha'|'brecha_en_plan'), assessed_by, assessed_at, next_review_date date?, note`. La **matriz** se arma cruzando `position_competencies` (requerido) con la última `competency_assessments` por persona+competencia.

> **Modelo mínimo deliberado:** catálogo + perfil por cargo + formación por persona + evaluación con brecha. Se descarta para v1 un LMS (cursos con contenido/quizzes), rutas de aprendizaje y versiones del perfil del cargo. Ver ADR-020.

### Relaciones (texto)

- `positions 1—N position_competencies N—1 competencies` (perfil del cargo).
- `memberships 1—N training_attendees N—1 trainings` (quién tomó qué formación).
- `memberships 1—N competency_assessments N—1 competencies`, con `position_id` de contexto (evaluación y brecha).
- La **matriz** y el **% de cobertura de competencias** son **derivados** (no se persisten): requerido (perfil del cargo de la persona) vs. evaluado (última evaluación).

### Datos sensibles (RLS estricto + auditoría)

`training_attendees` y `competency_assessments` contienen datos personales de desempeño/formación. **RLS:** los gestiona el Líder SIG; el Líder de proceso ve/gestiona los de **su** proceso (por el `process_id` del cargo de la persona); **cada persona ve su propia ficha** (sus asistencias y evaluaciones). `log_event` en cada mutación. Certificados en Storage con URL firmada y lectura por RLS.

## 3. Alcance del MVP

| Feature | ¿v1? | Justificación |
|---|---|---|
| Catálogo de competencias (`competencies`) | **Sí** | Base de todo; pocas filas, alto valor. |
| Perfil de competencias por cargo (`position_competencies`, con nivel requerido) | **Sí** | Es el requisito de 7.2; sin esto no hay brecha que medir. |
| Registro de formación por persona (`trainings` + `training_attendees`) | **Sí** | Evidencia que piden los auditores. |
| Certificado adjunto (Storage privado, patrón evidencias) | **Sí** | Evidencia objetiva; reutiliza el patrón ya endurecido. |
| Evaluación de competencia por persona + brecha (`competency_assessments`) | **Sí** | La acción de valor: cumple/brecha. |
| **Matriz de competencias** (persona × competencia, estado) | **Sí** | Entregable estrella; vista derivada. |
| Recordatorios: certificado por vencer y reevaluación periódica (tareas+cron) | **Sí** | Reutiliza el cron/tareas existente; barato. |
| Toma de conciencia 7.3 | **Reutiliza** | Se cubre con la **confirmación de lectura** de documentos ya existente; no se duplica (ADR-021). |
| Cierre de brecha → **tarea** asignada al cargo | **Sí (tarea)** | Manual, simple. |
| Brecha → genera **No Conformidad** con un clic | **No (diferido)** | Se anota; se evalúa cuando el módulo esté en uso (ADR-023). |
| Generar **indicador** "% de competencias cubiertas" | **No (diferido)** | El dato es derivable; se conecta a Indicadores después. |
| LMS (cursos con contenido, quizzes, rutas de aprendizaje) | **No** | Otro producto; fuera de 7.2. |
| Versionado del perfil del cargo / historial de cambios del perfil | **No** | `log_event` da trazabilidad suficiente en v1. |
| Sugerencia de plan de formación por el agente IA | **No** | Requiere re-auditoría de privacidad; solo en ROADMAP. |
| Importación masiva (CSV) de competencias/formación | **No** | Carga manual en v1; exportación CSV sí. |

**Camino dorado:** Líder SIG crea competencias en el catálogo → define el **perfil** de un cargo (competencias + nivel requerido) → registra una **formación** y marca a las personas que asistieron (con certificado) → **evalúa** a una persona frente al perfil (nivel por competencia) → la **matriz** muestra cumple/brecha → para una brecha, crea una **tarea** de cierre (y adjunta más formación cuando se cierre).

Cabe en 4 pantallas: matriz/tablero, ficha de cargo (perfil), ficha de persona (formación + evaluaciones + brechas), y registro de formación.

## 4. Mapa de rutas

Todas bajo `/app` (middleware ya protege). Visibles para roles del SIG; gestión = Líder SIG; cada persona ve su propia ficha.

| Ruta | Qué muestra | Quién la ve |
|---|---|---|
| `/app/competencias` | **Matriz** persona × competencia por cargo/proceso, con filtros (proceso, cargo, estado cumple/brecha) y resumen (coberturas, brechas abiertas, certificados por vencer). Accesos a catálogo y formación. | Roles SIG (ver). Líder de proceso: su proceso. Líder SIG: todo. |
| `/app/competencias/catalogo` | Catálogo de competencias (CRUD) + Sheet "Nueva competencia". | Gestión: Líder SIG. |
| `/app/competencias/cargos/[id]` | **Perfil** del cargo: competencias requeridas con nivel; editar requisitos. | Ver: SIG. Gestión: Líder SIG. |
| `/app/competencias/personas/[membershipId]` | **Ficha de la persona**: competencias requeridas por su cargo vs. evaluadas (brechas), formación tomada (con certificados y vencimientos), Sheet "Evaluar competencia" y "Registrar formación". | Líder SIG; Líder del proceso del cargo; **la propia persona** (solo lectura de lo suyo). |
| `/app/competencias/formacion` | Registro de formaciones (lista por fecha) + Sheet "Nueva formación" con asistentes. | Ver: SIG. Gestión: Líder SIG. |

(Las fichas de cargo/persona pueden abrirse como subrutas o paneles; el diseño lo define la siguiente fase.)

## 5. Integraciones y riesgos

**Integraciones (todas reutilizadas, sin dependencias nuevas):**
- **Storage** (bucket privado + RLS + registro server-only) para certificados — patrón endurecido de evidencias de control/NC (AUD ALTA-01 / migración 019).
- **Tareas + cron/correo** para recordatorios (certificado por vencer, reevaluación periódica) — mismo mecanismo que recertificación de accesos y captura de indicadores.
- **log_event** (traza inmutable) en cada mutación.
- **Exportación CSV** de la matriz (como documentos/riesgos/auditoría).
- Futuro (diferido): **Indicadores** (% de competencias cubiertas) y **No Conformidades** (brecha → NC con un clic).

**Top 3 riesgos y mitigación:**
1. **Fuga de datos personales de desempeño/formación** (más sensibles que el resto del SGC). → RLS estricto por `organization_id` **y** por alcance (Líder de proceso solo su proceso; la persona solo lo suyo); certificados solo por URL firmada con RLS; `security definer search_path=''`; prueba de aislamiento con 2 orgs **y** entre personas de la misma org. Auditoría de seguridad obligatoria antes del deploy.
2. **Inflado de alcance hacia un LMS** (cursos, contenidos, quizzes). → Alcance cortado a *registro + evaluación + brecha*; el catálogo y la formación son metadatos, no contenido. Lo demás, al ROADMAP.
3. **Modelado persona↔competencia ambiguo** (profile vs membership; persona en varias orgs; cambios de cargo). → Se cuelga de `membership` (ADR-022); la evaluación guarda el `position_id` de contexto, así un cambio de cargo no reescribe el historial.

## Decisiones (ADR)
- **ADR-019** — Escritura por RPC `SECURITY DEFINER` y visibilidad (gestión Líder SIG; Líder de proceso su proceso; la persona su ficha).
- **ADR-020** — Modelo de competencias: catálogo + perfil por cargo con nivel + evaluación por persona con brecha (no texto libre, no LMS).
- **ADR-021** — Toma de conciencia (7.3) se cubre reutilizando la confirmación de lectura de documentos; no se duplica.
- **ADR-022** — La competencia de la persona se cuelga de `membership` (no de `profile`); la evaluación conserva el `position_id` de contexto.
- **ADR-023** — Cierre de brecha = **tarea** en el MVP; brecha→NC e indicador de cobertura **diferidos** (anotados).

## Checklist de salida
- [x] Multi-tenant (org + membership + rol) definido y reutilizado.
- [x] MVP cabe en 4 pantallas.
- [x] Camino dorado de punta a punta.
- [x] Riesgos con mitigación.
- [ ] **Fernando aprueba el alcance antes de pasar a diseño.**
