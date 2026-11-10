# ADR-007 — Numeración NC-AAAA-### con contador atómico por organización/año

## Contexto
Cada no conformidad necesita un código legible y único por organización (`NC-2026-001`). Dos reportes
simultáneos no pueden recibir el mismo número. Alternativas: (a) `select max(seq)+1` dentro de la
función — simple pero con carrera bajo concurrencia; (b) una secuencia de Postgres — global, no
reinicia por año ni por organización; (c) una tabla contador por `(organización, año)` actualizada de
forma atómica, como ya se hace con `ai_agent_usage`.

## Decisión
Tabla `nc_counters(organization_id, year, last_seq)` con `primary key (organization_id, year)`. La
función `report_nonconformity` hace `insert ... on conflict do update set last_seq = last_seq + 1
returning last_seq` y arma `NC-<año>-<seq con padding>`. Todo dentro de la misma transacción de la
función `SECURITY DEFINER`; `unique(organization_id, code)` como red de seguridad.

## Consecuencias
- Numeración consecutiva, por organización y por año, sin colisiones bajo concurrencia.
- El contador es estado del servidor (solo lo toca la función); no se expone por REST.
- Si se anula una NC, su número no se reutiliza (consecutivo con huecos) — aceptable y esperable en
  un SGC.
