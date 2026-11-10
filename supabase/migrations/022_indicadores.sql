-- 022 — Módulo Indicadores de gestión / KPIs (ISO 9001 9.1). Arquitectura: docs/indicadores/ARQUITECTURA.md.
-- Espejo de No Conformidades/Auditorías: RLS solo-SELECT, escritura por RPC SECURITY DEFINER que valida
-- permiso y audita. El cumplimiento (cumple/en_riesgo/no_cumple) se CALCULA Y PERSISTE en el servidor
-- (indicator_compliance). Una medición no_cumple genera una NC con `generate_nc_from_measurement`
-- (reusa report_nonconformity, source='indicador', ADR-013). Numeración atómica IND-AAAA-###.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.indicators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  name text not null,
  process_id uuid not null,
  description text,
  unit text not null,
  direction text not null check (direction in ('mayor_mejor','menor_mejor','rango')),
  target numeric(14,4) not null,
  target_max numeric(14,4),
  tolerance_pct numeric(5,2),
  frequency text not null check (frequency in ('mensual','bimestral','trimestral','semestral','anual')),
  owner_position_id uuid,
  is_rate boolean not null default false,
  status text not null default 'activo' check (status in ('activo','archivado')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (owner_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.indicator_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  indicator_id uuid not null,
  period date not null,
  value numeric(14,4) not null,
  numerator numeric(14,4),
  denominator numeric(14,4),
  compliance text not null check (compliance in ('cumple','en_riesgo','no_cumple')),
  note text,
  nonconformity_id uuid,
  captured_by uuid not null default auth.uid(),
  captured_at timestamptz not null default now(),
  unique (indicator_id, period),
  unique (id, organization_id),
  foreign key (indicator_id, organization_id) references public.indicators (id, organization_id) on delete cascade,
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id)
);

create table public.indicator_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.indicators (organization_id, status);
create index on public.indicators (process_id, organization_id);
create index on public.indicators (owner_position_id, organization_id);
create index on public.indicator_measurements (indicator_id, organization_id);
create index on public.indicator_measurements (nonconformity_id, organization_id);

-- Ampliar origen de no conformidades (ADR-013) y las tareas del módulo.
alter table public.nonconformities drop constraint nonconformities_source_check;
alter table public.nonconformities add constraint nonconformities_source_check check (source in (
  'auditoria_interna','auditoria_externa','queja_pqrs','producto_servicio','riesgo_materializado','mejora','indicador','otro'));
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria', 'indicador'));

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_indicators(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_indicators(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig')
$$;

revoke execute on function public.can_see_indicators, public.can_manage_indicators from public, anon;
grant execute on function public.can_see_indicators, public.can_manage_indicators to authenticated;

alter table public.indicators enable row level security;
alter table public.indicator_measurements enable row level security;
alter table public.indicator_counters enable row level security; -- deny-all: solo la función de servidor

create policy indicator_select on public.indicators for select to authenticated
  using (public.can_see_indicators(organization_id));
create policy indicator_measurement_select on public.indicator_measurements for select to authenticated
  using (public.can_see_indicators(organization_id));

-- ---------------------------------------------------------------------------
-- Cálculo de cumplimiento (determinista; espejo de computeCompliance del cliente)
-- ---------------------------------------------------------------------------

create or replace function public.indicator_compliance(
  p_direction text, p_target numeric, p_target_max numeric, p_tolerance numeric, p_value numeric
) returns text
language plpgsql immutable set search_path = '' as $$
declare tol numeric := coalesce(p_tolerance, 10) / 100.0; v_max numeric; margin numeric;
begin
  if p_direction = 'mayor_mejor' then
    if p_value >= p_target then return 'cumple'; end if;
    return case when p_value >= p_target * (1 - tol) then 'en_riesgo' else 'no_cumple' end;
  elsif p_direction = 'menor_mejor' then
    if p_value <= p_target then return 'cumple'; end if;
    return case when p_value <= p_target * (1 + tol) then 'en_riesgo' else 'no_cumple' end;
  else -- rango
    v_max := coalesce(p_target_max, p_target);
    if p_value >= p_target and p_value <= v_max then return 'cumple'; end if;
    margin := (case when (v_max - p_target) <> 0 then (v_max - p_target) else abs(p_target) end) * tol;
    return case when p_value >= p_target - margin and p_value <= v_max + margin then 'en_riesgo' else 'no_cumple' end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.indicator_or_fail(p_indicator uuid) returns public.indicators
language plpgsql stable security definer set search_path = '' as $$
declare i public.indicators;
begin
  select * into i from public.indicators where id = p_indicator;
  if i.id is null or not public.is_active_member(i.organization_id) then
    raise exception 'Indicador no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return i;
end $$;

/** Crea un indicador (Líder SIG). Devuelve el código. */
create or replace function public.create_indicator(
  p_org uuid, p_name text, p_process uuid, p_description text, p_unit text, p_direction text,
  p_target numeric, p_target_max numeric, p_tolerance numeric, p_frequency text, p_owner uuid, p_is_rate boolean
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_indicators(p_org) then
    raise exception 'Solo el Líder SIG crea indicadores' using errcode = '42501';
  end if;
  if p_direction = 'rango' and p_target_max is null then
    raise exception 'El rango necesita una meta máxima' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.indicator_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.indicator_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'IND-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.indicators (organization_id, code, name, process_id, description, unit, direction,
    target, target_max, tolerance_pct, frequency, owner_position_id, is_rate, created_by)
  values (p_org, v_code, trim(p_name), p_process, nullif(trim(coalesce(p_description, '')), ''), trim(p_unit),
    p_direction, p_target, case when p_direction = 'rango' then p_target_max else null end,
    p_tolerance, p_frequency, p_owner, coalesce(p_is_rate, false), auth.uid())
  returning indicators.id into v_id;

  perform public.log_event(p_org, 'crear_indicador', 'Indicador', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

/** Edita la definición (no recalcula el histórico, decisión de diseño). */
create or replace function public.update_indicator(
  p_indicator uuid, p_name text, p_description text, p_unit text, p_direction text,
  p_target numeric, p_target_max numeric, p_tolerance numeric, p_frequency text, p_owner uuid, p_is_rate boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.indicators;
begin
  i := public.indicator_or_fail(p_indicator);
  if not public.can_manage_indicators(i.organization_id) then
    raise exception 'Solo el Líder SIG edita indicadores' using errcode = '42501';
  end if;
  if p_direction = 'rango' and p_target_max is null then
    raise exception 'El rango necesita una meta máxima' using errcode = '22023';
  end if;
  update public.indicators set
    name = trim(p_name), description = nullif(trim(coalesce(p_description, '')), ''), unit = trim(p_unit),
    direction = p_direction, target = p_target,
    target_max = case when p_direction = 'rango' then p_target_max else null end,
    tolerance_pct = p_tolerance, frequency = p_frequency, owner_position_id = p_owner,
    is_rate = coalesce(p_is_rate, false), updated_at = now()
  where id = i.id;
  perform public.log_event(i.organization_id, 'editar_indicador', 'Indicador', i.id, i.code, '{}');
end $$;

create or replace function public.archive_indicator(p_indicator uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.indicators;
begin
  i := public.indicator_or_fail(p_indicator);
  if not public.can_manage_indicators(i.organization_id) then
    raise exception 'Solo el Líder SIG archiva indicadores' using errcode = '42501';
  end if;
  update public.indicators set status = 'archivado', updated_at = now() where id = i.id;
  perform public.log_event(i.organization_id, 'archivar_indicador', 'Indicador', i.id, i.code, '{}');
end $$;

create or replace function public.unarchive_indicator(p_indicator uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.indicators;
begin
  i := public.indicator_or_fail(p_indicator);
  if not public.can_manage_indicators(i.organization_id) then
    raise exception 'Solo el Líder SIG reactiva indicadores' using errcode = '42501';
  end if;
  update public.indicators set status = 'activo', updated_at = now() where id = i.id;
  perform public.log_event(i.organization_id, 'reactivar_indicador', 'Indicador', i.id, i.code, '{}');
end $$;

/** Registra (o corrige) la medición de un periodo. Calcula y persiste el cumplimiento. */
create or replace function public.record_measurement(
  p_indicator uuid, p_period date, p_value numeric, p_numerator numeric, p_denominator numeric, p_note text
) returns text
language plpgsql security definer set search_path = '' as $$
declare i public.indicators; v_period date; v_value numeric; v_compliance text;
begin
  i := public.indicator_or_fail(p_indicator);
  if not (public.can_manage_indicators(i.organization_id)
          or public.has_role(i.organization_id, 'lider_proceso', i.process_id)) then
    raise exception 'Tu cargo no puede registrar mediciones de este indicador' using errcode = '42501';
  end if;
  if i.status <> 'activo' then
    raise exception 'El indicador está archivado' using errcode = '22023';
  end if;
  v_period := date_trunc('month', p_period)::date;

  if i.is_rate then
    if p_numerator is null or p_denominator is null then
      raise exception 'Captura numerador y denominador' using errcode = '22023';
    end if;
    if p_denominator = 0 then
      raise exception 'El denominador no puede ser cero' using errcode = '22012';
    end if;
    v_value := p_numerator / p_denominator * (case when i.unit = '%' then 100 else 1 end);
  else
    if p_value is null then
      raise exception 'Captura el valor' using errcode = '22023';
    end if;
    v_value := p_value;
  end if;

  v_compliance := public.indicator_compliance(i.direction, i.target, i.target_max, i.tolerance_pct, v_value);

  insert into public.indicator_measurements (organization_id, indicator_id, period, value, numerator, denominator, compliance, note, captured_by)
  values (i.organization_id, i.id, v_period, v_value,
    case when i.is_rate then p_numerator else null end, case when i.is_rate then p_denominator else null end,
    v_compliance, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  on conflict (indicator_id, period) do update set
    value = excluded.value, numerator = excluded.numerator, denominator = excluded.denominator,
    compliance = excluded.compliance, note = excluded.note, captured_by = excluded.captured_by, captured_at = now();

  perform public.complete_tasks('capturar_medicion', i.id);
  perform public.log_event(i.organization_id, 'registrar_medicion', 'Indicador', i.id, i.code,
    jsonb_build_object('periodo', to_char(v_period, 'YYYY-MM'), 'cumplimiento', v_compliance));
  return v_compliance;
end $$;

/** Genera una NC desde una medición que no cumple (un clic, idempotente). Devuelve el código. */
create or replace function public.generate_nc_from_measurement(p_measurement uuid) returns table (code text)
language plpgsql security definer set search_path = '' as $$
declare m public.indicator_measurements; i public.indicators; v_nc_id uuid; v_nc_code text;
begin
  select * into m from public.indicator_measurements where id = p_measurement for update;
  if m.id is null then raise exception 'Medición no encontrada' using errcode = 'P0002'; end if;
  i := public.indicator_or_fail(m.indicator_id);
  if not (public.can_manage_indicators(i.organization_id)
          or public.has_role(i.organization_id, 'lider_proceso', i.process_id)) then
    raise exception 'Tu cargo no puede generar la no conformidad' using errcode = '42501';
  end if;
  if m.compliance <> 'no_cumple' then
    raise exception 'La medición cumple o está en riesgo; no genera no conformidad' using errcode = '22023';
  end if;
  if m.nonconformity_id is not null then
    raise exception 'Esta medición ya tiene una no conformidad' using errcode = '22023';
  end if;
  select r.id, r.code into v_nc_id, v_nc_code
  from public.report_nonconformity(i.organization_id, 'indicador', i.process_id,
    left(i.name, 110) || ' — ' || to_char(m.period, 'YYYY-MM'),
    coalesce(m.note, 'Incumplimiento del indicador ' || i.code || ' en ' || to_char(m.period, 'YYYY-MM')),
    'menor') r;
  update public.indicator_measurements set nonconformity_id = v_nc_id where id = m.id;
  perform public.log_event(i.organization_id, 'generar_nc_medicion', 'Indicador', i.id, i.code, jsonb_build_object('nc', v_nc_code));
  return query select v_nc_code;
end $$;

revoke execute on function public.indicator_or_fail, public.indicator_compliance from public, anon, authenticated;
revoke execute on function public.create_indicator, public.update_indicator, public.archive_indicator,
  public.unarchive_indicator, public.record_measurement, public.generate_nc_from_measurement from public, anon;
grant execute on function public.create_indicator, public.update_indicator, public.archive_indicator,
  public.unarchive_indicator, public.record_measurement, public.generate_nc_from_measurement to authenticated;
