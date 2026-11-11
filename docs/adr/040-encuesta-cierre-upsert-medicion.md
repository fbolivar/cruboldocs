# ADR-040 — Cierre de campaña → upsert en la medición de satisfacción

## Contexto
Las respuestas recolectadas deben convertirse en el indicador de satisfacción que el SGC ya usa (panel de PQRS, Tablero, entrada a la Revisión por la dirección). Hay que decidir cómo y cuándo se consolida.

## Decisión
El promedio de `survey_responses.score` y el conteo se escriben en **`satisfaction_measurements`** por `(organization_id, period, method)` mediante un RPC `close_survey(p_survey)` (`SECURITY DEFINER`, autorizado por `can_manage_pqrs`), que marca la campaña `cerrada` y hace el **upsert** (reutilizando la lógica de `record_satisfaction`). El panel muestra el **promedio en vivo** mientras la campaña está abierta (lectura agregada de `survey_responses`), pero la **medición oficial** se fija al cerrar. Reabrir no está en el MVP (una campaña cerrada es evidencia).

## Consecuencias
- Un solo resultado de satisfacción por periodo+método, coherente con lo ya construido; el Tablero y el Módulo 7 no cambian.
- El "en vivo" es informativo; el dato que entra a 9.3 es el del cierre (trazable con fecha de cierre).
- Si se cierra sin respuestas, el RPC lo impide (no se escribe una medición vacía).
