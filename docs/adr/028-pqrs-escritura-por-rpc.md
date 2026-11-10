# ADR-028 — Módulo PQRS: escritura por RPC, visibilidad y numeración

## Contexto
ISO 9.1.2/8.2 exigen atender quejas y reclamos del cliente con respuesta y plazo, y conservar evidencia.
El caso contiene **dato personal** del cliente. El proyecto tiene un patrón auditado APTO en los módulos
1–6: RLS solo-SELECT por `organization_id` y escritura por funciones `SECURITY DEFINER` con autorización
interna por rol.

## Decisión
`pqrs_cases` y `satisfaction_measurements` tienen **RLS solo-SELECT** (`can_see_pqrs` = roles del SIG) y
toda escritura pasa por RPCs `SECURITY DEFINER` (`search_path=''`, `grant authenticated`, `log_event`
entidad `PQRS`). **Gestión** (registrar, editar, gestionar, cerrar, anular, registrar satisfacción,
generar NC) = `can_manage_pqrs(org, process)` = Líder SIG o Líder del proceso dueño del caso. Numeración
`PQRS-AAAA-###` con contador atómico `pqrs_counters` (patrón `nc_counters`, RLS deny-all). FKs compuestas
`(id, organization_id)`.

## Consecuencias
- Mismo modelo de seguridad ya auditado → auditoría más corta (espejo); prueba de aislamiento con 2 orgs.
- Nada se escribe por REST directo; todo pasa por funciones con chequeo de rol y proceso.
- La semántica de ámbito NULL de `has_role(process)` aplica igual que en los demás módulos (un caso sin
  proceso lo gestiona cualquier Líder de proceso; mitigación: asignar proceso al caso).
