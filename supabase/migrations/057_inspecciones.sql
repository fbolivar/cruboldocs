-- 057 — Inspecciones / Control de calidad (v1.6-1). Arquitectura: docs/inspecciones/ARQUITECTURA.md,
-- ADR-115/116/117. Planes reutilizables (características JSONB) → inspección copia resultados
-- estructurados (base para SPC). Rechazo genera NC ('producto_servicio') o salida no conforme.

-- 057a · Tablas, RLS y helpers
create table public.inspection_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  description text,
  process_id uuid,
  characteristics jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id) on delete set null
);
create index on public.inspection_plans (organization_id);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  plan_id uuid not null,
  type text not null check (type in ('recepcion', 'proceso', 'final')),
  supplier_id uuid,
  process_id uuid,
  lot_ref text,
  lot_size int,
  sample_size int,
  defects int not null default 0,
  acceptance_number int,
  disposition text not null default 'pendiente' check (disposition in ('pendiente', 'aceptado', 'rechazado', 'concesion')),
  note text,
  nonconformity_id uuid,
  nc_output_id uuid,
  inspected_at date not null default current_date,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (plan_id, organization_id) references public.inspection_plans (id, organization_id),
  foreign key (supplier_id, organization_id) references public.suppliers (id, organization_id) on delete set null,
  foreign key (process_id, organization_id) references public.processes (id, organization_id) on delete set null,
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id) on delete set null,
  foreign key (nc_output_id, organization_id) references public.nonconforming_outputs (id, organization_id) on delete set null
);
create index on public.inspections (organization_id);

create table public.inspection_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  inspection_id uuid not null,
  name text not null,
  type text not null check (type in ('numerico', 'pasa_falla')),
  unit text,
  min_val numeric,
  max_val numeric,
  value numeric,
  passed boolean,
  ok boolean not null default false,
  foreign key (inspection_id, organization_id) references public.inspections (id, organization_id) on delete cascade
);
create index on public.inspection_results (inspection_id, organization_id);

create table public.ins_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

alter table public.inspection_plans enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_results enable row level security;
alter table public.ins_counters enable row level security;

create or replace function public.can_see_inspections(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;
create or replace function public.can_manage_inspections(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;
revoke execute on function public.can_see_inspections(uuid), public.can_manage_inspections(uuid, uuid) from public, anon;
grant execute on function public.can_see_inspections(uuid), public.can_manage_inspections(uuid, uuid) to authenticated;

create policy inspection_plan_select on public.inspection_plans for select to authenticated using (public.can_see_inspections(organization_id));
create policy inspection_select on public.inspections for select to authenticated using (public.can_see_inspections(organization_id));
create policy inspection_result_select on public.inspection_results for select to authenticated using (public.can_see_inspections(organization_id));
-- ins_counters: sin política = deny-all.

-- 057b · RPCs de planes
create or replace function public.create_inspection_plan(p_org uuid, p_name text, p_description text, p_process uuid, p_characteristics jsonb)
returns table (id uuid) language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.can_manage_inspections(p_org, p_process) then
    raise exception 'No puedes gestionar planes de inspección' using errcode = '42501';
  end if;
  insert into public.inspection_plans (organization_id, name, description, process_id, characteristics)
  values (p_org, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_process,
    case when jsonb_typeof(p_characteristics) = 'array' then p_characteristics else '[]'::jsonb end)
  returning inspection_plans.id into v_id;
  perform public.log_event(p_org, 'crear_plan_inspeccion', 'PlanInspeccion', v_id, trim(p_name));
  return query select v_id;
end $$;

create or replace function public.update_inspection_plan(p_plan uuid, p_name text, p_description text, p_active boolean, p_characteristics jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare pl public.inspection_plans;
begin
  select * into pl from public.inspection_plans where id = p_plan;
  if pl.id is null or not public.can_manage_inspections(pl.organization_id, pl.process_id) then
    raise exception 'Plan no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  update public.inspection_plans
    set name = trim(p_name), description = nullif(trim(coalesce(p_description, '')), ''),
        is_active = coalesce(p_active, is_active),
        characteristics = case when jsonb_typeof(p_characteristics) = 'array' then p_characteristics else characteristics end,
        updated_at = now()
    where id = p_plan;
  perform public.log_event(pl.organization_id, 'editar_plan_inspeccion', 'PlanInspeccion', p_plan, trim(p_name));
end $$;

revoke execute on function public.create_inspection_plan(uuid, text, text, uuid, jsonb), public.update_inspection_plan(uuid, text, text, boolean, jsonb) from public, anon;
grant execute on function public.create_inspection_plan(uuid, text, text, uuid, jsonb), public.update_inspection_plan(uuid, text, text, boolean, jsonb) to authenticated;

-- 057c · RPCs de inspección
create or replace function public.create_inspection(
  p_org uuid, p_plan uuid, p_type text, p_supplier uuid, p_process uuid, p_lot_ref text,
  p_lot_size int, p_sample_size int, p_acceptance int, p_defects int, p_disposition text, p_results jsonb
) returns table (code text) language plpgsql security definer set search_path = '' as $$
declare pl public.inspection_plans; v_year int; v_seq int; v_code text; v_ins uuid; rec record;
  v_name text; v_type text; v_unit text; v_min numeric; v_max numeric; v_res jsonb; v_val numeric; v_pass boolean; v_ok boolean;
begin
  if not public.can_manage_inspections(p_org, p_process) then
    raise exception 'No puedes registrar inspecciones' using errcode = '42501';
  end if;
  select * into pl from public.inspection_plans where id = p_plan and organization_id = p_org and is_active;
  if pl.id is null then
    raise exception 'Plan no disponible' using errcode = 'P0002';
  end if;
  if p_type <> all (array['recepcion', 'proceso', 'final']) then
    raise exception 'Tipo no válido' using errcode = '22023';
  end if;
  if p_disposition <> all (array['pendiente', 'aceptado', 'rechazado', 'concesion']) then
    raise exception 'Disposición no válida' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.ins_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.ins_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'INS-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.inspections (organization_id, code, plan_id, type, supplier_id, process_id, lot_ref, lot_size, sample_size, defects, acceptance_number, disposition, note)
  values (p_org, v_code, p_plan, p_type, p_supplier, p_process, nullif(trim(coalesce(p_lot_ref, '')), ''),
    p_lot_size, p_sample_size, greatest(coalesce(p_defects, 0), 0), p_acceptance, p_disposition, null)
  returning id into v_ins;

  for rec in select value as ch from jsonb_array_elements(pl.characteristics) loop
    v_name := rec.ch->>'name'; v_type := coalesce(rec.ch->>'type', 'pasa_falla'); v_unit := rec.ch->>'unit';
    v_min := nullif(rec.ch->>'min', '')::numeric; v_max := nullif(rec.ch->>'max', '')::numeric;
    select value into v_res from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) where value->>'name' = v_name limit 1;
    if v_type = 'numerico' then
      v_val := nullif(v_res->>'value', '')::numeric; v_pass := null;
      v_ok := v_val is not null and (v_min is null or v_val >= v_min) and (v_max is null or v_val <= v_max);
    else
      v_val := null; v_pass := (v_res->>'passed')::boolean; v_ok := coalesce(v_pass, false);
    end if;
    insert into public.inspection_results (organization_id, inspection_id, name, type, unit, min_val, max_val, value, passed, ok)
    values (p_org, v_ins, v_name, v_type, v_unit, v_min, v_max, v_val, v_pass, v_ok);
  end loop;

  perform public.log_event(p_org, 'crear_inspeccion', 'Inspeccion', v_ins, v_code);
  return query select v_code;
end $$;

create or replace function public.generate_nc_from_inspection(p_inspection uuid)
returns table (code text) language plpgsql security definer set search_path = '' as $$
declare i public.inspections; v_nc uuid; v_code text;
begin
  select * into i from public.inspections where id = p_inspection for update;
  if i.id is null or not public.can_manage_inspections(i.organization_id, i.process_id) then
    raise exception 'Inspección no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if i.disposition <> 'rechazado' then
    raise exception 'Solo una inspección rechazada genera NC' using errcode = '22023';
  end if;
  if i.nonconformity_id is not null then
    raise exception 'Esta inspección ya tiene una no conformidad' using errcode = '22023';
  end if;
  select id into v_nc from public.report_nonconformity(i.organization_id, 'producto_servicio', i.process_id,
    left('Inspección ' || i.code || ' rechazada', 110),
    coalesce(nullif(trim(coalesce(i.note, '')), ''), 'Producto/servicio no conforme detectado en la inspección ' || i.code),
    'mayor', i.inspected_at, null);
  update public.inspections set nonconformity_id = v_nc where id = i.id;
  select n.code into v_code from public.nonconformities n where n.id = v_nc;
  perform public.log_event(i.organization_id, 'generar_nc_inspeccion', 'Inspeccion', i.id, i.code);
  return query select v_code;
end $$;

create or replace function public.generate_nc_output_from_inspection(p_inspection uuid)
returns table (code text) language plpgsql security definer set search_path = '' as $$
declare i public.inspections; v_out uuid; v_code text;
begin
  select * into i from public.inspections where id = p_inspection for update;
  if i.id is null or not public.can_manage_inspections(i.organization_id, i.process_id) then
    raise exception 'Inspección no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if i.disposition <> 'rechazado' then
    raise exception 'Solo una inspección rechazada genera una salida no conforme' using errcode = '22023';
  end if;
  if i.nc_output_id is not null then
    raise exception 'Esta inspección ya tiene una salida no conforme' using errcode = '22023';
  end if;
  select id into v_out from public.create_nc_output(i.organization_id,
    coalesce(nullif(trim(coalesce(i.note, '')), ''), 'Salida no conforme detectada en la inspección ' || i.code),
    i.process_id, i.inspected_at, left(coalesce(i.lot_ref, i.code), 60));
  update public.inspections set nc_output_id = v_out where id = i.id;
  select o.code into v_code from public.nonconforming_outputs o where o.id = v_out;
  perform public.log_event(i.organization_id, 'generar_salida_inspeccion', 'Inspeccion', i.id, i.code);
  return query select v_code;
end $$;

revoke execute on function public.create_inspection(uuid, uuid, text, uuid, uuid, text, int, int, int, int, text, jsonb), public.generate_nc_from_inspection(uuid), public.generate_nc_output_from_inspection(uuid) from public, anon;
grant execute on function public.create_inspection(uuid, uuid, text, uuid, uuid, text, int, int, int, int, text, jsonb), public.generate_nc_from_inspection(uuid), public.generate_nc_output_from_inspection(uuid) to authenticated;
