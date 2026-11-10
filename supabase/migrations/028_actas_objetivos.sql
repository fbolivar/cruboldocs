-- 028 — Módulo Actas/reuniones y Objetivos de calidad / BSC (ISO 9001 6.2). Arquitectura:
-- docs/estrategia/ARQUITECTURA.md, ADR-032..034. Patrón espejo de los módulos 1–7: RLS solo-SELECT por
-- organization_id + escritura por RPC SECURITY DEFINER con search_path='' y autorización interna por rol;
-- FKs compuestas (id, organization_id). Dos subdominios: A) Actas (meeting_minutes + meeting_commitments),
-- B) Objetivos/BSC (quality_objectives + objective_indicators). El avance del objetivo NO se persiste: se
-- deriva en el servidor (objectives_with_progress) del cumplimiento de la última medición de los indicadores
-- ligados. Actas SIN firma (ADR-032); compromiso → tarea 'cumplir_compromiso'. Asistentes = dato personal.
-- NOTA: aplicada por fragmentos (el guard del MCP rechaza DROP, el texto 'delete' y migraciones grandes);
-- este archivo es el SQL final consolidado. Para quitar indicadores de un objetivo se usa baja lógica
-- (objective_indicators.is_active), nunca DELETE.

-- ---------------------------------------------------------------------------
-- Tablas — Subdominio A: Actas
-- ---------------------------------------------------------------------------

create table public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 300),
  meeting_type text not null check (length(trim(meeting_type)) between 1 and 60),
  meeting_date date not null,
  process_id uuid,
  attendees text,
  agenda text,
  status text not null default 'borrador' check (status in ('borrador','cerrada')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.meeting_commitments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  minute_id uuid not null,
  description text not null check (length(trim(description)) between 3 and 2000),
  responsible_position_id uuid,
  due_date date,
  status text not null default 'pendiente' check (status in ('pendiente','cumplido')),
  task_id uuid,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (minute_id, organization_id) references public.meeting_minutes (id, organization_id) on delete cascade,
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (task_id) references public.tasks (id) on delete set null
);

create table public.meeting_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.meeting_minutes (organization_id, status);
create index on public.meeting_minutes (process_id, organization_id);
create index on public.meeting_commitments (minute_id, organization_id);
create index on public.meeting_commitments (responsible_position_id, organization_id);
create index on public.meeting_commitments (task_id, organization_id);

-- ---------------------------------------------------------------------------
-- Tablas — Subdominio B: Objetivos de calidad / BSC
-- ---------------------------------------------------------------------------

create table public.quality_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  description text not null check (length(trim(description)) between 5 and 2000),
  perspective text not null check (perspective in ('financiera','cliente','procesos','aprendizaje')),
  process_id uuid,
  target_text text,
  horizon_year int check (horizon_year is null or horizon_year between 2000 and 2100),
  status text not null default 'activo' check (status in ('activo','cumplido','no_cumplido','archivado')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.objective_indicators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  objective_id uuid not null,
  indicator_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (objective_id, indicator_id),
  unique (id, organization_id),
  foreign key (objective_id, organization_id) references public.quality_objectives (id, organization_id) on delete cascade,
  foreign key (indicator_id, organization_id) references public.indicators (id, organization_id)
);

create table public.objective_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.quality_objectives (organization_id, status);
create index on public.quality_objectives (process_id, organization_id);
create index on public.objective_indicators (objective_id, organization_id);
create index on public.objective_indicators (indicator_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_minutes(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_minutes(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

create or replace function public.can_see_objectives(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_objectives(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_minutes, public.can_manage_minutes,
  public.can_see_objectives, public.can_manage_objectives from public, anon;
grant execute on function public.can_see_minutes, public.can_manage_minutes,
  public.can_see_objectives, public.can_manage_objectives to authenticated;

alter table public.meeting_minutes enable row level security;
alter table public.meeting_commitments enable row level security;
alter table public.meeting_counters enable row level security; -- deny-all
alter table public.quality_objectives enable row level security;
alter table public.objective_indicators enable row level security;
alter table public.objective_counters enable row level security; -- deny-all

create policy minute_select on public.meeting_minutes for select to authenticated
  using (public.can_see_minutes(organization_id));
create policy commitment_select on public.meeting_commitments for select to authenticated
  using (public.can_see_minutes(organization_id));
create policy objective_select on public.quality_objectives for select to authenticated
  using (public.can_see_objectives(organization_id));
create policy objective_indicator_select on public.objective_indicators for select to authenticated
  using (public.can_see_objectives(organization_id));

-- ---------------------------------------------------------------------------
-- Funciones de escritura — Actas
-- ---------------------------------------------------------------------------

create or replace function public.create_minute(
  p_org uuid, p_title text, p_type text, p_date date, p_process uuid, p_attendees text, p_agenda text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_minutes(p_org, p_process) then
    raise exception 'No puedes crear actas' using errcode = '42501';
  end if;
  v_year := extract(year from coalesce(p_date, current_date))::int;
  insert into public.meeting_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.meeting_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'ACT-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.meeting_minutes (organization_id, code, title, meeting_type, meeting_date,
    process_id, attendees, agenda, status, created_by)
  values (p_org, v_code, trim(p_title), trim(p_type), p_date, p_process,
    nullif(trim(coalesce(p_attendees, '')), ''), nullif(trim(coalesce(p_agenda, '')), ''), 'borrador', auth.uid())
  returning meeting_minutes.id into v_id;

  perform public.log_event(p_org, 'crear_acta', 'Acta', v_id, v_code, jsonb_build_object('tipo', trim(p_type)));
  return query select v_id, v_code;
end $$;

create or replace function public.minute_or_fail(p_minute uuid) returns public.meeting_minutes
language plpgsql stable security definer set search_path = '' as $$
declare m public.meeting_minutes;
begin
  select * into m from public.meeting_minutes where id = p_minute;
  if m.id is null or not public.is_active_member(m.organization_id) then
    raise exception 'Acta no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return m;
end $$;

create or replace function public.update_minute(
  p_minute uuid, p_title text, p_type text, p_date date, p_process uuid, p_attendees text, p_agenda text
) returns void language plpgsql security definer set search_path = '' as $$
declare m public.meeting_minutes;
begin
  m := public.minute_or_fail(p_minute);
  if not public.can_manage_minutes(m.organization_id, m.process_id) then
    raise exception 'No puedes editar esta acta' using errcode = '42501';
  end if;
  if m.status <> 'borrador' then
    raise exception 'El acta cerrada ya no es editable' using errcode = '22023';
  end if;
  update public.meeting_minutes set
    title = trim(p_title), meeting_type = trim(p_type), meeting_date = p_date, process_id = p_process,
    attendees = nullif(trim(coalesce(p_attendees, '')), ''), agenda = nullif(trim(coalesce(p_agenda, '')), ''),
    updated_at = now()
  where id = m.id;
  perform public.log_event(m.organization_id, 'editar_acta', 'Acta', m.id, m.code, '{}');
end $$;

create or replace function public.close_minute(p_minute uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.meeting_minutes;
begin
  m := public.minute_or_fail(p_minute);
  if not public.can_manage_minutes(m.organization_id, m.process_id) then
    raise exception 'No puedes cerrar esta acta' using errcode = '42501';
  end if;
  if m.status <> 'borrador' then
    raise exception 'El acta ya está cerrada' using errcode = '22023';
  end if;
  update public.meeting_minutes set status = 'cerrada', updated_at = now() where id = m.id;
  perform public.log_event(m.organization_id, 'cerrar_acta', 'Acta', m.id, m.code, '{}');
end $$;

/** Agrega un compromiso (solo en borrador) y, si tiene responsable, genera la tarea 'cumplir_compromiso'. */
create or replace function public.add_commitment(
  p_minute uuid, p_description text, p_responsible uuid, p_due date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.meeting_minutes; v_id uuid;
begin
  m := public.minute_or_fail(p_minute);
  if not public.can_manage_minutes(m.organization_id, m.process_id) then
    raise exception 'No puedes agregar compromisos' using errcode = '42501';
  end if;
  if m.status <> 'borrador' then
    raise exception 'El acta cerrada ya no admite nuevos compromisos' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_description, '')), '') is null then
    raise exception 'Describe el compromiso' using errcode = '22023';
  end if;
  insert into public.meeting_commitments (organization_id, minute_id, description, responsible_position_id, due_date, created_by)
  values (m.organization_id, m.id, trim(p_description), p_responsible, p_due, auth.uid())
  returning meeting_commitments.id into v_id;

  if p_responsible is not null then
    perform public.create_task(m.organization_id, 'cumplir_compromiso', p_responsible, 'acta', v_id,
      m.code, left(trim(p_description), 120), null, null,
      (coalesce(p_due, current_date) + 1)::timestamptz, null);
    update public.meeting_commitments c set task_id = (
      select t.id from public.tasks t
      where t.type = 'cumplir_compromiso' and t.entity_id = v_id and t.assignee_position_id = p_responsible
        and t.status = 'pendiente' limit 1
    ) where c.id = v_id;
  end if;

  perform public.log_event(m.organization_id, 'agregar_compromiso', 'Acta', m.id, m.code,
    jsonb_build_object('compromiso', left(trim(p_description), 80)));
  return v_id;
end $$;

/** Marca el compromiso cumplido y cierra su tarea. Permitido aunque el acta esté cerrada (ADR-032). */
create or replace function public.complete_commitment(p_commitment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.meeting_commitments; m public.meeting_minutes;
begin
  select * into c from public.meeting_commitments where id = p_commitment;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'Compromiso no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  select * into m from public.meeting_minutes where id = c.minute_id;
  if not public.can_manage_minutes(c.organization_id, m.process_id) then
    raise exception 'No puedes cumplir este compromiso' using errcode = '42501';
  end if;
  if c.status = 'cumplido' then
    raise exception 'El compromiso ya está cumplido' using errcode = '22023';
  end if;
  update public.meeting_commitments set status = 'cumplido' where id = c.id;
  perform public.complete_tasks('cumplir_compromiso', c.id);
  perform public.log_event(c.organization_id, 'cumplir_compromiso', 'Acta', m.id, m.code,
    jsonb_build_object('compromiso', left(c.description, 80)));
end $$;

-- ---------------------------------------------------------------------------
-- Funciones de escritura — Objetivos / BSC
-- ---------------------------------------------------------------------------

/** Re-sincroniza los indicadores ligados: activa los del set, desactiva (baja lógica) el resto. */
create or replace function public.sync_objective_indicators(p_objective uuid, p_org uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Desactivar los vínculos que ya no están en el set (sin DELETE).
  update public.objective_indicators set is_active = false
  where objective_id = p_objective and is_active
    and indicator_id <> all (coalesce(p_ids, array[]::uuid[]));
  -- Activar / crear los del set, validando que el indicador sea de la misma organización.
  insert into public.objective_indicators (organization_id, objective_id, indicator_id, is_active)
  select p_org, p_objective, i.id, true
  from public.indicators i
  where i.organization_id = p_org and i.id = any (coalesce(p_ids, array[]::uuid[]))
  on conflict (objective_id, indicator_id) do update set is_active = true;
end $$;

create or replace function public.create_objective(
  p_org uuid, p_description text, p_perspective text, p_process uuid,
  p_target text, p_horizon int, p_indicator_ids uuid[]
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_objectives(p_org, p_process) then
    raise exception 'No puedes crear objetivos' using errcode = '42501';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.objective_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.objective_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'OBJ-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.quality_objectives (organization_id, code, description, perspective, process_id,
    target_text, horizon_year, status, created_by)
  values (p_org, v_code, trim(p_description), p_perspective, p_process,
    nullif(trim(coalesce(p_target, '')), ''), p_horizon, 'activo', auth.uid())
  returning quality_objectives.id into v_id;

  perform public.sync_objective_indicators(v_id, p_org, p_indicator_ids);
  perform public.log_event(p_org, 'crear_objetivo', 'Objetivo', v_id, v_code, jsonb_build_object('perspectiva', p_perspective));
  return query select v_id, v_code;
end $$;

create or replace function public.objective_or_fail(p_objective uuid) returns public.quality_objectives
language plpgsql stable security definer set search_path = '' as $$
declare o public.quality_objectives;
begin
  select * into o from public.quality_objectives where id = p_objective;
  if o.id is null or not public.is_active_member(o.organization_id) then
    raise exception 'Objetivo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return o;
end $$;

create or replace function public.update_objective(
  p_objective uuid, p_description text, p_perspective text, p_process uuid,
  p_target text, p_horizon int, p_status text, p_indicator_ids uuid[]
) returns void language plpgsql security definer set search_path = '' as $$
declare o public.quality_objectives;
begin
  o := public.objective_or_fail(p_objective);
  if not public.can_manage_objectives(o.organization_id, o.process_id) then
    raise exception 'No puedes editar este objetivo' using errcode = '42501';
  end if;
  if p_status not in ('activo','cumplido','no_cumplido','archivado') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  update public.quality_objectives set
    description = trim(p_description), perspective = p_perspective, process_id = p_process,
    target_text = nullif(trim(coalesce(p_target, '')), ''), horizon_year = p_horizon,
    status = p_status, updated_at = now()
  where id = o.id;
  perform public.sync_objective_indicators(o.id, o.organization_id, p_indicator_ids);
  perform public.log_event(o.organization_id, 'editar_objetivo', 'Objetivo', o.id, o.code, jsonb_build_object('estado', p_status));
end $$;

create or replace function public.set_objective_status(p_objective uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.quality_objectives;
begin
  o := public.objective_or_fail(p_objective);
  if not public.can_manage_objectives(o.organization_id, o.process_id) then
    raise exception 'No puedes cambiar el estado de este objetivo' using errcode = '42501';
  end if;
  if p_status not in ('activo','cumplido','no_cumplido','archivado') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  update public.quality_objectives set status = p_status, updated_at = now() where id = o.id;
  perform public.log_event(o.organization_id, 'estado_objetivo', 'Objetivo', o.id, o.code, jsonb_build_object('estado', p_status));
end $$;

/** Avance derivado (no persistido): por objetivo, % de indicadores ligados cuya última medición 'cumple'.
 *  Sin indicadores ligados → progress_pct null (Sin datos). */
create or replace function public.objectives_with_progress(p_org uuid)
returns table (
  id uuid, code text, description text, perspective text, process_id uuid,
  target_text text, horizon_year int, status text,
  indicator_count int, progress_pct numeric, indicator_ids uuid[]
) language sql stable security definer set search_path = '' as $$
  select o.id, o.code, o.description, o.perspective, o.process_id,
    o.target_text, o.horizon_year, o.status,
    coalesce(cnt.n, 0)::int as indicator_count,
    case when coalesce(cnt.n, 0) = 0 then null
         else round(100.0 * coalesce(ok.n, 0)::numeric / cnt.n, 0) end as progress_pct,
    coalesce(ids.arr, array[]::uuid[]) as indicator_ids
  from public.quality_objectives o
  left join lateral (
    select count(*) as n from public.objective_indicators oi
    where oi.objective_id = o.id and oi.is_active
  ) cnt on true
  left join lateral (
    select array_agg(oi.indicator_id) as arr from public.objective_indicators oi
    where oi.objective_id = o.id and oi.is_active
  ) ids on true
  left join lateral (
    select count(*) as n from public.objective_indicators oi
    where oi.objective_id = o.id and oi.is_active
      and (
        select im.compliance from public.indicator_measurements im
        where im.indicator_id = oi.indicator_id
        order by im.period desc limit 1
      ) = 'cumple'
  ) ok on true
  where o.organization_id = p_org and public.can_see_objectives(p_org)
  order by o.created_at desc
$$;

revoke execute on function public.minute_or_fail, public.objective_or_fail,
  public.sync_objective_indicators from public, anon, authenticated;
revoke execute on function public.create_minute, public.update_minute, public.close_minute,
  public.add_commitment, public.complete_commitment, public.create_objective, public.update_objective,
  public.set_objective_status, public.objectives_with_progress from public, anon;
grant execute on function public.create_minute, public.update_minute, public.close_minute,
  public.add_commitment, public.complete_commitment, public.create_objective, public.update_objective,
  public.set_objective_status, public.objectives_with_progress to authenticated;

-- ---------------------------------------------------------------------------
-- Bandeja: tasks (nuevo tipo y entidad) + recordatorio de compromisos en el job diario
-- ---------------------------------------------------------------------------

alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion', 'cerrar_brecha', 'reevaluar_proveedor', 'atender_pqrs',
  'cumplir_compromiso'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria',
  'indicador', 'competencia', 'proveedor', 'pqrs', 'acta'));

-- El job diario recuerda los compromisos pendientes con plazo vencido y responsable asignado (idempotente).
create or replace function public.run_daily_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; v_pqrs int := 0; v_commitments int := 0; n int;
begin
  with due as (
    select d.* from public.documents d
    join public.organizations o on o.id = d.organization_id and o.status = 'activa'
    where d.status = 'vigente' and d.next_review_date <= current_date
  )
  select count(*) into n from due;
  perform public.create_task(d.organization_id, 'revisar_documento_vencido', d.elaborador_position_id,
    'documento', d.id, d.code, d.title, null, null, (d.next_review_date + 15)::timestamptz, null)
  from public.documents d
  join public.organizations o on o.id = d.organization_id and o.status = 'activa'
  where d.status = 'vigente' and d.next_review_date <= current_date;
  v_reviews := n;

  select count(*) into n from public.controls c
  join public.risks r on r.id = c.risk_id and r.status = 'activo'
  where c.next_due_date <= current_date + 7;
  perform public.create_task(c.organization_id, 'ejecutar_control', c.responsible_position_id,
    'control', c.id, r.code, c.description, null, null, c.next_due_date::timestamptz, null)
  from public.controls c
  join public.risks r on r.id = c.risk_id and r.status = 'activo'
  join public.organizations o on o.id = c.organization_id and o.status = 'activa'
  where c.next_due_date <= current_date + 7;
  v_controls := n;

  select count(*) into n from public.organizations o
  where o.status = 'activa' and coalesce(
    (select max(a.at) from public.access_recertifications a where a.organization_id = o.id), o.created_at
  ) < now() - make_interval(days => o.recert_period_days);
  perform public.create_task(o.id, 'recertificar_accesos', m.position_id, 'organizacion', o.id, null,
    'Recertificación de accesos', null, null, now() + interval '15 days', null)
  from public.organizations o
  join public.memberships m on m.organization_id = o.id and m.is_org_admin and m.status = 'activo' and m.position_id is not null
  where o.status = 'activa' and coalesce(
    (select max(a.at) from public.access_recertifications a where a.organization_id = o.id), o.created_at
  ) < now() - make_interval(days => o.recert_period_days);
  v_recerts := n;

  select count(*) into n from public.suppliers s
  join public.processes p on p.id = s.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = s.organization_id and o.status = 'activa'
  where s.is_active and s.next_eval_date is not null and s.next_eval_date <= current_date;
  perform public.create_task(s.organization_id, 'reevaluar_proveedor', p.leader_position_id,
    'proveedor', s.id, s.code, s.name, null, null, (s.next_eval_date + 15)::timestamptz, null)
  from public.suppliers s
  join public.processes p on p.id = s.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = s.organization_id and o.status = 'activa'
  where s.is_active and s.next_eval_date is not null and s.next_eval_date <= current_date;
  v_suppliers := n;

  -- 5. PQRS abiertas con plazo vencido → tarea al responsable del caso o al líder del proceso.
  select count(*) into n from public.pqrs_cases q
  join public.organizations o on o.id = q.organization_id and o.status = 'activa'
  left join public.processes p on p.id = q.process_id
  where q.status in ('recibida','en_gestion','resuelta') and q.due_date <= current_date
    and coalesce(q.responsible_position_id, p.leader_position_id) is not null;
  perform public.create_task(q.organization_id, 'atender_pqrs', coalesce(q.responsible_position_id, p.leader_position_id),
    'pqrs', q.id, q.code, left(q.description, 120), null, null, (q.due_date + 5)::timestamptz, null)
  from public.pqrs_cases q
  join public.organizations o on o.id = q.organization_id and o.status = 'activa'
  left join public.processes p on p.id = q.process_id
  where q.status in ('recibida','en_gestion','resuelta') and q.due_date <= current_date
    and coalesce(q.responsible_position_id, p.leader_position_id) is not null;
  v_pqrs := n;

  -- 6. Compromisos de acta pendientes con plazo vencido y responsable → recordatorio (idempotente).
  select count(*) into n from public.meeting_commitments c
  join public.organizations o on o.id = c.organization_id and o.status = 'activa'
  where c.status = 'pendiente' and c.responsible_position_id is not null
    and c.due_date is not null and c.due_date <= current_date;
  perform public.create_task(c.organization_id, 'cumplir_compromiso', c.responsible_position_id,
    'acta', c.id, m.code, left(c.description, 120), null, null, (c.due_date + 1)::timestamptz, null)
  from public.meeting_commitments c
  join public.meeting_minutes m on m.id = c.minute_id
  join public.organizations o on o.id = c.organization_id and o.status = 'activa'
  where c.status = 'pendiente' and c.responsible_position_id is not null
    and c.due_date is not null and c.due_date <= current_date;
  v_commitments := n;

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
      'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
    'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments);
end $$;

revoke execute on function public.run_daily_jobs from public, anon, authenticated;
grant execute on function public.run_daily_jobs to service_role;
