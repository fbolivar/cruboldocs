# Auditoría de seguridad — Capacitación / LMS (v1.2-4b)

**Fecha:** 2026-11-11 · **Auditor:** adversarial (skill seguridad-saas) · **Alcance:** módulo Capacitación (ISO 9001 7.2).
**Migración:** `supabase/migrations/040_capacitacion.sql` · **Capa de datos:** `queries.ts` (getCoursesSummary/listCourses/getCourse/getCourseToTake) + `actions.ts` (createCourse/updateCourseData/add·update·removeCourseQuestion/publishCourse/setCourseArchived/submitCourseAttempt/exportCourseResultsCsv) · **UI:** `src/components/capacitacion/*`, `src/app/app/capacitacion/**`.

## Resumen ejecutivo
Módulo LMS con cursos, evaluación de opción múltiple **calificada en el servidor** y constancia en pantalla. Espejo de los 8 módulos previos (todos APTO): RLS solo-SELECT por `organization_id` + escritura por RPC `SECURITY DEFINER` con `search_path=''` y autorización interna por rol. El riesgo propio del módulo —filtrar la respuesta correcta a quien toma el curso— está mitigado en el servidor y verificado con prueba. Sin críticos ni altos abiertos.

## Veredicto: **APTO**

## Hallazgos

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| 1 | — (control clave) | La respuesta correcta no debe llegar al cliente al tomar el curso | `get_course_to_take` entrega las opciones como **texto plano** (strip de `correct`); `submit_course_attempt` califica en el servidor buscando el índice correcto por `row_number`. Prueba RLS: «get_course_to_take NUNCA filtra la marca de correcta» y «Responder bien → 100%». `getCourse` solo expone `correct` a quien gestiona. | OK |
| 2 | Info | `course_counters` con RLS activo sin políticas (deny-all) | Advisor `rls_enabled_no_policy` (esperado, igual que los 18 contadores previos); numeración atómica `CAP-AAAA-###` por `on conflict do update`. | Aceptado |
| 3 | Info | RPCs `SECURITY DEFINER` ejecutables por `authenticated` | Advisor `authenticated_security_definer_function_executable` (patrón del proyecto); **ninguna** RPC de curso es ejecutable por `anon` (advisor anon sigue en 2: solo encuesta pública). Autorización interna por `can_manage_courses`/`is_active_member`. | Aceptado |
| 4 | Verificado | Aislamiento multi-tenant | Beto (org B) no ve ni crea cursos de A; FKs compuestas `(id, organization_id)`; `course_or_fail`/`question_course` validan `is_active_member`. Prueba RLS. | OK |
| 5 | Verificado | Autorización por rol en toda mutación | Crear/editar/publicar = Líder SIG o Líder del proceso; consulta rechazada; preguntas congeladas tras publicar; archivar vuelve a borrador. `decide`-style no aplica. Pruebas RLS. | OK |
| 6 | Verificado | Validación de entrada | Zod en server actions (título 3–200, umbral entero 0–100, opciones ≥2 con exactamente una correcta, respuestas enteras 0–50); `valid_question_options` revalida en la base; CSV por `toCsv` (anti-fórmula). `dbMessage` evita fuga de errores internos. | OK |

## search_path / secretos
- `function_search_path_mutable` = **0** (todas las funciones con `set search_path=''`).
- Sin secretos en código; sin bucket ni columnas de archivo (constancia/PDF diferidos, sin hueco).

## Checklist
- [x] RLS activo en courses/course_questions/course_enrollments + deny-all en course_counters
- [x] Escritura solo por RPC definer con autz por rol
- [x] Respuesta correcta no sale al cliente (servidor califica) — probado
- [x] Aislamiento 2 orgs probado · numeración atómica
- [x] tsc + lint + 501 RLS + 237 unitarias + build en verde
- [x] Advisors sin críticos/altos nuevos (anon = 2, baseline)
