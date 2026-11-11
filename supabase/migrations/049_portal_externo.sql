-- 049 — Portal externo (v1.4-3). Arquitectura: docs/portal/ARQUITECTURA.md, ADR-088/089/090.
-- Reusa el patrón de la encuesta pública: RPC anon por token; Turnstile + rate-limit en la server
-- action antes del RPC. Dos flujos: PQRS pública (buzón por organización) y autoevaluación de proveedor.

-- 049a · Buzón público de PQRS
create table public.public_pqrs_portals (
  organization_id uuid primary key references public.organizations on delete cascade,
  token text not null unique,
  enabled boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_pqrs_portals enable row level security;
create policy public_pqrs_portal_select on public.public_pqrs_portals for select to authenticated using (public.can_manage_pqrs(organization_id, null));

create or replace function public.set_public_pqrs_portal(p_org uuid, p_enabled boolean, p_token text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not public.can_manage_pqrs(p_org, null) then
    raise exception 'No puedes administrar el buzón público' using errcode = '42501';
  end if;
  -- El token real lo genera la server action (crypto); este es solo el respaldo si llega vacío.
  insert into public.public_pqrs_portals (organization_id, token, enabled)
  values (p_org, coalesce(nullif(p_token,''), md5(gen_random_uuid()::text || clock_timestamp()::text) || md5(gen_random_uuid()::text)), coalesce(p_enabled, true))
  on conflict (organization_id) do update set
    token = coalesce(nullif(p_token,''), public.public_pqrs_portals.token),
    enabled = coalesce(p_enabled, public.public_pqrs_portals.enabled), updated_at = now()
  returning public_pqrs_portals.token into v_token;
  perform public.log_event(p_org, 'buzon_pqrs', 'PortalPqrs', p_org, '', jsonb_build_object('enabled', p_enabled));
  return v_token;
end $$;

create or replace function public.get_public_pqrs_portal(p_token text)
returns table (organization text, enabled boolean)
language sql stable security definer set search_path = '' as $$
  select o.name, p.enabled
  from public.public_pqrs_portals p join public.organizations o on o.id = p.organization_id
  where p.token = p_token and p.enabled
$$;

create or replace function public.submit_public_pqrs(
  p_token text, p_type text, p_customer_name text, p_customer_contact text, p_description text
) returns void language plpgsql security definer set search_path = '' as $$
declare pt public.public_pqrs_portals; v_year int; v_seq int; v_code text;
begin
  select * into pt from public.public_pqrs_portals where token = p_token and enabled;
  if pt.organization_id is null then
    raise exception 'Este formulario no está disponible' using errcode = 'P0002';
  end if;
  if p_type <> all (array['peticion','queja','reclamo','sugerencia','felicitacion']) then
    raise exception 'Tipo no válido' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_description,''))) < 3 then
    raise exception 'Cuéntanos tu caso' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.pqrs_counters (organization_id, year, last_seq) values (pt.organization_id, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.pqrs_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'PQRS-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.pqrs_cases (organization_id, code, type, channel, customer_name, customer_contact, description, received_date, due_date, status, created_by)
  values (pt.organization_id, v_code, p_type, 'web', nullif(trim(coalesce(p_customer_name,'')),''), nullif(trim(coalesce(p_customer_contact,'')),''),
    trim(p_description), current_date, current_date + 15, 'recibida', pt.created_by);
  perform public.log_event(pt.organization_id, 'crear_pqrs_publica', 'PQRS', null, v_code, '{}', pt.created_by);
end $$;

revoke execute on function public.set_public_pqrs_portal from public, anon;
grant execute on function public.set_public_pqrs_portal to authenticated;
revoke execute on function public.get_public_pqrs_portal, public.submit_public_pqrs from public;
grant execute on function public.get_public_pqrs_portal, public.submit_public_pqrs to anon, authenticated;

-- 049b · Autoevaluación de proveedor
alter table public.suppliers add column if not exists self_assessment_token text unique;

create table public.supplier_self_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  supplier_id uuid not null,
  score numeric(5,2) not null check (score between 0 and 100),
  comment text check (comment is null or length(comment) <= 2000),
  status text not null default 'recibida' check (status in ('recibida','revisada')),
  ip_hash text,
  submitted_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (supplier_id, organization_id) references public.suppliers (id, organization_id) on delete cascade
);
create index on public.supplier_self_assessments (supplier_id, organization_id);

alter table public.supplier_self_assessments enable row level security;
create policy supplier_self_assessment_select on public.supplier_self_assessments for select to authenticated using (public.can_see_suppliers(organization_id));

create or replace function public.issue_supplier_self_assessment(p_supplier uuid, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.suppliers;
begin
  select * into s from public.suppliers where id = p_supplier;
  if s.id is null or not public.is_active_member(s.organization_id) then
    raise exception 'Proveedor no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_suppliers(s.organization_id, s.process_id) then
    raise exception 'No puedes generar el enlace' using errcode = '42501';
  end if;
  update public.suppliers set self_assessment_token = p_token where id = s.id;
  perform public.log_event(s.organization_id, 'enlace_autoevaluacion', 'Proveedor', s.id, s.code, '{}');
end $$;

create or replace function public.mark_self_assessment_reviewed(p_assessment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.supplier_self_assessments;
begin
  select * into a from public.supplier_self_assessments where id = p_assessment;
  if a.id is null or not public.is_active_member(a.organization_id) then
    raise exception 'Autoevaluación no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_see_suppliers(a.organization_id) then
    raise exception 'Sin acceso' using errcode = '42501';
  end if;
  update public.supplier_self_assessments set status = 'revisada' where id = a.id;
end $$;

create or replace function public.get_supplier_self_assessment(p_token text)
returns table (supplier text, organization text)
language sql stable security definer set search_path = '' as $$
  select s.name, o.name
  from public.suppliers s join public.organizations o on o.id = s.organization_id
  where s.self_assessment_token = p_token and s.is_active
$$;

create or replace function public.submit_supplier_self_assessment(
  p_token text, p_score numeric, p_comment text, p_ip_hash text
) returns void language plpgsql security definer set search_path = '' as $$
declare s public.suppliers;
begin
  select * into s from public.suppliers where self_assessment_token = p_token and is_active;
  if s.id is null then
    raise exception 'Este formulario no está disponible' using errcode = 'P0002';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'Puntaje fuera de rango (0 a 100)' using errcode = '22023';
  end if;
  insert into public.supplier_self_assessments (organization_id, supplier_id, score, comment, ip_hash)
  values (s.organization_id, s.id, round(p_score, 2), nullif(trim(coalesce(p_comment,'')),''), nullif(trim(coalesce(p_ip_hash,'')),''));
end $$;

revoke execute on function public.issue_supplier_self_assessment, public.mark_self_assessment_reviewed from public, anon;
grant execute on function public.issue_supplier_self_assessment, public.mark_self_assessment_reviewed to authenticated;
revoke execute on function public.get_supplier_self_assessment, public.submit_supplier_self_assessment from public;
grant execute on function public.get_supplier_self_assessment, public.submit_supplier_self_assessment to anon, authenticated;
