# ADR-015 — Módulo Revisión por la dirección: escritura por RPC y visibilidad del SIG

## Contexto
ISO 9.3 exige un acta de revisión por la dirección con entradas, salidas y firma. El proyecto tiene un
patrón probado y auditado APTO (riesgos, No Conformidades, Auditorías, Indicadores): RLS solo-SELECT por
`organization_id` y escritura exclusiva por funciones `SECURITY DEFINER` con autorización interna.

## Decisión
Las tablas `management_reviews` y `review_outputs` tienen **RLS solo-SELECT** (`can_see_reviews` = roles
del SIG); toda escritura pasa por RPCs `SECURITY DEFINER` (`search_path=''`, `grant authenticated`,
`log_event` en cada mutación): `create_review`/`refresh_review_snapshot`/`update_review`/
`add_review_output`/`generate_nc_from_output`/`cancel_review` (solo `can_manage_reviews` = Líder SIG) y
`close_review` (Líder SIG, con firma). Numeración `RD-AAAA-###` con contador atómico
`management_review_counters` (patrón `nc_counters`). FKs compuestas `(id, organization_id)`.

## Consecuencias
- Mismo modelo de seguridad ya auditado → menor riesgo y auditoría más corta (espejo).
- La visibilidad del acta (que resume todo el SGC) queda limitada a los roles del SIG.
- El acta no se puede escribir por REST directo; todo pasa por las funciones con chequeo de rol.
