-- 056 — SCAR: Solicitud de acción correctiva a proveedor (v1.5-3).
-- Arquitectura: docs/scar/ARQUITECTURA.md, ADR-109/110/111. Reusa el patrón del portal público
-- (RPC anon por token + Turnstile/rate-limit en la server action). Sin hard delete (anular = estado).

-- 056a · Tabla y contador
create table public.scars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  supplier_id uuid not null,
  nonconformity_id uuid,
  title text not null check (length(trim(title)) between 3 and 200),
  description text not null,
  status text not null default 'enviada' check (status in ('enviada', 'respondida', 'aceptada', 'rechazada', 'anulada')),
  due_date date,
  token text not null unique,
  supplier_root_cause text,
  supplier_actions text,
  supplier_commit_date date,
  responded_at timestamptz,
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  reopened_count int not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (supplier_id, organization_id) references public.suppliers (id, organization_id) on delete cascade,
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id) on delete set null
);
create index on public.scars (supplier_id, organization_id);

create table public.scar_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

alter table public.scars enable row level security;
alter table public.scar_counters enable row level security;
create policy scar_select on public.scars for select to authenticated using (public.can_see_suppliers(organization_id));
-- scar_counters: sin política = deny-all.

-- 056b · RPCs de gestión
create or replace function public.create_scar(p_org uuid, p_supplier uuid, p_nc uuid, p_title text, p_description text, p_due_days int, p_token text)
returns table (code text) language plpgsql security definer set search_path = '' as $$
declare s public.suppliers; v_year int; v_seq int; v_code text;
begin
  select * into s from public.suppliers where id = p_supplier and organization_id = p_org;
  if s.id is null or not public.is_active_member(p_org) then
    raise exception 'Proveedor no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_suppliers(p_org, s.process_id) then
    raise exception 'No puedes emitir un SCAR a este proveedor' using errcode = '42501';
  end if;
  if p_nc is not null and not exists (select 1 from public.nonconformities n where n.id = p_nc and n.organization_id = p_org) then
    raise exception 'No conformidad no encontrada' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(coalesce(p_description, ''))) < 3 then
    raise exception 'Describe el problema' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.scar_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.scar_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'SCAR-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.scars (organization_id, code, supplier_id, nonconformity_id, title, description, due_date, token)
  values (p_org, v_code, p_supplier, p_nc, trim(p_title), trim(p_description),
    current_date + coalesce(nullif(p_due_days, 0), 15), p_token);
  perform public.log_event(p_org, 'crear_scar', 'Scar', null, v_code, '{}');
  return query select v_code;
end $$;

create or replace function public.review_scar(p_scar uuid, p_accept boolean, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare sc public.scars; sup public.suppliers;
begin
  select * into sc from public.scars where id = p_scar;
  if sc.id is null or not public.is_active_member(sc.organization_id) then
    raise exception 'SCAR no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  select * into sup from public.suppliers where id = sc.supplier_id;
  if not public.can_manage_suppliers(sc.organization_id, sup.process_id) then
    raise exception 'No puedes revisar este SCAR' using errcode = '42501';
  end if;
  if sc.status <> 'respondida' then
    raise exception 'El SCAR no está respondido' using errcode = '22023';
  end if;
  if p_accept then
    update public.scars set status = 'aceptada', review_notes = nullif(trim(coalesce(p_notes, '')), ''),
      reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = sc.id;
    perform public.log_event(sc.organization_id, 'aceptar_scar', 'Scar', sc.id, sc.code, '{}');
  else
    update public.scars set status = 'enviada', reopened_count = reopened_count + 1,
      review_notes = nullif(trim(coalesce(p_notes, '')), ''), reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
      where id = sc.id;
    perform public.log_event(sc.organization_id, 'rechazar_scar', 'Scar', sc.id, sc.code, '{}');
  end if;
end $$;

create or replace function public.cancel_scar(p_scar uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare sc public.scars; sup public.suppliers;
begin
  select * into sc from public.scars where id = p_scar;
  if sc.id is null or not public.is_active_member(sc.organization_id) then
    raise exception 'SCAR no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  select * into sup from public.suppliers where id = sc.supplier_id;
  if not public.can_manage_suppliers(sc.organization_id, sup.process_id) then
    raise exception 'No puedes anular este SCAR' using errcode = '42501';
  end if;
  if sc.status not in ('enviada', 'respondida') then
    raise exception 'El SCAR ya está cerrado' using errcode = '22023';
  end if;
  update public.scars set status = 'anulada', review_notes = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now() where id = sc.id;
  perform public.log_event(sc.organization_id, 'anular_scar', 'Scar', sc.id, sc.code, '{}');
end $$;

revoke execute on function public.create_scar(uuid, uuid, uuid, text, text, int, text), public.review_scar(uuid, boolean, text), public.cancel_scar(uuid, text) from public, anon;
grant execute on function public.create_scar(uuid, uuid, uuid, text, text, int, text), public.review_scar(uuid, boolean, text), public.cancel_scar(uuid, text) to authenticated;

-- 056c · RPCs públicas (anon por token)
create or replace function public.get_scar_public(p_token text)
returns table (organization text, supplier text, title text, description text, due_date date)
language sql stable security definer set search_path = '' as $$
  select o.name, s.name, sc.title, sc.description, sc.due_date
  from public.scars sc
  join public.organizations o on o.id = sc.organization_id
  join public.suppliers s on s.id = sc.supplier_id
  where sc.token = p_token and sc.status = 'enviada'
$$;

create or replace function public.submit_scar_response(p_token text, p_root_cause text, p_actions text, p_commit_date date, p_ip_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare sc public.scars;
begin
  select * into sc from public.scars where token = p_token and status = 'enviada';
  if sc.id is null then
    raise exception 'Este formulario no está disponible' using errcode = 'P0002';
  end if;
  if length(trim(coalesce(p_root_cause, ''))) < 3 or length(trim(coalesce(p_actions, ''))) < 3 then
    raise exception 'Completa la causa raíz y las acciones' using errcode = '22023';
  end if;
  update public.scars
    set supplier_root_cause = trim(p_root_cause), supplier_actions = trim(p_actions),
        supplier_commit_date = p_commit_date, responded_at = now(), status = 'respondida', updated_at = now()
    where id = sc.id;
  perform public.log_event(sc.organization_id, 'responder_scar', 'Scar', sc.id, sc.code, '{}');
end $$;

revoke execute on function public.get_scar_public(text), public.submit_scar_response(text, text, text, date, text) from public;
grant execute on function public.get_scar_public(text), public.submit_scar_response(text, text, text, date, text) to anon, authenticated;
