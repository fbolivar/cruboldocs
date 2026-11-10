# ADR-012 — Recordatorio de captura de medición por tareas + cron

## Contexto
Un indicador tiene una frecuencia (mensual, trimestral, …). Si el responsable no captura la medición
del periodo, el indicador se "cae" sin que nadie lo note — justo lo que ISO 9.1 busca evitar. La app
ya tiene tareas (`tasks`), un cron diario (`/api/cron/diario`) y outbox de correo que resuelven el caso
equivalente de "documento vencido por revisar".

## Decisión
Se incluye en el MVP un recordatorio: cuando un periodo vence sin medición para un indicador `activo`
con responsable, el cron encola una tarea `capturar_medicion` (nueva `TaskType`, `entity_type`
`indicador`, categoría `mejora`) para el cargo responsable, y el outbox envía el correo, igual que los
documentos vencidos. Al registrar la medición del periodo, la tarea se completa (`complete_tasks`).

## Consecuencias
- Reutiliza tareas + cron + outbox ya existentes; costo marginal bajo.
- El indicador no depende de que alguien "se acuerde"; queda evidencia de seguimiento para el auditor.
- Amplía los `check` de `tasks` (`type`, `entity_type`) por migración (patrón ya usado en 017/020).
