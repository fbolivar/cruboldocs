# ADR-023 — Cierre de brecha = tarea en el MVP; brecha→NC e indicador diferidos

## Contexto
Cuando una evaluación detecta una **brecha** (evaluado < requerido), hay que actuar. Las opciones de
integración ya existen en el producto: crear una **tarea** asignada al cargo, generar una **No
Conformidad** con un clic (como hallazgo→NC o medición→NC), o alimentar un **indicador** "% de
competencias cubiertas". Cada integración añade superficie y auditoría.

## Decisión
En el MVP, cerrar una brecha se hace con una **tarea** de cierre (tipo nuevo, p. ej. `cerrar_brecha`),
asignada al cargo responsable, con fecha; y registrando luego la formación/reevaluación que la cierra. La
generación de **NC desde una brecha** y el **indicador de cobertura** se **difieren** (quedan anotados en
el ROADMAP y se evalúan cuando el módulo esté en uso real). Los recordatorios (certificado por vencer,
reevaluación periódica) sí entran, vía tareas+cron, con el mecanismo existente.

## Consecuencias
- Entrega un cierre de brecha accionable sin ampliar la superficie de integración en v1.
- Mantiene corta la auditoría de seguridad del módulo (menos RPCs que tocan otros módulos).
- Cuando se active brecha→NC, se reutilizará `report_nonconformity` con un `source` nuevo (p. ej.
  `competencia`), siguiendo el patrón idempotente ya probado (`for update`).
