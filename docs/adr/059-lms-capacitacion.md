# ADR-059 — LMS / Capacitación: evaluación de opción múltiple auto-calificada en servidor

## Contexto
ISO 9001 (7.2) pide asegurar la **competencia** del personal. Hoy Competencias registra formación, pero
no **mide el aprendizaje**. Se quiere un módulo de cursos con material y **evaluación auto-calificada** +
constancia, sin filtrar la respuesta correcta al cliente ni confiar la nota del navegador.

## Decisión
Módulo propio **Capacitación** (`/app/capacitacion`): `courses` (código CAP-AAAA-###, material en
texto/enlace, `passing_score`, estado borrador/publicado/archivado), `course_questions` (opción múltiple
de **respuesta única**, `options` jsonb con la marca `correct`), `course_enrollments` (por usuario, con
`status` inscrito/aprobado/no_aprobado, `score` **calculado en servidor** y el intento en jsonb). Al
**tomar** el curso, un RPC `SECURITY DEFINER` entrega las preguntas **sin** la marca de correcta
(cualquier miembro activo puede tomarlo); al enviar, otro RPC **califica en el servidor** (`score =
correctas/total × 100`, aprueba si `≥ passing_score`). Constancia en pantalla; **PDF, video/SCORM,
versionado y la alimentación automática de Competencias se difieren**. RLS solo-SELECT + escritura por
RPC; gestión = Líder SIG o Líder del proceso.

## Consecuencias
- Mide aprendizaje de forma defendible (calificación server-side, umbral de aprobación).
- La respuesta correcta nunca viaja al tomador; la nota no se confía del cliente.
- El enlace con el registro de Competencias llega después. Ver [ADR-058].
