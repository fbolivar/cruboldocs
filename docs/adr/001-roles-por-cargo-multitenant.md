# ADR-001 — Multi-tenant por organización y roles asignados a cargos

**Contexto.** Hay 10 roles y el cliente pidió asignarlos a cargos, con vigencia de usuarios, acceso externo temporal y recertificación. La alternativa era un rol directo por usuario en `memberships`.

**Decisión.** `organizations` → `positions` (cargos) → `position_roles` (rol + alcance opcional por proceso). `memberships` une usuario, organización y cargo, con `valid_from/valid_until`, `is_external` e `is_org_admin`. Superadmin en `platform_admins`, fuera del tenant. El RLS usa helpers `security definer` que exigen una membresía vigente.

**Consecuencias.** Las tareas y responsables sobreviven a la rotación de personal (se cambia la persona en el cargo, no el flujo). El RLS es más complejo y requiere pruebas por rol. Un usuario tiene un cargo por organización en v1.
