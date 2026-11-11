# ADR-047 — Versionado de formularios por clonación al publicar

## Contexto
Una plantilla diligenciada es evidencia de auditoría; editarla no debe alterar las respuestas ya recolectadas. Hay que decidir el modelo de versión.

## Decisión
`form_templates.status` borrador→publicado→archivado. En **borrador** se edita libremente; **publicar congela** la plantilla. Editar una plantilla publicada **clona** sus campos en una **nueva versión** (borrador) manteniendo la publicada vigente hasta re-publicar. Cada `form_submission` guarda `template_version` y referencia los campos de esa versión, de modo que las respuestas viejas conservan su estructura.

## Consecuencias
- La evidencia es estable: una respuesta siempre refleja el formato con que se diligenció.
- La UX distingue "editar borrador" de "nueva versión de una publicada".
- Más filas (campos por versión), aceptable; permite comparar versiones a futuro.
