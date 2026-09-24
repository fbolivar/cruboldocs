-- 001 · Base organizacional: organizaciones, perfiles, procesos, cargos y roles,
-- membresías con vigencia, invitaciones y recertificación. Helpers de autorización.
-- Convención: toda tabla de negocio lleva organization_id y RLS desde su creación.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),
  nit text not null unique check (nit ~ '^\d{9}-\d$'),
  status text not null default 'activa' check (status in ('activa', 'suspendida')),
  recert_period_days int not null default 180 check (recert_period_days between 30 and 730),
  -- Umbrales de nivel de riesgo (P×I): moderado desde, alto desde, extremo desde.
  risk_scale jsonb not null default '{"moderadoFrom":5,"altoFrom":10,"extremoFrom":20}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Tenant. Solo la crea el Superadmin (platform_admins).';

create table public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is 'Superadministradores de Crubol. RLS deny-all intencional: se lee solo vía is_platform_admin().';

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '' check (length(full_name) <= 200),
  email text not null,
  active_org uuid references public.organizations on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Espejo de auth.users (dato personal, Ley 1581). active_org = organización activa del usuario.';

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{2,6}$'),
  name text not null check (length(trim(name)) between 2 and 120),
  type text not null check (type in ('estrategico', 'misional', 'apoyo', 'evaluacion')),
  leader_position_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  process_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

alter table public.processes
  add foreign key (leader_position_id, organization_id) references public.positions (id, organization_id);

create table public.position_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  position_id uuid not null,
  role text not null check (role in (
    'lider_sig', 'lider_proceso', 'elaborador', 'revisor', 'aprobador',
    'responsable_control', 'auditor', 'consulta'
  )),
  -- null = alcance en todos los procesos.
  process_id uuid,
  created_at timestamptz not null default now(),
  foreign key (position_id, organization_id) references public.positions (id, organization_id) on delete cascade,
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create unique index position_roles_unique on public.position_roles
  (position_id, role, coalesce(process_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  position_id uuid,
  is_org_admin boolean not null default false,
  is_external boolean not null default false,
  valid_from date not null default current_date,
  valid_until date,
  status text not null default 'activo' check (status in ('activo', 'revocado')),
  last_recertified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  foreign key (position_id, organization_id) references public.positions (id, organization_id),
  -- Externo: vigencia obligatoria (ADR-001).
  check (not is_external or valid_until is not null),
  check (valid_until is null or valid_until >= valid_from)
);

comment on table public.memberships is 'Dato sensible. Fuera de la vigencia = sin acceso (lo aplica is_active_member).';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  position_id uuid not null,
  is_org_admin boolean not null default false,
  is_external boolean not null default false,
  valid_until date,
  -- SHA-256 del token; el token en claro solo viaja en el correo.
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  invited_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  foreign key (position_id, organization_id) references public.positions (id, organization_id),
  check (not is_external or valid_until is not null)
);

create table public.access_recertifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  membership_id uuid not null references public.memberships on delete cascade,
  reviewed_by uuid not null references public.profiles,
  decision text not null check (decision in ('mantener', 'revocar')),
  at timestamptz not null default now()
);

-- Índices por organización (toda consulta filtra por ella).
create index on public.processes (organization_id);
create index on public.positions (organization_id);
create index on public.position_roles (organization_id);
create index on public.position_roles (position_id);
create index on public.memberships (organization_id);
create index on public.memberships (user_id);
create index on public.invitations (organization_id);
create index on public.access_recertifications (organization_id);

create trigger t_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger t_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_touch before update on public.processes for each row execute function public.touch_updated_at();
create trigger t_touch before update on public.positions for each row execute function public.touch_updated_at();
create trigger t_touch before update on public.memberships for each row execute function public.touch_updated_at();

-- Perfil automático al crear el usuario de Auth.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers de autorización (security definer, sin search_path mutable)
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

/** Membresía activa y dentro de la vigencia en la organización. */
create or replace function public.is_active_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.status = 'activo'
      and o.status = 'activa'
      and current_date >= m.valid_from
      and (m.valid_until is null or current_date <= m.valid_until)
  )
$$;

/** Organización activa del usuario: profiles.active_org validada con membresía vigente. */
create or replace function public.current_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.active_org from public.profiles p
  where p.id = auth.uid() and public.is_active_member(p.active_org)
$$;

create or replace function public.my_position(org uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.position_id from public.memberships m
  where m.organization_id = org and m.user_id = auth.uid() and public.is_active_member(org)
$$;

create or replace function public.is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin() or exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.is_org_admin and public.is_active_member(org)
  )
$$;

/** Rol del cargo del usuario; con proceso, exige alcance global o en ese proceso. */
create or replace function public.has_role(org uuid, r text, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.position_roles pr
    where pr.organization_id = org
      and pr.position_id = public.my_position(org)
      and pr.role = r
      and (pr.process_id is null or process is null or pr.process_id = process)
  )
$$;

/** Tiene algún rol funcional (no es "admin solo metadatos"): puede ver contenido. */
create or replace function public.can_view_content(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.position_roles pr
    where pr.organization_id = org and pr.position_id = public.my_position(org)
  )
$$;

/** Administración: Admin de la org o Líder SIG. */
create or replace function public.can_manage_org(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_org_admin(org) or public.has_role(org, 'lider_sig')
$$;

/** Comparte una organización vigente con el usuario (para leer nombres de colegas). */
create or replace function public.shares_org_with(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = other and public.is_active_member(m.organization_id)
  )
$$;

revoke execute on function public.is_platform_admin, public.is_active_member, public.current_org,
  public.my_position, public.is_org_admin, public.has_role, public.can_view_content,
  public.can_manage_org, public.shares_org_with from public, anon;
grant execute on function public.is_platform_admin, public.is_active_member, public.current_org,
  public.my_position, public.is_org_admin, public.has_role, public.can_view_content,
  public.can_manage_org, public.shares_org_with to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.platform_admins enable row level security;
alter table public.profiles enable row level security;
alter table public.processes enable row level security;
alter table public.positions enable row level security;
alter table public.position_roles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.access_recertifications enable row level security;

-- organizations: miembros vigentes la leen; solo el Superadmin la crea o cambia.
create policy org_select on public.organizations for select to authenticated
  using (public.is_active_member(id) or public.is_platform_admin());
create policy org_insert on public.organizations for insert to authenticated
  with check (public.is_platform_admin());
create policy org_update on public.organizations for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- platform_admins: sin políticas (deny-all).

-- profiles: el propio y los de colegas de una organización vigente.
create policy profile_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_org_with(id) or public.is_platform_admin());
create policy profile_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Del propio perfil solo se edita el nombre (email y org activa los maneja el servidor).
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- Catálogos: los leen los miembros vigentes; los administra Admin o Líder SIG.
create policy process_select on public.processes for select to authenticated
  using (public.is_active_member(organization_id) or public.is_platform_admin());
create policy process_write on public.processes for all to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy position_select on public.positions for select to authenticated
  using (public.is_active_member(organization_id) or public.is_platform_admin());
create policy position_write on public.positions for all to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

create policy position_role_select on public.position_roles for select to authenticated
  using (public.is_active_member(organization_id) or public.is_platform_admin());
create policy position_role_write on public.position_roles for all to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

-- memberships (sensible): la propia; todas para Admin, Líder SIG y Auditor. Escribe Admin/Líder SIG.
create policy membership_select on public.memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_org(organization_id)
    or public.has_role(organization_id, 'auditor')
  );
create policy membership_insert on public.memberships for insert to authenticated
  with check (public.can_manage_org(organization_id));
create policy membership_update on public.memberships for update to authenticated
  using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

-- invitations: solo Admin/Líder SIG. La aceptación va por servidor (service_role) validando token_hash.
create policy invitation_select on public.invitations for select to authenticated
  using (public.can_manage_org(organization_id));
create policy invitation_insert on public.invitations for insert to authenticated
  with check (public.can_manage_org(organization_id) and invited_by = auth.uid());

-- recertificación: leen Admin, Líder SIG y Auditor; registran Admin y Líder SIG (solo inserción).
create policy recert_select on public.access_recertifications for select to authenticated
  using (public.can_manage_org(organization_id) or public.has_role(organization_id, 'auditor'));
create policy recert_insert on public.access_recertifications for insert to authenticated
  with check (public.can_manage_org(organization_id) and reviewed_by = auth.uid());

-- Cambiar de organización activa: solo a una con membresía vigente.
create or replace function public.set_active_org(org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_member(org) and not public.is_platform_admin() then
    raise exception 'No perteneces a esta organización' using errcode = '42501';
  end if;
  update public.profiles set active_org = org where id = auth.uid();
end $$;

revoke execute on function public.set_active_org from public, anon;
grant execute on function public.set_active_org to authenticated;
