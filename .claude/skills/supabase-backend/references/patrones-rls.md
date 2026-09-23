# Patrones SQL — multi-tenant con RLS

## 1. Base organizacional (migración 001)
```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table memberships (
  user_id uuid not null references profiles on delete cascade,
  organization_id uuid not null references organizations on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

alter table organizations enable row level security;
alter table profiles      enable row level security;
alter table memberships   enable row level security;
```

## 2. Helpers de autorización (security definer)
```sql
create or replace function get_my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from memberships where user_id = auth.uid() limit 1
$$;

create or replace function get_my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from memberships
  where user_id = auth.uid() and organization_id = get_my_org()
$$;
```
Nota: si un usuario puede pertenecer a varias organizaciones, la org activa
se guarda en `profiles.active_org` y `get_my_org()` la lee de ahí, validando
que exista membership.

## 3. Plantilla de políticas para una tabla de negocio
```sql
create table clientes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations,
  nombre text not null,
  nit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on clientes (organization_id);
alter table clientes enable row level security;

create policy "sel_own_org" on clientes for select
  using (organization_id = get_my_org());
create policy "ins_own_org" on clientes for insert
  with check (organization_id = get_my_org());
create policy "upd_own_org" on clientes for update
  using (organization_id = get_my_org())
  with check (organization_id = get_my_org());
create policy "del_admin" on clientes for delete
  using (organization_id = get_my_org() and get_my_role() in ('owner','admin'));
```

## 4. Tablas sensibles: deny-all
Tabla que solo el backend toca (credenciales, webhooks procesados):
RLS activo y CERO políticas = nadie con anon/authenticated entra;
solo `service_role` desde servidor. Documentar la intención en un comentario:
```sql
alter table user_credentials enable row level security;
comment on table user_credentials is 'RLS deny-all intencional: acceso solo via service_role en servidor';
```

## 5. Trigger updated_at
```sql
create or replace function touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger t_touch before update on clientes
  for each row execute function touch_updated_at();
```

## 6. Seed de prueba de aislamiento (supabase/seed.sql)
Dos organizaciones + dos usuarios, uno por org. La prueba: autenticado como A,
`select/insert/update/delete` sobre datos de B debe devolver 0 filas o error.
Automatizarla en la suite (testing-saas) y correrla en cada release.

## 7. Verificación global de RLS (correr antes de cada deploy)
```sql
select c.relname as tabla_sin_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```
Resultado esperado: vacío.
