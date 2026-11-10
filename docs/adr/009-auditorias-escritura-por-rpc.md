# ADR-009 — Auditorías internas: escritura por RPC, visibilidad del SIG y numeración atómica

## Contexto
El módulo de Auditorías maneja datos sensibles (hallazgos que citan incidentes y personas), una
máquina de estados (planificada→en_ejecucion→cerrada) y debe aislarse por organización y auditar
cada cambio. El proyecto ya resolvió esto para `risks`, `documents` y `nonconformities`: RLS
solo-SELECT + mutaciones por funciones `SECURITY DEFINER` que validan permiso y auditan. Alternativas:
(a) políticas RLS de escritura por rol; (b) lógica de estados en el servidor sin SQL; (c) secuencia
global para la numeración.

## Decisión
Reusar el patrón ya probado. `audits`/`audit_processes`/`audit_findings` tienen **RLS on con una sola
política SELECT** (`can_see_audits(org)`, mismos roles del SIG que `can_see_nonconformities`). **Toda
escritura pasa por RPCs `SECURITY DEFINER`** (`plan_audit`, `start_audit`, `add_audit_finding`,
`generate_nc_from_finding`, `close_audit`, `cancel_audit`) con `search_path=''`, chequeo de permiso
(`can_manage_audits` = Líder SIG para planificar/cerrar; `auditor` para registrar hallazgos) y
`log_event`. La numeración `AUD-AAAA-###` usa una tabla contador `audit_counters` con upsert atómico
(igual que `nc_counters`). La máquina de estados vive en SQL.

## Consecuencias
- No hay forma de evadir la autorización ni la auditoría por REST directo.
- Consistente con los módulos existentes y cubierto por pruebas RLS.
- Más funciones que mantener, a cambio de un modelo de seguridad uniforme y ya auditado.
