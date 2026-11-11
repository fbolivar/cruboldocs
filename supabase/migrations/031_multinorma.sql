-- 031 — Sistema Integrado de Gestión multi-norma + matriz de peligros SST (GTC-45).
-- Arquitectura: docs/multinorma/ARQUITECTURA.md, ADR-043/044/045. Capa ADITIVA: catálogo de normas por
-- organización + etiquetado polimórfico (entity_norms, sin alterar las tablas existentes). Matriz de
-- peligros como módulo propio con GTC-45 (NP = ND×NE, NR = NP×NC, Nivel I–IV calculado en el servidor).
-- Baja lógica en entity_norms (is_active) y en hazards (status). NOTA: aplicada por fragmentos
-- (el guard del MCP rechaza DROP/'delete'/migraciones grandes); este archivo es el SQL final consolidado.

-- ---------------------------------------------------------------------------
-- Normas y etiquetado
-- ---------------------------------------------------------------------------

create table public.norms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null check (length(trim(code)) between 1 and 40),
  name text not null check (length(trim(name)) between 1 and 160),
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.entity_norms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  norm_id uuid not null,
  entity_type text not null check (entity_type in ('proceso','documento','riesgo','no_conformidad','objetivo','requisito_legal','peligro')),
  entity_id uuid not null,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (norm_id, entity_type, entity_id),
  unique (id, organization_id),
  foreign key (norm_id, organization_id) references public.norms (id, organization_id) on delete cascade
);

create index on public.norms (organization_id, is_active);
create index on public.entity_norms (organization_id, entity_type, entity_id);
create index on public.entity_norms (norm_id, organization_id);

-- ---------------------------------------------------------------------------
-- Matriz de peligros SST (GTC-45)
-- ---------------------------------------------------------------------------

create table public.hazards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  process_id uuid,
  area text,
  hazard text not null check (length(trim(hazard)) between 3 and 1000),
  classification text not null check (classification in ('fisico','quimico','biologico','biomecanico','psicosocial','seguridad','natural')),
  existing_controls text,
  nd int not null check (nd in (0,2,6,10)),
  ne int not null check (ne in (1,2,3,4)),
  nc int not null check (nc in (10,25,60,100)),
  np int not null,
  nr int not null,
  risk_level text not null check (risk_level in ('I','II','III','IV')),
  intervention text,
  responsible_position_id uuid,
  status text not null default 'activo' check (status in ('activo','inactivo')),
  next_review_date date,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.hazard_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.hazards (organization_id, status);
create index on public.hazards (process_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_sig(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_sig(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_sig, public.can_manage_sig from public, anon;
grant execute on function public.can_see_sig, public.can_manage_sig to authenticated;

alter table public.norms enable row level security;
alter table public.entity_norms enable row level security;
alter table public.hazards enable row level security;
alter table public.hazard_counters enable row level security; -- deny-all

create policy norm_select on public.norms for select to authenticated using (public.can_see_sig(organization_id));
create policy entity_norm_select on public.entity_norms for select to authenticated using (public.can_see_sig(organization_id));
create policy hazard_select on public.hazards for select to authenticated using (public.can_see_sig(organization_id));

-- ---------------------------------------------------------------------------
-- Normas: alta/activación y etiquetado
-- ---------------------------------------------------------------------------

/** Crea o reactiva una norma por código (sembrado ISO o norma propia). Líder SIG / Admin. */
create or replace function public.upsert_norm(p_org uuid, p_code text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not (public.has_role(p_org, 'lider_sig') or public.can_manage_org(p_org)) then
    raise exception 'No puedes administrar normas' using errcode = '42501';
  end if;
  insert into public.norms (organization_id, code, name, is_active, created_by)
  values (p_org, trim(p_code), trim(p_name), true, auth.uid())
  on conflict (organization_id, code) do update set name = excluded.name, is_active = true
  returning id into v_id;
  perform public.log_event(p_org, 'upsert_norma', 'Norma', v_id, trim(p_code), '{}');
  return v_id;
end $$;

create or replace function public.set_norm_active(p_norm uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare nm public.norms;
begin
  select * into nm from public.norms where id = p_norm;
  if nm.id is null or not public.is_active_member(nm.organization_id) then
    raise exception 'Norma no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not (public.has_role(nm.organization_id, 'lider_sig') or public.can_manage_org(nm.organization_id)) then
    raise exception 'No puedes administrar normas' using errcode = '42501';
  end if;
  update public.norms set is_active = p_active where id = nm.id;
  perform public.log_event(nm.organization_id, 'estado_norma', 'Norma', nm.id, nm.code, jsonb_build_object('activa', p_active));
end $$;

/** Re-sincroniza las normas de una entidad (etiquetado). Baja lógica (is_active), sin DELETE. */
create or replace function public.set_entity_norms(p_org uuid, p_entity_type text, p_entity_id uuid, p_norm_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_sig(p_org, null) then
    raise exception 'No puedes etiquetar por norma' using errcode = '42501';
  end if;
  if p_entity_type not in ('proceso','documento','riesgo','no_conformidad','objetivo','requisito_legal','peligro') then
    raise exception 'Tipo de entidad no válido' using errcode = '22023';
  end if;
  update public.entity_norms set is_active = false
  where organization_id = p_org and entity_type = p_entity_type and entity_id = p_entity_id and is_active
    and norm_id <> all (coalesce(p_norm_ids, array[]::uuid[]));
  insert into public.entity_norms (organization_id, norm_id, entity_type, entity_id, is_active, created_by)
  select p_org, n.id, p_entity_type, p_entity_id, true, auth.uid()
  from public.norms n
  where n.organization_id = p_org and n.id = any (coalesce(p_norm_ids, array[]::uuid[]))
  on conflict (norm_id, entity_type, entity_id) do update set is_active = true;
  perform public.log_event(p_org, 'etiquetar_norma', 'Norma', p_entity_id, p_entity_type, '{}');
end $$;

-- ---------------------------------------------------------------------------
-- Peligros SST (GTC-45)
-- ---------------------------------------------------------------------------

/** Nivel de riesgo GTC-45 a partir de NR. */
create or replace function public.gtc45_level(p_nr int) returns text
language sql immutable set search_path = '' as $$
  select case when p_nr >= 600 then 'I' when p_nr >= 150 then 'II' when p_nr >= 40 then 'III' else 'IV' end
$$;

create or replace function public.create_hazard(
  p_org uuid, p_process uuid, p_area text, p_hazard text, p_classification text,
  p_controls text, p_nd int, p_ne int, p_nc int, p_intervention text, p_responsible uuid, p_next_review date
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int; v_np int; v_nr int;
begin
  if not public.can_manage_sig(p_org, p_process) then
    raise exception 'No puedes registrar peligros' using errcode = '42501';
  end if;
  if p_nd not in (0,2,6,10) or p_ne not in (1,2,3,4) or p_nc not in (10,25,60,100) then
    raise exception 'Valoración GTC-45 no válida' using errcode = '22023';
  end if;
  v_np := p_nd * p_ne; v_nr := v_np * p_nc;
  v_year := extract(year from current_date)::int;
  insert into public.hazard_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.hazard_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'PEL-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.hazards (organization_id, code, process_id, area, hazard, classification, existing_controls,
    nd, ne, nc, np, nr, risk_level, intervention, responsible_position_id, next_review_date, created_by)
  values (p_org, v_code, p_process, nullif(trim(coalesce(p_area, '')), ''), trim(p_hazard), p_classification,
    nullif(trim(coalesce(p_controls, '')), ''), p_nd, p_ne, p_nc, v_np, v_nr, public.gtc45_level(v_nr),
    nullif(trim(coalesce(p_intervention, '')), ''), p_responsible, p_next_review, auth.uid())
  returning hazards.id into v_id;

  perform public.log_event(p_org, 'crear_peligro', 'Peligro', v_id, v_code, jsonb_build_object('nivel', public.gtc45_level(v_nr)));
  return query select v_id, v_code;
end $$;

create or replace function public.hazard_or_fail(p_hazard uuid) returns public.hazards
language plpgsql stable security definer set search_path = '' as $$
declare h public.hazards;
begin
  select * into h from public.hazards where id = p_hazard;
  if h.id is null or not public.is_active_member(h.organization_id) then
    raise exception 'Peligro no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return h;
end $$;

create or replace function public.update_hazard(
  p_hazard uuid, p_process uuid, p_area text, p_hazard_text text, p_classification text,
  p_controls text, p_nd int, p_ne int, p_nc int, p_intervention text, p_responsible uuid, p_next_review date
) returns void language plpgsql security definer set search_path = '' as $$
declare h public.hazards; v_np int; v_nr int;
begin
  h := public.hazard_or_fail(p_hazard);
  if not public.can_manage_sig(h.organization_id, h.process_id) then
    raise exception 'No puedes editar este peligro' using errcode = '42501';
  end if;
  if h.status = 'inactivo' then
    raise exception 'El peligro inactivo ya no es editable' using errcode = '22023';
  end if;
  if p_nd not in (0,2,6,10) or p_ne not in (1,2,3,4) or p_nc not in (10,25,60,100) then
    raise exception 'Valoración GTC-45 no válida' using errcode = '22023';
  end if;
  v_np := p_nd * p_ne; v_nr := v_np * p_nc;
  update public.hazards set
    process_id = p_process, area = nullif(trim(coalesce(p_area, '')), ''), hazard = trim(p_hazard_text),
    classification = p_classification, existing_controls = nullif(trim(coalesce(p_controls, '')), ''),
    nd = p_nd, ne = p_ne, nc = p_nc, np = v_np, nr = v_nr, risk_level = public.gtc45_level(v_nr),
    intervention = nullif(trim(coalesce(p_intervention, '')), ''), responsible_position_id = p_responsible,
    next_review_date = p_next_review, updated_at = now()
  where id = h.id;
  perform public.log_event(h.organization_id, 'editar_peligro', 'Peligro', h.id, h.code, jsonb_build_object('nivel', public.gtc45_level(v_nr)));
end $$;

create or replace function public.set_hazard_active(p_hazard uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.hazards;
begin
  h := public.hazard_or_fail(p_hazard);
  if not public.can_manage_sig(h.organization_id, h.process_id) then
    raise exception 'No puedes cambiar el estado de este peligro' using errcode = '42501';
  end if;
  update public.hazards set status = case when p_active then 'activo' else 'inactivo' end, updated_at = now() where id = h.id;
  perform public.log_event(h.organization_id, 'estado_peligro', 'Peligro', h.id, h.code, jsonb_build_object('activo', p_active));
end $$;

revoke execute on function public.hazard_or_fail, public.gtc45_level from public, anon, authenticated;
revoke execute on function public.upsert_norm, public.set_norm_active, public.set_entity_norms,
  public.create_hazard, public.update_hazard, public.set_hazard_active from public, anon;
grant execute on function public.upsert_norm, public.set_norm_active, public.set_entity_norms,
  public.create_hazard, public.update_hazard, public.set_hazard_active to authenticated;
grant execute on function public.gtc45_level to authenticated;
