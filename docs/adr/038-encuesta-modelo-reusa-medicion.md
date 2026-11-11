# ADR-038 — Encuesta enviable: modelo propio de campaña/respuestas que reutiliza la medición del Módulo 7

## Contexto
9.1.2 pide medir la satisfacción del cliente. El Módulo 7 ya tiene `satisfaction_measurements` (resultado por periodo+método) y `record_satisfaction` (upsert), pero el dato se captura a mano. Hace falta **recolectar** respuestas reales sin duplicar el resultado ni crear otro lugar donde viva "la satisfacción".

## Decisión
Se añaden dos tablas: **`satisfaction_surveys`** (campaña con `token` público, método, periodo, escala, estado abierta/cerrada) y **`survey_responses`** (respuestas **anónimas**: score normalizado 0–100, comentario opcional, `ip_hash` anti-abuso), más el contador `ENC-AAAA-###`. El **resultado** sigue viviendo en `satisfaction_measurements`: al cerrar la campaña se hace **upsert** allí con el promedio y el nº de respuestas. Así el panel de PQRS y el Tablero leen lo mismo que hoy, sin cambios.

## Consecuencias
- Una sola fuente de verdad para "la satisfacción" (la medición); la encuesta es el **mecanismo de recolección**.
- Respuestas anónimas → sin dato personal nuevo; `ip_hash` con sal no es identificable.
- Si luego se quiere NPS clásico o cuestionarios, se amplía sin mover el resultado.
