# ADR-011 — Módulo Indicadores: escritura por RPC y cumplimiento calculado en servidor

## Contexto
ISO 9.1 exige medir indicadores por proceso y evaluar si cumplen. El proyecto ya tiene un patrón
probado y auditado APTO (riesgos, No Conformidades, Auditorías): RLS solo-SELECT por
`organization_id` y escritura exclusiva por funciones `SECURITY DEFINER` con autorización interna. El
estado de cumplimiento (cumple/en riesgo/no cumple) es sensible: si lo enviara el cliente, podría
falsearse.

## Decisión
Las tablas `indicators` e `indicator_measurements` tienen **RLS solo-SELECT** (`can_see_indicators` =
roles del SIG); toda escritura pasa por RPCs `SECURITY DEFINER` (`search_path=''`, `grant authenticated`,
`log_event` en cada mutación): `create_indicator`/`update_indicator`/`archive_indicator`/
`unarchive_indicator` (solo `can_manage_indicators` = Líder SIG) y `record_measurement` (Líder SIG o
Líder del proceso dueño). El campo `compliance` **se calcula y persiste en el RPC** de forma
determinista (según `direction`, `target`/`target_max` y `tolerance_pct`); el cliente nunca lo envía.
Numeración `IND-AAAA-###` con contador atómico `indicator_counters` (patrón `nc_counters`). FKs
compuestas `(id, organization_id)`.

## Consecuencias
- Mismo modelo de seguridad ya auditado → menor riesgo y auditoría de seguridad más corta (espejo).
- El cumplimiento es confiable y reproducible; se cubre con pruebas unitarias de la fórmula y RLS.
- El líder de proceso solo captura mediciones de su propio proceso (chequeo por `process_id`).
