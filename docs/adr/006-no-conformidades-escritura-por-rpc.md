# ADR-006 — No Conformidades: escritura por RPC y visibilidad espejo de riesgos

## Contexto
El módulo de No Conformidades maneja datos sensibles (incidentes, personas) y una máquina de estados
(abierta→…→cerrada, con reapertura y verificación obligatoria). Debe aislarse por organización y
dejar traza de cada cambio. El proyecto ya resolvió esto para `risks`/`documents`: RLS solo-SELECT +
mutaciones por funciones `SECURITY DEFINER` que validan permiso y auditan. Alternativas: (a) políticas
RLS de INSERT/UPDATE/DELETE por rol; (b) lógica de estados en el cliente/servidor sin SQL.

## Decisión
Reusar el patrón de riesgos. Las tablas `nonconformities`, `nc_actions`, `nc_evidences` tienen **RLS
on con una sola política SELECT** (`can_see_nonconformities(org)`, mismos roles que `can_see_risks`
más el reportante y los responsables de acciones). **Toda escritura pasa por RPCs `SECURITY DEFINER`**
(`report_nonconformity`, `set_nc_cause`, `add_nc_action`, `complete_nc_action`, `verify_nc`,
`cancel_nc`, `add_nc_evidence`) con `search_path=''`, `grant execute to authenticated`, chequeo de
permiso (`is_active_member` para reportar; `can_manage_nc` para gestionar) y `log_event` en cada una.
La máquina de estados vive en SQL, no en el cliente.

## Consecuencias
- No hay forma de evadir la autorización ni la auditoría por REST directo (lección AUD ALTA-05).
- Reportar queda abierto a cualquier miembro; gestionar queda restringido a Líder SIG / Líder de
  proceso. El reportante ve su propia NC aunque no tenga rol SIG.
- Más funciones que mantener, pero consistentes con riesgos/documentos y cubiertas por pruebas RLS.
- La visibilidad amplia (roles del SIG) puede exponer NCs sensibles a `consulta`/`auditor`; se acepta
  por coherencia con riesgos y cultura ISO de transparencia; si hiciera falta, se restringe luego.
