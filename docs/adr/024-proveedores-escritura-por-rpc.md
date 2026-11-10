# ADR-024 — Módulo Proveedores: escritura por RPC, visibilidad y numeración

## Contexto
ISO 8.4 exige controlar proveedores externos (selección, evaluación, reevaluación) y conservar evidencia.
Es un dominio nuevo, pero el proyecto tiene un patrón auditado APTO en los módulos 1–5: RLS solo-SELECT
por `organization_id` y escritura por funciones `SECURITY DEFINER` con autorización interna por rol.

## Decisión
`suppliers` y `supplier_evaluations` tienen **RLS solo-SELECT** (`can_see_suppliers` = roles del SIG) y
toda escritura pasa por RPCs `SECURITY DEFINER` (`search_path=''`, `grant authenticated`, `log_event`
entidad `Proveedor`). **Gestión** (alta, editar, evaluar, baja) = `can_manage_suppliers(org, process)` =
Líder SIG o Líder del proceso que usa al proveedor. Numeración `PRV-AAAA-###` con contador atómico
`supplier_counters` (patrón `nc_counters`, RLS deny-all). FKs compuestas `(id, organization_id)`.

## Consecuencias
- Mismo modelo de seguridad ya auditado → auditoría más corta (espejo); prueba de aislamiento con 2 orgs.
- Nada se escribe por REST directo; todo pasa por funciones con chequeo de rol y proceso.
- La semántica de ámbito NULL de `has_role(process)` aplica igual que en los demás módulos (un proveedor sin
  proceso lo puede gestionar cualquier Líder de proceso; mitigación: asignar proceso al proveedor).
