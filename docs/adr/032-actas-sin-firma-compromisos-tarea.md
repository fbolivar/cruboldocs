# ADR-032 — Actas: estado sin firma y compromisos que generan tareas

## Contexto
6.2 y el SIG dejan actas de comités/reuniones de seguimiento con compromisos (responsable + plazo). La
Revisión por la dirección (Módulo 4) ya es un acta **firmada** con el patrón ADR-004. Añadir firma a toda
acta de comité duplicaría ese flujo y su auditoría sin un requisito claro.

## Decisión
`meeting_minutes` tiene estado **borrador→cerrada sin firma** (no reautenticación ni hash); la escritura pasa
por RPCs `SECURITY DEFINER` (`search_path=''`, `grant authenticated`, `log_event` entidad `Acta`), autorizadas
por `can_manage_minutes(org, process)` = Líder SIG o Líder del proceso. Los **compromisos** (`meeting_commitments`)
pueden generar una **tarea** (`cumplir_compromiso`/entity_type `acta`) asignada al cargo responsable, con
recordatorio por el job diario al vencer; marcarlos "cumplido" completa la tarea. Numeración `ACT-AAAA-###`
con contador atómico `meeting_counters`.

## Consecuencias
- Acota el módulo (sin reauth/hash) y mantiene la firma formal donde la norma la pide (Revisión por la dirección).
- Reutiliza tareas+cron para el seguimiento de compromisos sin superficie nueva.
- Si en el futuro un comité exige firma, se añade como opción reutilizando el mecanismo de `close_review`.
