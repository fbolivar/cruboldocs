# ADR-030 — Reclamo → No Conformidad con un clic (en v1) y recordatorio de plazo

## Contexto
Un **reclamo** del cliente suele ser una no conformidad potencial (10.2). El enum
`nonconformities.source` **ya incluye `queja_pqrs`** (migración 017/022) y `report_nonconformity` es una
función probada e idempotente usada por Auditorías (hallazgo→NC) e Indicadores (medición→NC). A diferencia
de los diferidos de Competencias/Proveedores, aquí **no hace falta cambiar el esquema**.

## Decisión
Se incluye en v1 `generate_nc_from_pqrs(p_case)`: si el caso es de tipo `reclamo` y aún no tiene NC,
toma la fila `for update`, llama a `report_nonconformity(org, 'queja_pqrs', process, left(desc,110), desc,
severidad)` y enlaza `nonconformity_id` (idempotente). Solo Líder SIG o Líder del proceso. El **plazo/SLA**
de la PQRS genera un recordatorio por **tarea+cron** (`atender_pqrs`/entity_type `pqrs`) cuando `due_date`
vence y el caso sigue abierto, asignado al cargo responsable o al líder del proceso.

## Consecuencias
- Cierra el lazo 9.1.2 → 10.2 con un clic, sin ampliar la superficie de la base (reusa lo existente).
- La NC generada hereda el proceso del caso; su ciclo CAPA vive en el Módulo 1 (no se duplica).
- El recordatorio reutiliza el mecanismo del job diario; amplía los `check` de `tasks` (type/entity_type).
