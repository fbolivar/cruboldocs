# ADR-026 — Reevaluación periódica con recordatorio por tarea+cron

## Contexto
8.4.2 pide seguimiento del desempeño en el tiempo, no una evaluación única. El proyecto ya tiene bandeja de
tareas + job diario (cron) + correo, usado para recertificación de accesos, captura de indicadores y revisión
de documentos vencidos.

## Decisión
Cada evaluación fija `next_eval_date` (p. ej. +12 meses por defecto, editable). El **job diario** crea una
**tarea** (tipo nuevo `reevaluar_proveedor`, entity_type `proveedor`) asignada al cargo responsable cuando
`next_eval_date` vence, y la notifica por correo (idempotente, como las demás tareas). La reevaluación es otra
`supplier_evaluation` (`kind='periodica'`) que recalcula estado y próxima fecha.

## Consecuencias
- Reutiliza el mecanismo existente sin dependencias nuevas; amplía los `check` de `tasks` (type/entity_type).
- El cargo responsable del recordatorio se resuelve por el proceso del proveedor (o el Líder SIG si no tiene
  proceso); se concreta en diseño/backend.
- Sin proceso ni cargo responsable claro, el recordatorio recae en el Líder SIG (evita tareas huérfanas).
