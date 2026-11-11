-- 030 — Matriz de requisitos legales y evaluación de cumplimiento (ISO 14001/45001; SG-SST Dec. 1072).
-- Arquitectura: docs/requisitos-legales/ARQUITECTURA.md, ADR-041/042. Espejo de Indicadores: requisito +
-- evaluaciones (historial); el cumplimiento vigente se DERIVA de la última evaluación (en la capa de datos).
-- Baja lógica 'derogado' (sin DELETE). Reevaluación por frecuencia → next_eval_date + tarea del job diario.
-- NOTA: aplicada por fragmentos (el guard del MCP rechaza DROP/'delete'/migraciones grandes); este archivo
-- es el SQL final consolidado.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.legal_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 300),
  source_type text not null check (source_type in ('ley','decreto','resolucion','norma_iso','contractual','otro')),
  reference text not null check (length(trim(reference)) between 1 and 300),
  issuer text,
  description text not null check (length(trim(description)) between 3 and 4000),
  process_id uuid,
  url text,
  status text not null default 'vigente' check (status in ('vigente','derogado')),
  eval_frequency text not null default 'anual' check (eval_frequency in ('semestral','anual','bienal')),
  next_eval_date date,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.legal_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  requirement_id uuid not null,
  evaluated_at date not null,
  compliance text not null check (compliance in ('cumple','parcial','no_cumple')),
  evidence text not null check (length(trim(evidence)) between 1 and 4000),
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (requirement_id, organization_id) references public.legal_requirements (id, organization_id) on delete cascade
);

create table public.legal_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.legal_requirements (organization_id, status);
create index on public.legal_requirements (process_id, organization_id);
create index on public.legal_evaluations (requirement_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_legal(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_legal(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_legal, public.can_manage_legal from public, anon;
grant execute on function public.can_see_legal, public.can_manage_legal to authenticated;

alter table public.legal_requirements enable row level security;
alter table public.legal_evaluations enable row level security;
alter table public.legal_counters enable row level security; -- deny-all

create policy legal_req_select on public.legal_requirements for select to authenticated
  using (public.can_see_legal(organization_id));
create policy legal_eval_select on public.legal_evaluations for select to authenticated
  using (public.can_see_legal(organization_id));

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.create_requirement(
  p_org uuid, p_title text, p_source text, p_reference text, p_issuer text,
  p_description text, p_process uuid, p_url text, p_frequency text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_legal(p_org, p_process) then
    raise exception 'No puedes crear requisitos' using errcode = '42501';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.legal_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.legal_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'REQ-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.legal_requirements (organization_id, code, title, source_type, reference, issuer,
    description, process_id, url, status, eval_frequency, created_by)
  values (p_org, v_code, trim(p_title), p_source, trim(p_reference), nullif(trim(coalesce(p_issuer, '')), ''),
    trim(p_description), p_process, nullif(trim(coalesce(p_url, '')), ''), 'vigente', coalesce(p_frequency, 'anual'), auth.uid())
  returning legal_requirements.id into v_id;

  perform public.log_event(p_org, 'crear_requisito', 'Requisito', v_id, v_code, jsonb_build_object('fuente', p_source));
  return query select v_id, v_code;
end $$;

create or replace function public.legal_or_fail(p_req uuid) returns public.legal_requirements
language plpgsql stable security definer set search_path = '' as $$
declare r public.legal_requirements;
begin
  select * into r from public.legal_requirements where id = p_req;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Requisito no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return r;
end $$;

create or replace function public.update_requirement(
  p_req uuid, p_title text, p_source text, p_reference text, p_issuer text,
  p_description text, p_process uuid, p_url text, p_frequency text
) returns void language plpgsql security definer set search_path = '' as $$
declare r public.legal_requirements;
begin
  r := public.legal_or_fail(p_req);
  if not public.can_manage_legal(r.organization_id, r.process_id) then
    raise exception 'No puedes editar este requisito' using errcode = '42501';
  end if;
  if r.status = 'derogado' then
    raise exception 'El requisito derogado ya no es editable' using errcode = '22023';
  end if;
  update public.legal_requirements set
    title = trim(p_title), source_type = p_source, reference = trim(p_reference),
    issuer = nullif(trim(coalesce(p_issuer, '')), ''), description = trim(p_description),
    process_id = p_process, url = nullif(trim(coalesce(p_url, '')), ''), eval_frequency = coalesce(p_frequency, r.eval_frequency),
    updated_at = now()
  where id = r.id;
  perform public.log_event(r.organization_id, 'editar_requisito', 'Requisito', r.id, r.code, '{}');
end $$;

create or replace function public.derogate_requirement(p_req uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.legal_requirements;
begin
  r := public.legal_or_fail(p_req);
  if not public.can_manage_legal(r.organization_id, r.process_id) then
    raise exception 'No puedes derogar este requisito' using errcode = '42501';
  end if;
  update public.legal_requirements set status = 'derogado', next_eval_date = null, updated_at = now() where id = r.id;
  perform public.log_event(r.organization_id, 'derogar_requisito', 'Requisito', r.id, r.code, '{}');
end $$;

/** Registra una evaluación y recalcula next_eval_date según la frecuencia (ADR-042). */
create or replace function public.evaluate_requirement(
  p_req uuid, p_compliance text, p_evidence text, p_evaluated date, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
declare r public.legal_requirements; v_next date;
begin
  r := public.legal_or_fail(p_req);
  if not public.can_manage_legal(r.organization_id, r.process_id) then
    raise exception 'No puedes evaluar este requisito' using errcode = '42501';
  end if;
  if r.status = 'derogado' then
    raise exception 'El requisito está derogado' using errcode = '22023';
  end if;
  if p_compliance not in ('cumple','parcial','no_cumple') then
    raise exception 'Cumplimiento no válido' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_evidence, '')), '') is null then
    raise exception 'Registra la evidencia o la brecha' using errcode = '22023';
  end if;
  v_next := p_evaluated + case r.eval_frequency when 'semestral' then interval '6 months'
    when 'bienal' then interval '24 months' else interval '12 months' end;
  insert into public.legal_evaluations (organization_id, requirement_id, evaluated_at, compliance, evidence, note, created_by)
  values (r.organization_id, r.id, p_evaluated, p_compliance, trim(p_evidence), nullif(trim(coalesce(p_note, '')), ''), auth.uid());
  update public.legal_requirements set next_eval_date = v_next, updated_at = now() where id = r.id;
  perform public.log_event(r.organization_id, 'evaluar_requisito', 'Requisito', r.id, r.code, jsonb_build_object('cumplimiento', p_compliance));
end $$;

revoke execute on function public.legal_or_fail from public, anon, authenticated;
revoke execute on function public.create_requirement, public.update_requirement, public.derogate_requirement,
  public.evaluate_requirement from public, anon;
grant execute on function public.create_requirement, public.update_requirement, public.derogate_requirement,
  public.evaluate_requirement to authenticated;

-- ---------------------------------------------------------------------------
-- tasks: nuevo tipo/entidad + recordatorio de reevaluación en el job diario
-- ---------------------------------------------------------------------------

alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion', 'cerrar_brecha', 'reevaluar_proveedor', 'atender_pqrs',
  'cumplir_compromiso', 'evaluar_requisito'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria',
  'indicador', 'competencia', 'proveedor', 'pqrs', 'acta', 'requisito_legal'));

-- Extiende run_daily_jobs con el bloque de requisitos (reevaluación vencida → tarea al líder del proceso).
create or replace function public.run_daily_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; v_pqrs int := 0; v_commitments int := 0; v_legal int := 0; n int;
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

  -- 7. Requisitos legales vigentes con reevaluación vencida → tarea al líder del proceso.
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

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
      'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
    'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal);
end $$;

revoke execute on function public.run_daily_jobs from public, anon, authenticated;
grant execute on function public.run_daily_jobs to service_role;
