---
name: supabase-backend
description: Patrones de backend de Fernando para SaaS multi-tenant con Supabase — modelo organizacional, RLS obligatorio, helpers de autorización, migraciones versionadas y acceso a datos tipado. Usar en toda tarea que toque base de datos, autenticación, storage o APIs de datos.
---

# Supabase Backend (multi-tenant)

Patrones probados en producción (HexDesk, EventReport). No son sugerencias: son el estándar.

## Principios no negociables
1. **Un solo proyecto Supabase, multi-tenant por organización.** Nunca una BD por cliente.
2. **RLS activo en TODA tabla del esquema public** desde su migración de creación. Una tabla sin RLS no llega a ningún commit.
3. **Todo cambio de esquema es una migración versionada** en `supabase/migrations/` (formato `NNN_descripcion.sql`). Cero SQL manual en producción.
4. **`service_role` jamás sale del servidor.** El cliente solo conoce la `anon` key. Ver references/patrones-rls.md para el patrón deny-all de tablas sensibles.
5. **El frontend nunca arma queries en componentes.** Todo acceso a datos pasa por funciones tipadas en `src/lib/db/` (una por dominio: `clientes.ts`, `ofertas.ts`).

## Proceso para una tabla nueva
1. Definirla en la migración con: `id uuid default gen_random_uuid()`, `organization_id uuid not null references organizations`, `created_at/updated_at timestamptz`.
2. `alter table X enable row level security;` en la MISMA migración.
3. Políticas select/insert/update/delete usando los helpers (`get_my_org()`, `get_my_role()`) — plantillas en references/patrones-rls.md.
4. Índice sobre `organization_id` (toda query lo filtra).
5. Función de acceso tipada en `src/lib/db/` con validación Zod de entrada.
6. Prueba de aislamiento: con 2 usuarios de 2 organizaciones (seed), verificar que A no lee/escribe datos de B. Sin esta prueba la tarea no cierra.

## Base mínima de todo proyecto (primera migración)
`organizations`, `profiles` (espejo de auth.users), `memberships` (user↔org con rol: owner | admin | member). Helpers y triggers en references/patrones-rls.md.

## Auth
- Supabase Auth con verificación de email. Middleware de Next.js protege `/app/**`.
- El rol y la organización activos se resuelven en servidor por membership, NUNCA por parámetro o header del cliente.

## Reglas de dinero y datos fiscales
- Montos: `numeric(14,2)`, nunca float. Guardar base, impuesto y total por separado.
- Datos fiscales del cliente (NIT, régimen) en la tabla de clientes desde el día uno.

## Checklist de salida de la fase backend
- [ ] Todas las tablas nuevas con RLS + políticas + índice por organization_id
- [ ] Migraciones aplican limpio en un proyecto vacío (orden reproducible)
- [ ] Acceso a datos solo vía src/lib/db/ con Zod
- [ ] Prueba de aislamiento con 2 orgs pasando
- [ ] Sin service_role ni secretos en código cliente
