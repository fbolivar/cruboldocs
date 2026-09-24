-- 004 · Riesgos: identificación, valoraciones (historial, nunca se sobrescribe),
-- controles y evidencias (solo inserción). Escrituras vía funciones con validación de rol.

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  process_id uuid not null,
  code text not null check (code ~ '^R-\d{2,5}$'),
  description text not null check (length(trim(description)) between 5 and 500),
  cause text not null default '' check (length(cause) <= 2000),
  consequence text not null default '' check (length(consequence) <= 2000),
  category text not null check (length(trim(category)) between 2 and 80),
  owner_position_id uuid not null,
  status text not null default 'activo' check (status in ('activo', 'cerrado')),
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (owner_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  risk_id uuid not null,
  kind text not null check (kind in ('inherente', 'residual')),
  probability int not null check (probability between 1 and 5),
  impact int not null check (impact between 1 and 5),
  score int generated always as (probability * impact) stored,
  -- Lo fija el trigger con la escala de la organización al momento de valorar.
  level text not null check (level in ('bajo', 'moderado', 'alto', 'extremo')),
  assessed_by uuid not null references public.profiles,
  assessed_at timestamptz not null default now(),
  foreign key (risk_id, organization_id) references public.risks (id, organization_id) on delete cascade
);

create table public.controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  risk_id uuid not null,
  description text not null check (length(trim(description)) between 5 and 500),
  type text not null check (type in ('preventivo', 'detectivo', 'correctivo')),
  frequency text not null check (frequency in (
    'diaria', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual', 'por_evento'
  )),
  responsible_position_id uuid not null,
  next_due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (risk_id, organization_id) references public.risks (id, organization_id) on delete cascade,
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.control_evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  control_id uuid not null,
  executed_at date not null check (executed_at <= current_date),
  result text not null check (result in ('efectivo', 'no_efectivo')),
  notes text not null default '' check (length(notes) <= 2000),
  -- Bucket privado "evidencias": <org>/<control>/<evidencia>/<archivo>.
  file_path text,
  file_sha256 text check (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_name text,
  registered_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  foreign key (control_id, organization_id) references public.controls (id, organization_id) on delete cascade
);

comment on table public.control_evidences is 'Dato sensible. Solo inserción (las evidencias no se editan).';

create index on public.risks (organization_id);
create index on public.risk_assessments (organization_id);
create index on public.risk_assessments (risk_id, kind, assessed_at desc);
create index on public.controls (organization_id);
create index on public.controls (risk_id);
create index on public.control_evidences (organization_id);
create index on public.control_evidences (control_id, executed_at desc);

create trigger t_touch before update on public.risks for each row execute function public.touch_updated_at();
create trigger t_touch before update on public.controls for each row execute function public.touch_updated_at();
create trigger t_immutable before update or delete on public.risk_assessments
  for each row execute function public.forbid_change();
create trigger t_immutable before update or delete on public.control_evidences
  for each row execute function public.forbid_change();

/** Nivel según la escala de la organización (organizations.risk_scale). */
create or replace function public.set_assessment_level() returns trigger
language plpgsql set search_path = '' as $$
declare s jsonb; v_score int := new.probability * new.impact;
begin
  select risk_scale into s from public.organizations where id = new.organization_id;
  new.level := case
    when v_score >= (s ->> 'extremoFrom')::int then 'extremo'
    when v_score >= (s ->> 'altoFrom')::int then 'alto'
    when v_score >= (s ->> 'moderadoFrom')::int then 'moderado'
    else 'bajo'
  end;
  return new;
end $$;

create trigger t_level before insert on public.risk_assessments
  for each row execute function public.set_assessment_level();

create or replace function public.frequency_interval(f text) returns interval
language sql immutable set search_path = '' as $$
  select case f
    when 'diaria' then interval '1 day'
    when 'semanal' then interval '7 days'
    when 'mensual' then interval '1 month'
    when 'trimestral' then interval '3 months'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '1 year'
    else null
  end
$$;

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_risks(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin()
    or public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_risk(org uuid, process uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_risks, public.can_manage_risk from public, anon;
grant execute on function public.can_see_risks, public.can_manage_risk to authenticated;
revoke execute on function public.set_assessment_level from public, anon, authenticated;

alter table public.risks enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.controls enable row level security;
alter table public.control_evidences enable row level security;

create policy risk_select on public.risks for select to authenticated using (public.can_see_risks(organization_id));
create policy assessment_select on public.risk_assessments for select to authenticated using (public.can_see_risks(organization_id));
create policy control_select on public.controls for select to authenticated using (public.can_see_risks(organization_id));
create policy evidence_select on public.control_evidences for select to authenticated using (public.can_see_risks(organization_id));

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.risk_or_fail(p_risk uuid) returns public.risks
language plpgsql stable security definer set search_path = '' as $$
declare r public.risks;
begin
  select * into r from public.risks where id = p_risk;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Riesgo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return r;
end $$;

/** Identifica un riesgo con su valoración inherente y controles iniciales. Devuelve el código asignado. */
create or replace function public.create_risk(
  p_org uuid, p_process uuid, p_description text, p_cause text, p_consequence text, p_category text,
  p_owner uuid, p_probability int, p_impact int, p_controls jsonb default '[]'
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; c jsonb;
begin
  if not public.can_manage_risk(p_org, p_process) then
    raise exception 'Tu cargo no puede identificar riesgos en este proceso' using errcode = '42501';
  end if;
  -- Consecutivo por organización (bloqueo para evitar códigos duplicados concurrentes).
  perform pg_advisory_xact_lock(hashtext('risk_code:' || p_org));
  select 'R-' || lpad((coalesce(max(substring(r.code from 3)::int), 0) + 1)::text, 2, '0') into v_code
  from public.risks r where r.organization_id = p_org;

  insert into public.risks (organization_id, process_id, code, description, cause, consequence, category,
    owner_position_id, created_by)
  values (p_org, p_process, v_code, trim(p_description), trim(coalesce(p_cause, '')), trim(coalesce(p_consequence, '')),
    trim(p_category), p_owner, auth.uid())
  returning risks.id into v_id;

  insert into public.risk_assessments (organization_id, risk_id, kind, probability, impact, level, assessed_by)
  values (p_org, v_id, 'inherente', p_probability, p_impact, 'bajo', auth.uid());

  for c in select * from jsonb_array_elements(coalesce(p_controls, '[]')) loop
    insert into public.controls (organization_id, risk_id, description, type, frequency, responsible_position_id, next_due_date)
    values (p_org, v_id, trim(c ->> 'description'), c ->> 'type', c ->> 'frequency', (c ->> 'responsiblePositionId')::uuid,
      coalesce((current_date + public.frequency_interval(c ->> 'frequency'))::date, current_date + 30));
  end loop;

  perform public.log_event(p_org, 'identificar_riesgo', 'Riesgo', v_id, v_code,
    jsonb_build_object('probabilidad', p_probability, 'impacto', p_impact));
  return query select v_id, v_code;
end $$;

create or replace function public.add_assessment(p_risk uuid, p_kind text, p_probability int, p_impact int)
returns void
language plpgsql security definer set search_path = '' as $$
declare r public.risks;
begin
  r := public.risk_or_fail(p_risk);
  if not public.can_manage_risk(r.organization_id, r.process_id) then
    raise exception 'Tu cargo no puede valorar este riesgo' using errcode = '42501';
  end if;
  insert into public.risk_assessments (organization_id, risk_id, kind, probability, impact, level, assessed_by)
  values (r.organization_id, r.id, p_kind, p_probability, p_impact, 'bajo', auth.uid());
  perform public.log_event(r.organization_id, 'valorar_riesgo', 'Riesgo', r.id, r.code || ' ' || p_kind,
    jsonb_build_object('probabilidad', p_probability, 'impacto', p_impact));
end $$;

create or replace function public.add_control(
  p_risk uuid, p_description text, p_type text, p_frequency text, p_responsible uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare r public.risks; v_id uuid;
begin
  r := public.risk_or_fail(p_risk);
  if not public.can_manage_risk(r.organization_id, r.process_id) then
    raise exception 'Tu cargo no puede agregar controles a este riesgo' using errcode = '42501';
  end if;
  insert into public.controls (organization_id, risk_id, description, type, frequency, responsible_position_id, next_due_date)
  values (r.organization_id, r.id, trim(p_description), p_type, p_frequency, p_responsible,
    coalesce((current_date + public.frequency_interval(p_frequency))::date, current_date + 30))
  returning id into v_id;
  perform public.log_event(r.organization_id, 'agregar_control', 'Riesgo', r.id, r.code, jsonb_build_object('control', trim(p_description)));
  return v_id;
end $$;

/** Solo el cargo responsable registra evidencia; recalcula la próxima ejecución. */
create or replace function public.register_evidence(
  p_control uuid, p_executed_at date, p_result text, p_notes text,
  p_file_path text default null, p_file_sha256 text default null, p_file_name text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.controls; r public.risks; v_id uuid;
begin
  select * into c from public.controls where id = p_control;
  if c.id is null then raise exception 'Control no encontrado' using errcode = 'P0002'; end if;
  r := public.risk_or_fail(c.risk_id);
  if public.my_position(c.organization_id) is distinct from c.responsible_position_id then
    raise exception 'Solo el cargo responsable registra evidencia de este control' using errcode = '42501';
  end if;
  if p_file_path is not null and split_part(p_file_path, '/', 1) <> c.organization_id::text then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  insert into public.control_evidences (organization_id, control_id, executed_at, result, notes,
    file_path, file_sha256, file_name, registered_by)
  values (c.organization_id, c.id, p_executed_at, p_result, trim(coalesce(p_notes, '')),
    p_file_path, p_file_sha256, p_file_name, auth.uid())
  returning id into v_id;
  update public.controls set next_due_date = coalesce(
    (p_executed_at + public.frequency_interval(c.frequency))::date, c.next_due_date)
  where id = c.id;
  perform public.complete_tasks('ejecutar_control', c.id);
  perform public.log_event(c.organization_id, 'registrar_evidencia', 'Control', c.id, r.code,
    jsonb_build_object('resultado', p_result, 'ejecutado', p_executed_at));
  return v_id;
end $$;

revoke execute on function public.risk_or_fail from public, anon, authenticated;
revoke execute on function public.create_risk, public.add_assessment, public.add_control, public.register_evidence from public, anon;
grant execute on function public.create_risk, public.add_assessment, public.add_control, public.register_evidence to authenticated;
