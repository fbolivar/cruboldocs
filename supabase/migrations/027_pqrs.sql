-- 027 — Módulo PQRS y satisfacción del cliente (ISO 9001 9.1.2). Arquitectura: docs/pqrs/ARQUITECTURA.md,
-- ADR-028..031. Patrón espejo de los módulos 1–6: RLS solo-SELECT por organization_id + escritura por RPC
-- SECURITY DEFINER con search_path='' y autorización interna por rol; FKs compuestas (id, organization_id).
-- Un RECLAMO genera una NC con un clic reutilizando report_nonconformity(source='queja_pqrs') (ya en el enum).
-- Dato personal del cliente (Ley 1581): minimización + RLS. Adjuntos en Storage DIFERIDOS (ADR-031).
-- NOTA: aplicada por fragmentos (el guard del MCP rechaza DROP, el texto 'delete' y migraciones grandes);
-- este archivo es el SQL final consolidado.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.pqrs_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  type text not null check (type in ('peticion','queja','reclamo','sugerencia','felicitacion')),
  channel text not null check (channel in ('correo','telefono','web','presencial','otro')),
  customer_name text,
  customer_contact text,
  process_id uuid,
  description text not null check (length(trim(description)) between 5 and 4000),
  received_date date not null,
  due_date date not null,
  status text not null default 'recibida' check (status in ('recibida','en_gestion','resuelta','cerrada','anulada')),
  responsible_position_id uuid,
  response text,
  satisfied boolean,
  nonconformity_id uuid,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id)
);

create table public.satisfaction_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  period date not null,
  method text not null check (method in ('encuesta','nps','csat','otro')),
  score numeric(5,2) not null check (score between 0 and 100),
  responses int,
  note text,
  measured_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, period, method),
  unique (id, organization_id)
);

create table public.pqrs_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.pqrs_cases (organization_id, status);
create index on public.pqrs_cases (process_id, organization_id);
create index on public.pqrs_cases (responsible_position_id, organization_id);
create index on public.pqrs_cases (nonconformity_id, organization_id);
create index on public.satisfaction_measurements (organization_id, period desc);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_pqrs(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_pqrs(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_pqrs, public.can_manage_pqrs from public, anon;
grant execute on function public.can_see_pqrs, public.can_manage_pqrs to authenticated;

alter table public.pqrs_cases enable row level security;
alter table public.satisfaction_measurements enable row level security;
alter table public.pqrs_counters enable row level security; -- deny-all

create policy pqrs_select on public.pqrs_cases for select to authenticated
  using (public.can_see_pqrs(organization_id));
create policy satisfaction_select on public.satisfaction_measurements for select to authenticated
  using (public.can_see_pqrs(organization_id));

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.create_pqrs(
  p_org uuid, p_type text, p_channel text, p_customer_name text, p_customer_contact text,
  p_process uuid, p_description text, p_received date, p_due_days int
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_pqrs(p_org, p_process) then
    raise exception 'No puedes registrar PQRS' using errcode = '42501';
  end if;
  v_year := extract(year from coalesce(p_received, current_date))::int;
  insert into public.pqrs_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.pqrs_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'PQRS-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.pqrs_cases (organization_id, code, type, channel, customer_name, customer_contact,
    process_id, description, received_date, due_date, status, created_by)
  values (p_org, v_code, p_type, p_channel, nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_contact, '')), ''), p_process, trim(p_description),
    p_received, p_received + coalesce(p_due_days, 15), 'recibida', auth.uid())
  returning pqrs_cases.id into v_id;

  perform public.log_event(p_org, 'crear_pqrs', 'PQRS', v_id, v_code, jsonb_build_object('tipo', p_type));
  return query select v_id, v_code;
end $$;

create or replace function public.pqrs_or_fail(p_case uuid) returns public.pqrs_cases
language plpgsql stable security definer set search_path = '' as $$
declare c public.pqrs_cases;
begin
  select * into c from public.pqrs_cases where id = p_case;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'PQRS no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return c;
end $$;

create or replace function public.update_pqrs(
  p_case uuid, p_type text, p_channel text, p_customer_name text, p_customer_contact text,
  p_process uuid, p_description text, p_received date, p_due date
) returns void language plpgsql security definer set search_path = '' as $$
declare c public.pqrs_cases;
begin
  c := public.pqrs_or_fail(p_case);
  if not public.can_manage_pqrs(c.organization_id, c.process_id) then
    raise exception 'No puedes editar esta PQRS' using errcode = '42501';
  end if;
  if c.status in ('cerrada','anulada') then
    raise exception 'La PQRS ya no es editable' using errcode = '22023';
  end if;
  update public.pqrs_cases set
    type = p_type, channel = p_channel, customer_name = nullif(trim(coalesce(p_customer_name, '')), ''),
    customer_contact = nullif(trim(coalesce(p_customer_contact, '')), ''), process_id = p_process,
    description = trim(p_description), received_date = p_received, due_date = p_due, updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'editar_pqrs', 'PQRS', c.id, c.code, '{}');
end $$;

create or replace function public.manage_pqrs(
  p_case uuid, p_responsible uuid, p_process uuid, p_status text
) returns void language plpgsql security definer set search_path = '' as $$
declare c public.pqrs_cases;
begin
  c := public.pqrs_or_fail(p_case);
  if not public.can_manage_pqrs(c.organization_id, c.process_id) then
    raise exception 'No puedes gestionar esta PQRS' using errcode = '42501';
  end if;
  if c.status in ('cerrada','anulada') then
    raise exception 'La PQRS ya no es editable' using errcode = '22023';
  end if;
  if p_status not in ('recibida','en_gestion','resuelta') then
    raise exception 'Estado no válido para gestión' using errcode = '22023';
  end if;
  update public.pqrs_cases set
    responsible_position_id = p_responsible, process_id = coalesce(p_process, process_id),
    status = p_status, updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'gestionar_pqrs', 'PQRS', c.id, c.code, jsonb_build_object('estado', p_status));
end $$;

create or replace function public.respond_pqrs(p_case uuid, p_response text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.pqrs_cases;
begin
  c := public.pqrs_or_fail(p_case);
  if not public.can_manage_pqrs(c.organization_id, c.process_id) then
    raise exception 'No puedes responder esta PQRS' using errcode = '42501';
  end if;
  if c.status in ('cerrada','anulada') then
    raise exception 'La PQRS ya no es editable' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_response, '')), '') is null then
    raise exception 'Escribe la respuesta al cliente' using errcode = '22023';
  end if;
  update public.pqrs_cases set
    response = trim(p_response),
    status = case when status = 'recibida' then 'en_gestion' else status end,
    updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'responder_pqrs', 'PQRS', c.id, c.code, '{}');
end $$;

create or replace function public.close_pqrs(p_case uuid, p_satisfied boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.pqrs_cases;
begin
  c := public.pqrs_or_fail(p_case);
  if not public.can_manage_pqrs(c.organization_id, c.process_id) then
    raise exception 'No puedes cerrar esta PQRS' using errcode = '42501';
  end if;
  if c.status not in ('recibida','en_gestion','resuelta') then
    raise exception 'La PQRS ya no es editable' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(c.response, '')), '') is null then
    raise exception 'Registra la respuesta antes de cerrar' using errcode = '22023';
  end if;
  update public.pqrs_cases set status = 'cerrada', satisfied = p_satisfied, updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'cerrar_pqrs', 'PQRS', c.id, c.code, jsonb_build_object('conforme', p_satisfied));
end $$;

create or replace function public.cancel_pqrs(p_case uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.pqrs_cases;
begin
  c := public.pqrs_or_fail(p_case);
  if not public.can_manage_pqrs(c.organization_id, c.process_id) then
    raise exception 'No puedes anular esta PQRS' using errcode = '42501';
  end if;
  if c.status not in ('recibida','en_gestion','resuelta') then
    raise exception 'La PQRS ya no es editable' using errcode = '22023';
  end if;
  update public.pqrs_cases set status = 'anulada', updated_at = now() where id = c.id;
  perform public.log_event(c.organization_id, 'anular_pqrs', 'PQRS', c.id, c.code, jsonb_build_object('motivo', nullif(trim(coalesce(p_reason, '')), '')));
end $$;

/** Un reclamo genera una NC (10.2) reutilizando report_nonconformity(source='queja_pqrs'). Idempotente. */
create or replace function public.generate_nc_from_pqrs(p_case uuid) returns table (code text)
language plpgsql security definer set search_path = '' as $$
declare c public.pqrs_cases; v_nc_id uuid; v_nc_code text;
begin
  select * into c from public.pqrs_cases where id = p_case for update;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'PQRS no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_pqrs(c.organization_id, c.process_id) then
    raise exception 'No puedes generar la no conformidad' using errcode = '42501';
  end if;
  if c.type <> 'reclamo' then
    raise exception 'Solo un reclamo genera no conformidad' using errcode = '22023';
  end if;
  if c.nonconformity_id is not null then
    raise exception 'Esta PQRS ya tiene una no conformidad' using errcode = '22023';
  end if;
  select n.id, n.code into v_nc_id, v_nc_code
  from public.report_nonconformity(c.organization_id, 'queja_pqrs', c.process_id,
    left(c.description, 110), c.description, 'mayor') n;
  update public.pqrs_cases set nonconformity_id = v_nc_id, updated_at = now() where id = c.id;
  perform public.log_event(c.organization_id, 'generar_nc_pqrs', 'PQRS', c.id, c.code, jsonb_build_object('nc', v_nc_code));
  return query select v_nc_code;
end $$;

/** Satisfacción de la organización (no por caso). Upsert por periodo+método; score 0–100. */
create or replace function public.record_satisfaction(
  p_org uuid, p_period date, p_method text, p_score numeric, p_responses int, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_score numeric(5,2);
begin
  if not public.can_manage_pqrs(p_org, null) then
    raise exception 'No puedes registrar la satisfacción' using errcode = '42501';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'El puntaje de satisfacción va de 0 a 100' using errcode = '22023';
  end if;
  v_score := round(p_score, 2);
  insert into public.satisfaction_measurements (organization_id, period, method, score, responses, note, measured_by)
  values (p_org, p_period, p_method, v_score, p_responses, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  on conflict (organization_id, period, method) do update
    set score = excluded.score, responses = excluded.responses, note = excluded.note, measured_by = excluded.measured_by
  returning id into v_id;
  perform public.log_event(p_org, 'registrar_satisfaccion', 'PQRS', v_id, to_char(p_period, 'YYYY-MM'),
    jsonb_build_object('metodo', p_method, 'puntaje', v_score));
  return v_id;
end $$;

revoke execute on function public.pqrs_or_fail from public, anon, authenticated;
revoke execute on function public.create_pqrs, public.update_pqrs, public.manage_pqrs, public.respond_pqrs,
  public.close_pqrs, public.cancel_pqrs, public.generate_nc_from_pqrs, public.record_satisfaction from public, anon;
grant execute on function public.create_pqrs, public.update_pqrs, public.manage_pqrs, public.respond_pqrs,
  public.close_pqrs, public.cancel_pqrs, public.generate_nc_from_pqrs, public.record_satisfaction to authenticated;

-- ---------------------------------------------------------------------------
-- Bandeja: recordatorio de vencimiento del plazo (ADR-030) + job diario
-- ---------------------------------------------------------------------------

alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion', 'cerrar_brecha', 'reevaluar_proveedor', 'atender_pqrs'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria',
  'indicador', 'competencia', 'proveedor', 'pqrs'));

-- El job diario crea la tarea 'atender_pqrs' para casos abiertos con due_date vencida, asignada al
-- responsable del caso o, si no tiene, al líder del proceso. Casos sin responsable ni líder no generan tarea.
create or replace function public.run_daily_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; v_pqrs int := 0; n int;
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

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
      'proveedores', v_suppliers, 'pqrs', v_pqrs), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
    'proveedores', v_suppliers, 'pqrs', v_pqrs);
end $$;

revoke execute on function public.run_daily_jobs from public, anon, authenticated;
grant execute on function public.run_daily_jobs to service_role;
