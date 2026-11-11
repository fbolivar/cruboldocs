-- 037 — Metrología / Recursos de seguimiento y medición (ISO 9001 7.1.5). Arquitectura:
-- docs/metrologia-cambios/ARQUITECTURA.md, ADR-056. Equipos de medición con historial de
-- calibraciones y PRÓXIMA FECHA derivada en el servidor (fecha + frecuencia); certificados como
-- referencia de texto (adjuntos diferidos). RLS solo-SELECT + escritura por RPC. Aplicada por
-- fragmentos; este archivo es el SQL final consolidado.

create table public.measurement_equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  name text not null check (length(trim(name)) between 2 and 200),
  type text,
  process_id uuid,
  location text,
  measurement_range text,
  unit text,
  calibration_frequency text not null check (calibration_frequency in ('mensual','bimestral','trimestral','semestral','anual','bienal')),
  last_calibration_date date,
  next_due_date date,
  responsible_position_id uuid,
  status text not null default 'vigente' check (status in ('vigente','fuera_de_servicio')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.calibration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  equipment_id uuid not null,
  date date not null,
  kind text not null default 'calibracion' check (kind in ('calibracion','verificacion')),
  result text not null check (result in ('conforme','no_conforme','ajustado')),
  standard_used text,
  certificate_ref text,
  provider text,
  next_due_date date,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (equipment_id, organization_id) references public.measurement_equipment (id, organization_id) on delete cascade
);

create table public.metrology_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.measurement_equipment (organization_id, status);
create index on public.measurement_equipment (process_id, organization_id);
create index on public.calibration_events (equipment_id, organization_id);

create or replace function public.can_see_metrology(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_metrology(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_metrology, public.can_manage_metrology from public, anon;
grant execute on function public.can_see_metrology, public.can_manage_metrology to authenticated;

alter table public.measurement_equipment enable row level security;
alter table public.calibration_events enable row level security;
alter table public.metrology_counters enable row level security; -- deny-all

create policy equipment_select on public.measurement_equipment for select to authenticated using (public.can_see_metrology(organization_id));
create policy calibration_select on public.calibration_events for select to authenticated using (public.can_see_metrology(organization_id));

-- Próxima fecha de calibración por frecuencia.
create or replace function public.metrology_next_due(p_date date, p_freq text) returns date
language sql immutable set search_path = '' as $$
  select p_date + case p_freq
    when 'mensual' then interval '1 month'
    when 'bimestral' then interval '2 months'
    when 'trimestral' then interval '3 months'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '1 year'
    when 'bienal' then interval '2 years'
  end
$$;

create or replace function public.create_equipment(
  p_org uuid, p_name text, p_type text, p_process uuid, p_location text,
  p_range text, p_unit text, p_frequency text, p_responsible uuid
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_metrology(p_org, p_process) then
    raise exception 'No puedes registrar equipos' using errcode = '42501';
  end if;
  if p_frequency not in ('mensual','bimestral','trimestral','semestral','anual','bienal') then
    raise exception 'Frecuencia no válida' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.metrology_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.metrology_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'MET-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.measurement_equipment (organization_id, code, name, type, process_id, location, measurement_range, unit, calibration_frequency, responsible_position_id, status, created_by)
  values (p_org, v_code, trim(p_name), nullif(trim(coalesce(p_type,'')),''), p_process, nullif(trim(coalesce(p_location,'')),''),
    nullif(trim(coalesce(p_range,'')),''), nullif(trim(coalesce(p_unit,'')),''), p_frequency, p_responsible, 'vigente', auth.uid())
  returning measurement_equipment.id into v_id;
  perform public.log_event(p_org, 'crear_equipo', 'Metrologia', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.equipment_or_fail(p_equipment uuid) returns public.measurement_equipment
language plpgsql stable security definer set search_path = '' as $$
declare e public.measurement_equipment;
begin
  select * into e from public.measurement_equipment where id = p_equipment;
  if e.id is null or not public.is_active_member(e.organization_id) then
    raise exception 'Equipo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return e;
end $$;

create or replace function public.update_equipment(
  p_equipment uuid, p_name text, p_type text, p_process uuid, p_location text,
  p_range text, p_unit text, p_frequency text, p_responsible uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare e public.measurement_equipment;
begin
  e := public.equipment_or_fail(p_equipment);
  if not public.can_manage_metrology(e.organization_id, e.process_id) then
    raise exception 'No puedes editar este equipo' using errcode = '42501';
  end if;
  if p_frequency not in ('mensual','bimestral','trimestral','semestral','anual','bienal') then
    raise exception 'Frecuencia no válida' using errcode = '22023';
  end if;
  update public.measurement_equipment set
    name = trim(p_name), type = nullif(trim(coalesce(p_type,'')),''), process_id = p_process,
    location = nullif(trim(coalesce(p_location,'')),''), measurement_range = nullif(trim(coalesce(p_range,'')),''),
    unit = nullif(trim(coalesce(p_unit,'')),''), calibration_frequency = p_frequency, responsible_position_id = p_responsible,
    updated_at = now()
  where id = e.id;
  perform public.log_event(e.organization_id, 'editar_equipo', 'Metrologia', e.id, e.code, '{}');
end $$;

create or replace function public.set_equipment_service(p_equipment uuid, p_in_service boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.measurement_equipment;
begin
  e := public.equipment_or_fail(p_equipment);
  if not public.can_manage_metrology(e.organization_id, e.process_id) then
    raise exception 'No puedes cambiar el estado del equipo' using errcode = '42501';
  end if;
  update public.measurement_equipment set status = case when p_in_service then 'vigente' else 'fuera_de_servicio' end, updated_at = now()
  where id = e.id;
  perform public.log_event(e.organization_id, 'estado_equipo', 'Metrologia', e.id, e.code, jsonb_build_object('en_servicio', p_in_service));
end $$;

create or replace function public.register_calibration(
  p_equipment uuid, p_date date, p_kind text, p_result text, p_standard text,
  p_certificate text, p_provider text, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.measurement_equipment; v_id uuid; v_next date;
begin
  e := public.equipment_or_fail(p_equipment);
  if not public.can_manage_metrology(e.organization_id, e.process_id) then
    raise exception 'No puedes registrar calibraciones' using errcode = '42501';
  end if;
  if p_kind not in ('calibracion','verificacion') or p_result not in ('conforme','no_conforme','ajustado') then
    raise exception 'Datos de la calibración no válidos' using errcode = '22023';
  end if;
  v_next := public.metrology_next_due(p_date, e.calibration_frequency);
  insert into public.calibration_events (organization_id, equipment_id, date, kind, result, standard_used, certificate_ref, provider, next_due_date, note, created_by)
  values (e.organization_id, e.id, p_date, p_kind, p_result, nullif(trim(coalesce(p_standard,'')),''), nullif(trim(coalesce(p_certificate,'')),''),
    nullif(trim(coalesce(p_provider,'')),''), v_next, nullif(trim(coalesce(p_note,'')),''), auth.uid())
  returning calibration_events.id into v_id;
  update public.measurement_equipment set last_calibration_date = p_date, next_due_date = v_next, updated_at = now() where id = e.id;
  perform public.log_event(e.organization_id, 'registrar_calibracion', 'Metrologia', e.id, e.code, jsonb_build_object('resultado', p_result));
  return v_id;
end $$;

revoke execute on function public.metrology_next_due, public.equipment_or_fail from public, anon, authenticated;
revoke execute on function public.create_equipment, public.update_equipment, public.set_equipment_service, public.register_calibration from public, anon;
grant execute on function public.create_equipment, public.update_equipment, public.set_equipment_service, public.register_calibration to authenticated;
