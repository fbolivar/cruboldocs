-- 058 — Gestión de incidentes/accidentes SST (v1.6-2). Arquitectura: docs/incidentes/ARQUITECTURA.md,
-- ADR-118/119/120. El incidente es el frente SST (clasificación + trabajador, dato sensible minimizado);
-- la investigación (causa raíz 5 Porqués/Ishikawa + plan de acción) se delega a una NC generada
-- ('incidente_sst'), reutilizando RCA (055) y nc_actions (017). Reportar: cualquier miembro activo
-- (ADR-119). Gestionar/investigar/cerrar: can_manage_sst. Accidente: plazo legal 15 días (Res. 1401).

-- 058a · Tabla, contador y RLS (reusa can_see_sst / can_manage_sst de 035)
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  kind text not null check (kind in ('accidente', 'incidente', 'casi_accidente')),
  occurred_at timestamptz not null default now(),
  location text,
  process_id uuid,
  hazard_id uuid,
  description text not null check (length(trim(description)) between 3 and 4000),
  immediate_action text,
  severity text not null default 'sin_lesion' check (severity in ('sin_lesion', 'leve', 'grave', 'mortal')),
  affected_name text,          -- dato personal sensible (salud): minimizado
  affected_document text,
  affected_position_id uuid,
  injury text,
  body_part text,
  lost_days int check (lost_days is null or lost_days >= 0),
  status text not null default 'reportado' check (status in ('reportado', 'en_investigacion', 'cerrado', 'anulado')),
  investigated_by_position_id uuid,
  investigation_due date,
  investigated_at timestamptz,
  closed_at timestamptz,
  nonconformity_id uuid,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id) on delete set null,
  foreign key (hazard_id, organization_id) references public.hazards (id, organization_id) on delete set null,
  foreign key (affected_position_id, organization_id) references public.positions (id, organization_id) on delete set null,
  foreign key (investigated_by_position_id, organization_id) references public.positions (id, organization_id) on delete set null,
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id) on delete set null
);
create index on public.incidents (organization_id);
create index on public.incidents (organization_id, status);

create table public.inc_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

alter table public.incidents enable row level security;
alter table public.inc_counters enable row level security; -- deny-all

create policy incident_select on public.incidents for select to authenticated using (public.can_see_sst(organization_id));
-- inc_counters: sin política = deny-all.

grant select on public.incidents to authenticated;

-- 058b · RPCs de reporte / edición / investigación
create or replace function public.incident_or_fail(p_incident uuid) returns public.incidents
language plpgsql security definer set search_path = '' as $$
declare i public.incidents;
begin
  select * into i from public.incidents where id = p_incident;
  if i.id is null then
    raise exception 'Incidente no encontrado' using errcode = 'P0002';
  end if;
  return i;
end $$;

-- Reportar: cualquier miembro activo (ADR-119). Accidente fija el plazo legal de 15 días (Res. 1401).
create or replace function public.report_incident(
  p_org uuid, p_kind text, p_occurred_at timestamptz, p_location text, p_process uuid, p_hazard uuid,
  p_description text, p_immediate_action text, p_severity text,
  p_affected_name text, p_affected_document text, p_affected_position uuid,
  p_injury text, p_body_part text, p_lost_days int
) returns table (code text) language plpgsql security definer set search_path = '' as $$
declare v_year int; v_seq int; v_code text; v_id uuid; v_occurred timestamptz; v_due date;
begin
  if not public.is_active_member(p_org) then
    raise exception 'No perteneces a esta organización' using errcode = '42501';
  end if;
  if p_kind <> all (array['accidente', 'incidente', 'casi_accidente']) then
    raise exception 'Tipo de incidente no válido' using errcode = '22023';
  end if;
  if p_severity <> all (array['sin_lesion', 'leve', 'grave', 'mortal']) then
    raise exception 'Severidad no válida' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_description, ''))) < 3 then
    raise exception 'La descripción es obligatoria' using errcode = '22023';
  end if;
  v_occurred := coalesce(p_occurred_at, now());
  v_due := case when p_kind = 'accidente' then (v_occurred::date + 15) else null end;
  v_year := extract(year from current_date)::int;
  insert into public.inc_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.inc_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'INC-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.incidents (
    organization_id, code, kind, occurred_at, location, process_id, hazard_id, description,
    immediate_action, severity, affected_name, affected_document, affected_position_id,
    injury, body_part, lost_days, investigation_due)
  values (
    p_org, v_code, p_kind, v_occurred, nullif(trim(coalesce(p_location, '')), ''), p_process, p_hazard,
    trim(p_description), nullif(trim(coalesce(p_immediate_action, '')), ''), p_severity,
    nullif(trim(coalesce(p_affected_name, '')), ''), nullif(trim(coalesce(p_affected_document, '')), ''),
    p_affected_position, nullif(trim(coalesce(p_injury, '')), ''), nullif(trim(coalesce(p_body_part, '')), ''),
    p_lost_days, v_due)
  returning id into v_id;
  perform public.log_event(p_org, 'reportar_incidente', 'Incidente', v_id, v_code,
    jsonb_build_object('tipo', p_kind, 'severidad', p_severity));
  return query select v_code;
end $$;

-- Editar los datos de la ocurrencia (no cambia estado ni código). Gestiona SST.
create or replace function public.update_incident(
  p_incident uuid, p_kind text, p_occurred_at timestamptz, p_location text, p_process uuid, p_hazard uuid,
  p_description text, p_immediate_action text, p_severity text,
  p_affected_name text, p_affected_document text, p_affected_position uuid,
  p_injury text, p_body_part text, p_lost_days int
) returns void language plpgsql security definer set search_path = '' as $$
declare i public.incidents;
begin
  i := public.incident_or_fail(p_incident);
  if not public.can_manage_sst(i.organization_id) then
    raise exception 'No puedes gestionar incidentes' using errcode = '42501';
  end if;
  if i.status in ('cerrado', 'anulado') then
    raise exception 'El incidente ya está cerrado' using errcode = '22023';
  end if;
  if p_kind <> all (array['accidente', 'incidente', 'casi_accidente']) then
    raise exception 'Tipo de incidente no válido' using errcode = '22023';
  end if;
  if p_severity <> all (array['sin_lesion', 'leve', 'grave', 'mortal']) then
    raise exception 'Severidad no válida' using errcode = '22023';
  end if;
  update public.incidents set
    kind = p_kind, occurred_at = coalesce(p_occurred_at, occurred_at),
    location = nullif(trim(coalesce(p_location, '')), ''), process_id = p_process, hazard_id = p_hazard,
    description = trim(p_description), immediate_action = nullif(trim(coalesce(p_immediate_action, '')), ''),
    severity = p_severity, affected_name = nullif(trim(coalesce(p_affected_name, '')), ''),
    affected_document = nullif(trim(coalesce(p_affected_document, '')), ''), affected_position_id = p_affected_position,
    injury = nullif(trim(coalesce(p_injury, '')), ''), body_part = nullif(trim(coalesce(p_body_part, '')), ''),
    lost_days = p_lost_days,
    investigation_due = case when p_kind = 'accidente' then coalesce(investigation_due, (coalesce(p_occurred_at, occurred_at)::date + 15)) else investigation_due end,
    updated_at = now()
  where id = i.id;
  perform public.log_event(i.organization_id, 'editar_incidente', 'Incidente', i.id, i.code);
end $$;

-- Asignar investigador y fecha de investigación → en_investigacion. Gestiona SST.
create or replace function public.set_incident_investigation(p_incident uuid, p_investigator uuid, p_investigated_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.incidents;
begin
  i := public.incident_or_fail(p_incident);
  if not public.can_manage_sst(i.organization_id) then
    raise exception 'No puedes gestionar incidentes' using errcode = '42501';
  end if;
  if i.status in ('cerrado', 'anulado') then
    raise exception 'El incidente ya está cerrado' using errcode = '22023';
  end if;
  update public.incidents set
    investigated_by_position_id = p_investigator,
    investigated_at = coalesce(p_investigated_at, now()),
    status = 'en_investigacion', updated_at = now()
  where id = i.id;
  perform public.log_event(i.organization_id, 'investigar_incidente', 'Incidente', i.id, i.code);
end $$;

revoke execute on function public.incident_or_fail(uuid) from public, anon;
grant execute on function public.incident_or_fail(uuid) to authenticated;
revoke execute on function public.report_incident(uuid, text, timestamptz, text, uuid, uuid, text, text, text, text, text, uuid, text, text, int) from public, anon;
grant execute on function public.report_incident(uuid, text, timestamptz, text, uuid, uuid, text, text, text, text, text, uuid, text, text, int) to authenticated;
revoke execute on function public.update_incident(uuid, text, timestamptz, text, uuid, uuid, text, text, text, text, text, uuid, text, text, int) from public, anon;
grant execute on function public.update_incident(uuid, text, timestamptz, text, uuid, uuid, text, text, text, text, text, uuid, text, text, int) to authenticated;
revoke execute on function public.set_incident_investigation(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.set_incident_investigation(uuid, uuid, timestamptz) to authenticated;

-- 058c · Investigación vía NC + cierre/anulación + nuevo origen de NC
alter table public.nonconformities drop constraint nonconformities_source_check;
alter table public.nonconformities add constraint nonconformities_source_check check (source in (
  'auditoria_interna', 'auditoria_externa', 'queja_pqrs', 'producto_servicio',
  'riesgo_materializado', 'mejora', 'indicador', 'incidente_sst', 'otro'));

-- Generar la NC de investigación (idempotente). La causa raíz y las acciones viven en la NC.
create or replace function public.generate_nc_from_incident(p_incident uuid)
returns table (code text) language plpgsql security definer set search_path = '' as $$
declare i public.incidents; v_nc uuid; v_code text; v_sev text;
begin
  select * into i from public.incidents where id = p_incident for update;
  if i.id is null or not public.can_manage_sst(i.organization_id) then
    raise exception 'Incidente no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if i.status = 'anulado' then
    raise exception 'El incidente está anulado' using errcode = '22023';
  end if;
  if i.nonconformity_id is not null then
    raise exception 'Este incidente ya tiene una no conformidad' using errcode = '22023';
  end if;
  v_sev := case i.severity when 'mortal' then 'mayor' when 'grave' then 'mayor' when 'leve' then 'menor' else 'observacion' end;
  select id into v_nc from public.report_nonconformity(i.organization_id, 'incidente_sst', i.process_id,
    left('Incidente ' || i.code || ' — investigación SST', 110),
    i.description, v_sev, i.occurred_at::date, null);
  update public.incidents set nonconformity_id = v_nc,
    status = case when status = 'reportado' then 'en_investigacion' else status end, updated_at = now()
  where id = i.id;
  select n.code into v_code from public.nonconformities n where n.id = v_nc;
  perform public.log_event(i.organization_id, 'generar_nc_incidente', 'Incidente', i.id, i.code);
  return query select v_code;
end $$;

-- Cerrar: exige investigación registrada; el accidente exige además NC (investigación obligatoria).
create or replace function public.close_incident(p_incident uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.incidents;
begin
  i := public.incident_or_fail(p_incident);
  if not public.can_manage_sst(i.organization_id) then
    raise exception 'No puedes gestionar incidentes' using errcode = '42501';
  end if;
  if i.status in ('cerrado', 'anulado') then
    raise exception 'El incidente ya está cerrado' using errcode = '22023';
  end if;
  if i.investigated_at is null then
    raise exception 'Registra la investigación antes de cerrar' using errcode = '22023';
  end if;
  if i.kind = 'accidente' and i.nonconformity_id is null then
    raise exception 'Un accidente exige generar la no conformidad de investigación antes de cerrar' using errcode = '22023';
  end if;
  update public.incidents set status = 'cerrado', closed_at = now(), updated_at = now() where id = i.id;
  perform public.log_event(i.organization_id, 'cerrar_incidente', 'Incidente', i.id, i.code);
end $$;

create or replace function public.cancel_incident(p_incident uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.incidents;
begin
  i := public.incident_or_fail(p_incident);
  if not public.can_manage_sst(i.organization_id) then
    raise exception 'No puedes gestionar incidentes' using errcode = '42501';
  end if;
  if i.status in ('cerrado', 'anulado') then
    raise exception 'El incidente ya está cerrado' using errcode = '22023';
  end if;
  update public.incidents set status = 'anulado', updated_at = now() where id = i.id;
  perform public.log_event(i.organization_id, 'anular_incidente', 'Incidente', i.id, i.code,
    jsonb_build_object('motivo', nullif(trim(coalesce(p_reason, '')), '')));
end $$;

revoke execute on function public.generate_nc_from_incident(uuid), public.close_incident(uuid), public.cancel_incident(uuid, text) from public, anon;
grant execute on function public.generate_nc_from_incident(uuid), public.close_incident(uuid), public.cancel_incident(uuid, text) to authenticated;

-- 058d · Recordatorio del plazo legal de investigación (accidentes) en el job diario
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type = any (array[
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura', 'ejecutar_control',
  'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc', 'conducir_auditoria',
  'capturar_medicion', 'cerrar_brecha', 'reevaluar_proveedor', 'atender_pqrs', 'cumplir_compromiso',
  'evaluar_requisito', 'revisar_aspecto', 'cumplir_mejora_sst', 'calibrar_equipo', 'aprobar_solicitud',
  'investigar_incidente']));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type = any (array[
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria', 'indicador',
  'competencia', 'proveedor', 'pqrs', 'acta', 'requisito_legal', 'aspecto_ambiental', 'sst', 'equipo', 'incidente']));

create or replace function public.run_daily_jobs()
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; v_pqrs int := 0; v_commitments int := 0; v_legal int := 0; v_sst int := 0; v_metrology int := 0; v_incidents int := 0; n int;
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

  select count(*) into n from public.legal_requirements lr
  join public.processes p on p.id = lr.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = lr.organization_id and o.status = 'activa'
  where lr.status = 'vigente' and lr.next_eval_date is not null and lr.next_eval_date <= current_date;
  perform public.create_task(lr.organization_id, 'evaluar_requisito', p.leader_position_id,
    'requisito_legal', lr.id, lr.code, left(lr.title, 120), null, null, (lr.next_eval_date + 15)::timestamptz, null)
  from public.legal_requirements lr
  join public.processes p on p.id = lr.process_id and p.leader_position_id is not null
  join public.organizations o on o.id = lr.organization_id and o.status = 'activa'
  where lr.status = 'vigente' and lr.next_eval_date is not null and lr.next_eval_date <= current_date;
  v_legal := n;

  select count(*) into n from public.sst_actions a
  join public.sst_evaluations e on e.id = a.evaluation_id
  join public.organizations o on o.id = a.organization_id and o.status = 'activa'
  where a.status in ('pendiente','en_curso') and a.responsible_position_id is not null
    and a.due_date is not null and a.due_date <= current_date;
  perform public.create_task(a.organization_id, 'cumplir_mejora_sst', a.responsible_position_id,
    'sst', a.id, e.code, left(a.description, 120), null, null, (a.due_date + 1)::timestamptz, null)
  from public.sst_actions a
  join public.sst_evaluations e on e.id = a.evaluation_id
  join public.organizations o on o.id = a.organization_id and o.status = 'activa'
  where a.status in ('pendiente','en_curso') and a.responsible_position_id is not null
    and a.due_date is not null and a.due_date <= current_date;
  v_sst := n;

  select count(*) into n from public.measurement_equipment eq
  join public.organizations o on o.id = eq.organization_id and o.status = 'activa'
  left join public.processes p on p.id = eq.process_id
  where eq.status = 'vigente' and eq.next_due_date is not null and eq.next_due_date <= current_date
    and coalesce(eq.responsible_position_id, p.leader_position_id) is not null;
  perform public.create_task(eq.organization_id, 'calibrar_equipo', coalesce(eq.responsible_position_id, p.leader_position_id),
    'equipo', eq.id, eq.code, eq.name, null, null, (eq.next_due_date + 15)::timestamptz, null)
  from public.measurement_equipment eq
  join public.organizations o on o.id = eq.organization_id and o.status = 'activa'
  left join public.processes p on p.id = eq.process_id
  where eq.status = 'vigente' and eq.next_due_date is not null and eq.next_due_date <= current_date
    and coalesce(eq.responsible_position_id, p.leader_position_id) is not null;
  v_metrology := n;

  -- Investigación de accidentes vencida (Res. 1401, 15 días). Asigna al investigador o al líder del proceso.
  select count(*) into n from public.incidents inc
  join public.organizations o on o.id = inc.organization_id and o.status = 'activa'
  left join public.processes p on p.id = inc.process_id
  where inc.kind = 'accidente' and inc.status in ('reportado','en_investigacion')
    and inc.investigation_due is not null and inc.investigation_due <= current_date
    and coalesce(inc.investigated_by_position_id, p.leader_position_id) is not null;
  perform public.create_task(inc.organization_id, 'investigar_incidente', coalesce(inc.investigated_by_position_id, p.leader_position_id),
    'incidente', inc.id, inc.code, left(inc.description, 120), null, null, (inc.investigation_due + 1)::timestamptz, null)
  from public.incidents inc
  join public.organizations o on o.id = inc.organization_id and o.status = 'activa'
  left join public.processes p on p.id = inc.process_id
  where inc.kind = 'accidente' and inc.status in ('reportado','en_investigacion')
    and inc.investigation_due is not null and inc.investigation_due <= current_date
    and coalesce(inc.investigated_by_position_id, p.leader_position_id) is not null;
  v_incidents := n;

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
      'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal,
      'sst', v_sst, 'metrologia', v_metrology, 'incidentes', v_incidents), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
    'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal,
    'sst', v_sst, 'metrologia', v_metrology, 'incidentes', v_incidents);
end $function$;
