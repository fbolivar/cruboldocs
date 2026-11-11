-- 035 — SG-SST: Autoevaluación de Estándares Mínimos (Resolución 0312 de 2019). Arquitectura:
-- docs/sst/ARQUITECTURA.md, ADR-054/055. Catálogo nacional de estándares (global, solo lectura),
-- autoevaluación por período con nivel 7/21/60 según tamaño y clase de riesgo, puntaje y valoración
-- (art. 28) calculados en el servidor, y plan de mejoramiento por ítem incumplido con recordatorios
-- por el cron. NOTA: aplicada por fragmentos; este archivo es el SQL final consolidado.
-- Pesos weight_60 = tabla oficial (verificada, suma 100). weight_7/weight_21 = PROVISIONALES
-- (aplicabilidad correcta; valores a confirmar con el Anexo oficial), cada nivel suma 100.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.sst_standards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  cycle text not null check (cycle in ('planear','hacer','verificar','actuar')),
  component text not null check (component in ('recursos','gestion_integral','gestion_salud','peligros_riesgos','gestion_amenazas','verificacion','mejoramiento')),
  order_index int not null default 0,
  weight_7 numeric(5,2),
  weight_21 numeric(5,2),
  weight_60 numeric(5,2),
  is_active boolean not null default true
);

create table public.sst_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  period int not null check (period between 2019 and 2100),
  worker_count int not null check (worker_count >= 1),
  risk_class int not null check (risk_class between 1 and 5),
  tier int not null check (tier in (7, 21, 60)),
  status text not null default 'borrador' check (status in ('borrador','cerrada')),
  score numeric(5,2),
  rating text check (rating in ('critico','moderado','aceptable')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.sst_evaluation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  evaluation_id uuid not null,
  standard_id uuid not null references public.sst_standards(id),
  status text not null default 'pendiente' check (status in ('pendiente','cumple','no_cumple','no_aplica')),
  justification text,
  updated_at timestamptz not null default now(),
  unique (evaluation_id, standard_id),
  unique (id, organization_id),
  foreign key (evaluation_id, organization_id) references public.sst_evaluations (id, organization_id) on delete cascade
);

create table public.sst_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  evaluation_id uuid not null,
  standard_id uuid not null references public.sst_standards(id),
  description text not null check (length(trim(description)) between 3 and 1000),
  responsible_position_id uuid,
  due_date date,
  status text not null default 'pendiente' check (status in ('pendiente','en_curso','hecha','cancelada')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (evaluation_id, organization_id) references public.sst_evaluations (id, organization_id) on delete cascade,
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.sst_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.sst_evaluations (organization_id, status);
create index on public.sst_evaluation_items (evaluation_id, organization_id);
create index on public.sst_actions (evaluation_id, organization_id);
create index on public.sst_actions (responsible_position_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_sst(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_sst(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
$$;

revoke execute on function public.can_see_sst, public.can_manage_sst from public, anon;
grant execute on function public.can_see_sst, public.can_manage_sst to authenticated;

create or replace function public.sst_tier(p_workers int, p_risk int) returns int
language sql immutable set search_path = '' as $$
  select case
    when p_risk >= 4 then 60
    when p_workers <= 10 then 7
    when p_workers <= 50 then 21
    else 60
  end
$$;
revoke execute on function public.sst_tier(int, int) from public, anon;
grant execute on function public.sst_tier(int, int) to authenticated;

alter table public.sst_standards enable row level security;
alter table public.sst_evaluations enable row level security;
alter table public.sst_evaluation_items enable row level security;
alter table public.sst_actions enable row level security;
alter table public.sst_counters enable row level security; -- deny-all

create policy sst_standards_select on public.sst_standards for select to authenticated using (true);
create policy sst_evaluation_select on public.sst_evaluations for select to authenticated using (public.can_see_sst(organization_id));
create policy sst_item_select on public.sst_evaluation_items for select to authenticated using (public.can_see_sst(organization_id));
create policy sst_action_select on public.sst_actions for select to authenticated using (public.can_see_sst(organization_id));

-- ---------------------------------------------------------------------------
-- Scoring (server-side) y RPCs de autoevaluación
-- ---------------------------------------------------------------------------

create or replace function public.sst_item_weight(p_tier int, s public.sst_standards) returns numeric
language sql immutable set search_path = '' as $$
  select case p_tier when 7 then s.weight_7 when 21 then s.weight_21 else s.weight_60 end
$$;

create or replace function public.sst_recompute(p_eval uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_tier int; v_obtained numeric;
begin
  select tier into v_tier from public.sst_evaluations where id = p_eval;
  select coalesce(sum(
           case v_tier when 7 then s.weight_7 when 21 then s.weight_21 else s.weight_60 end
         ), 0)
    into v_obtained
    from public.sst_evaluation_items i
    join public.sst_standards s on s.id = i.standard_id
    where i.evaluation_id = p_eval
      and (i.status = 'cumple' or (i.status = 'no_aplica' and nullif(trim(coalesce(i.justification, '')), '') is not null));
  update public.sst_evaluations set
    score = round(v_obtained, 2),
    rating = case when v_obtained < 60 then 'critico' when v_obtained <= 85 then 'moderado' else 'aceptable' end,
    updated_at = now()
  where id = p_eval;
end $$;

create or replace function public.create_evaluation(p_org uuid, p_period int, p_workers int, p_risk int)
returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_seq int; v_tier int;
begin
  if not public.can_manage_sst(p_org) then
    raise exception 'No puedes crear autoevaluaciones' using errcode = '42501';
  end if;
  if p_period < 2019 or p_workers < 1 or p_risk < 1 or p_risk > 5 then
    raise exception 'Datos de la autoevaluación no válidos' using errcode = '22023';
  end if;
  v_tier := public.sst_tier(p_workers, p_risk);
  insert into public.sst_counters (organization_id, year, last_seq)
    values (p_org, p_period, 1)
    on conflict (organization_id, year) do update set last_seq = public.sst_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'SGSST-' || p_period || '-' || lpad(v_seq::text, 3, '0');
  insert into public.sst_evaluations (organization_id, code, period, worker_count, risk_class, tier, status, created_by)
  values (p_org, v_code, p_period, p_workers, p_risk, v_tier, 'borrador', auth.uid())
  returning sst_evaluations.id into v_id;
  insert into public.sst_evaluation_items (organization_id, evaluation_id, standard_id, status)
  select p_org, v_id, s.id, 'pendiente'
  from public.sst_standards s
  where s.is_active
    and (case v_tier when 7 then s.weight_7 when 21 then s.weight_21 else s.weight_60 end) is not null;
  perform public.sst_recompute(v_id);
  perform public.log_event(p_org, 'crear_autoevaluacion', 'SG-SST', v_id, v_code, jsonb_build_object('nivel', v_tier));
  return query select v_id, v_code;
end $$;

create or replace function public.sst_evaluation_or_fail(p_eval uuid) returns public.sst_evaluations
language plpgsql stable security definer set search_path = '' as $$
declare e public.sst_evaluations;
begin
  select * into e from public.sst_evaluations where id = p_eval;
  if e.id is null or not public.is_active_member(e.organization_id) then
    raise exception 'Autoevaluación no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return e;
end $$;

create or replace function public.set_item_status(p_item uuid, p_status text, p_justification text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.sst_evaluation_items; e public.sst_evaluations;
begin
  select * into i from public.sst_evaluation_items where id = p_item;
  if i.id is null or not public.is_active_member(i.organization_id) then
    raise exception 'Ítem no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  e := public.sst_evaluation_or_fail(i.evaluation_id);
  if not public.can_manage_sst(e.organization_id) then
    raise exception 'No puedes diligenciar esta autoevaluación' using errcode = '42501';
  end if;
  if e.status <> 'borrador' then
    raise exception 'La autoevaluación está cerrada' using errcode = '22023';
  end if;
  if p_status not in ('pendiente','cumple','no_cumple','no_aplica') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if p_status = 'no_aplica' and nullif(trim(coalesce(p_justification, '')), '') is null then
    raise exception 'Justifica por qué el estándar no aplica' using errcode = '23514';
  end if;
  update public.sst_evaluation_items set
    status = p_status,
    justification = case when p_status = 'no_aplica' then trim(p_justification) else null end,
    updated_at = now()
  where id = p_item;
  perform public.sst_recompute(e.id);
end $$;

create or replace function public.close_evaluation(p_eval uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.sst_evaluations; n_pend int;
begin
  e := public.sst_evaluation_or_fail(p_eval);
  if not public.can_manage_sst(e.organization_id) then
    raise exception 'No puedes cerrar esta autoevaluación' using errcode = '42501';
  end if;
  if e.status <> 'borrador' then
    raise exception 'La autoevaluación ya está cerrada' using errcode = '22023';
  end if;
  select count(*) into n_pend from public.sst_evaluation_items where evaluation_id = e.id and status = 'pendiente';
  if n_pend > 0 then
    raise exception 'Faltan % estándares por responder', n_pend using errcode = '22023';
  end if;
  perform public.sst_recompute(e.id);
  update public.sst_evaluations set status = 'cerrada', closed_at = now(), updated_at = now() where id = e.id;
  perform public.log_event(e.organization_id, 'cerrar_autoevaluacion', 'SG-SST', e.id, e.code, '{}');
end $$;

revoke execute on function public.sst_item_weight, public.sst_recompute, public.sst_evaluation_or_fail from public, anon, authenticated;
revoke execute on function public.create_evaluation, public.set_item_status, public.close_evaluation from public, anon;
grant execute on function public.create_evaluation, public.set_item_status, public.close_evaluation to authenticated;

-- ---------------------------------------------------------------------------
-- tasks: tipo 'cumplir_mejora_sst' y entidad 'sst'
-- ---------------------------------------------------------------------------

alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type = any (array[
  'revisar','aprobar','corregir','atender_solicitud','confirmar_lectura','ejecutar_control',
  'revisar_documento_vencido','recertificar_accesos','ejecutar_accion_nc','conducir_auditoria',
  'capturar_medicion','cerrar_brecha','reevaluar_proveedor','atender_pqrs','cumplir_compromiso',
  'evaluar_requisito','revisar_aspecto','cumplir_mejora_sst']));

alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type = any (array[
  'documento','version','solicitud','control','organizacion','no_conformidad','auditoria','indicador',
  'competencia','proveedor','pqrs','acta','requisito_legal','aspecto_ambiental','sst']));

-- ---------------------------------------------------------------------------
-- Plan de mejoramiento (acciones)
-- ---------------------------------------------------------------------------

create or replace function public.add_sst_action(
  p_eval uuid, p_standard uuid, p_description text, p_responsible uuid, p_due date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.sst_evaluations; v_id uuid; v_item public.sst_evaluation_items;
begin
  e := public.sst_evaluation_or_fail(p_eval);
  if not public.can_manage_sst(e.organization_id) then
    raise exception 'No puedes gestionar el plan de mejora' using errcode = '42501';
  end if;
  select * into v_item from public.sst_evaluation_items where evaluation_id = e.id and standard_id = p_standard;
  if v_item.id is null then
    raise exception 'El estándar no pertenece a esta autoevaluación' using errcode = '22023';
  end if;
  if v_item.status <> 'no_cumple' then
    raise exception 'Las acciones de mejora son para estándares No cumple' using errcode = '22023';
  end if;
  insert into public.sst_actions (organization_id, evaluation_id, standard_id, description, responsible_position_id, due_date, status, created_by)
  values (e.organization_id, e.id, p_standard, trim(p_description), p_responsible, p_due, 'pendiente', auth.uid())
  returning sst_actions.id into v_id;
  perform public.log_event(e.organization_id, 'crear_mejora_sst', 'SG-SST', e.id, e.code, '{}');
  return v_id;
end $$;

create or replace function public.set_sst_action_status(p_action uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.sst_actions;
begin
  select * into a from public.sst_actions where id = p_action;
  if a.id is null or not public.is_active_member(a.organization_id) then
    raise exception 'Acción no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_sst(a.organization_id) then
    raise exception 'No puedes actualizar esta acción' using errcode = '42501';
  end if;
  if p_status not in ('pendiente','en_curso','hecha','cancelada') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  update public.sst_actions set status = p_status where id = p_action;
end $$;

revoke execute on function public.add_sst_action, public.set_sst_action_status from public, anon;
grant execute on function public.add_sst_action, public.set_sst_action_status to authenticated;

-- run_daily_jobs: ver la migración 035e (recordatorio de acciones SST vencidas). El cuerpo completo
-- de la función vive en la base; aquí se documenta el bloque añadido:
--   crea tarea 'cumplir_mejora_sst' (entity 'sst') para sst_actions pendientes/en_curso con due_date
--   vencida y responsable asignado, de organizaciones activas. Idempotente (create_task deduplica).

-- run_daily_jobs: cuerpo completo con el bloque de acciones SST vencidas (035e).
create or replace function public.run_daily_jobs()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; v_pqrs int := 0; v_commitments int := 0; v_legal int := 0; v_sst int := 0; n int;
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

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
      'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal, 'sst', v_sst), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts,
    'proveedores', v_suppliers, 'pqrs', v_pqrs, 'compromisos', v_commitments, 'requisitos', v_legal, 'sst', v_sst);
end $function$;

-- ---------------------------------------------------------------------------
-- Seed del catálogo nacional de Estándares Mínimos (Res. 0312). weight_60 oficial (suma 100);
-- weight_7/weight_21 provisionales (aplicabilidad correcta, suma 100), a confirmar con el Anexo.
-- ---------------------------------------------------------------------------
insert into public.sst_standards (code, name, cycle, component, order_index, weight_7, weight_21, weight_60) values
('1.1.1','Responsable del Sistema de Gestión de SST','planear','recursos',1,15,4.8,0.5),
('1.1.2','Responsabilidades en el Sistema de Gestión de SST','planear','recursos',2,null,4.76,0.5),
('1.1.3','Asignación de recursos para el Sistema de Gestión de SST','planear','recursos',3,null,null,0.5),
('1.1.4','Afiliación al Sistema General de Riesgos Laborales','planear','recursos',4,15,4.76,0.5),
('1.1.5','Pago de pensión a trabajadores de alto riesgo','planear','recursos',5,null,null,0.5),
('1.1.6','Conformación del COPASST / Vigía','planear','recursos',6,null,4.76,0.5),
('1.1.7','Capacitación de los integrantes del COPASST / Vigía','planear','recursos',7,null,null,0.5),
('1.1.8','Conformación del Comité de Convivencia','planear','recursos',8,null,4.76,0.5),
('1.2.1','Programa de capacitación promoción y prevención (PyP)','planear','recursos',9,null,null,2),
('1.2.2','Capacitación, inducción y reinducción en SST','planear','recursos',10,14,4.76,2),
('1.2.3','Responsables del Sistema de Gestión de SST con curso (50 horas)','planear','recursos',11,null,null,2),
('2.1.1','Política del Sistema de Gestión de SST firmada, fechada y comunicada','planear','gestion_integral',12,null,4.76,1),
('2.2.1','Objetivos definidos, claros, medibles, cuantificables, con metas','planear','gestion_integral',13,null,4.76,1),
('2.3.1','Evaluación e identificación de prioridades','planear','gestion_integral',14,14,4.76,1),
('2.4.1','Plan Anual de Trabajo con objetivos, metas, responsables, recursos y cronograma','planear','gestion_integral',15,14,4.76,2),
('2.5.1','Archivo o retención documental del Sistema de Gestión de SST','planear','gestion_integral',16,null,4.76,2),
('2.6.1','Rendición de cuentas sobre el desempeño','planear','gestion_integral',17,null,null,1),
('2.7.1','Matriz legal (normatividad nacional vigente)','planear','gestion_integral',18,null,4.76,2),
('2.8.1','Mecanismos de comunicación y auto-reporte en SST','planear','gestion_integral',19,null,null,1),
('2.9.1','Identificación y evaluación para adquisición de productos y servicios en SST','planear','gestion_integral',20,null,null,1),
('2.10.1','Evaluación y selección de proveedores y contratistas','planear','gestion_integral',21,null,null,2),
('2.11.1','Evaluación del impacto de cambios internos y externos en el SG-SST','planear','gestion_integral',22,null,null,1),
('3.1.1','Descripción sociodemográfica y diagnóstico de condiciones de salud','hacer','gestion_salud',23,null,4.76,1),
('3.1.2','Actividades de promoción y prevención en salud','hacer','gestion_salud',24,null,4.76,1),
('3.1.3','Información al médico de los perfiles de cargo','hacer','gestion_salud',25,null,null,1),
('3.1.4','Realización de los exámenes médicos ocupacionales','hacer','gestion_salud',26,null,4.76,1),
('3.1.5','Custodia de historias clínicas','hacer','gestion_salud',27,null,null,1),
('3.1.6','Restricciones y recomendaciones médico-laborales','hacer','gestion_salud',28,null,null,1),
('3.1.7','Estilos de vida y entornos saludables (tabaquismo, alcohol, drogas)','hacer','gestion_salud',29,null,null,1),
('3.1.8','Agua potable, servicios sanitarios y disposición de basuras','hacer','gestion_salud',30,null,null,1),
('3.1.9','Eliminación adecuada de residuos sólidos, líquidos o gaseosos','hacer','gestion_salud',31,null,null,1),
('3.2.1','Reporte de accidentes de trabajo y enfermedad laboral a la ARL, EPS y Dirección Territorial','hacer','gestion_salud',32,null,4.76,2),
('3.2.2','Investigación de accidentes, incidentes y enfermedad laboral','hacer','gestion_salud',33,null,null,2),
('3.2.3','Registro y análisis estadístico de incidentes, accidentes y enfermedad laboral','hacer','gestion_salud',34,null,null,1),
('3.3.1','Medición de la frecuencia de los incidentes, accidentes y enfermedad laboral','hacer','gestion_salud',35,null,4.76,1),
('3.3.2','Medición de la severidad de los accidentes y enfermedad laboral','hacer','gestion_salud',36,null,null,1),
('3.3.3','Medición de la mortalidad de accidentes y enfermedad laboral','hacer','gestion_salud',37,null,null,1),
('3.3.4','Medición de la prevalencia de incidentes, accidentes y enfermedad laboral','hacer','gestion_salud',38,null,null,1),
('3.3.5','Medición de la incidencia de incidentes, accidentes y enfermedad laboral','hacer','gestion_salud',39,null,null,1),
('3.3.6','Medición del ausentismo por incidentes, accidentes y enfermedad laboral','hacer','gestion_salud',40,null,null,1),
('4.1.1','Metodología para la identificación, evaluación y valoración de peligros','hacer','peligros_riesgos',41,14,4.76,4),
('4.1.2','Identificación de peligros con participación de todos los niveles','hacer','peligros_riesgos',42,null,null,4),
('4.1.3','Identificación y priorización de la naturaleza de los peligros','hacer','peligros_riesgos',43,null,null,3),
('4.1.4','Realización de mediciones ambientales (químicos, físicos y biológicos)','hacer','peligros_riesgos',44,null,null,4),
('4.2.1','Implementación de medidas de prevención y control de peligros','hacer','peligros_riesgos',45,14,4.76,2.5),
('4.2.2','Verificación de la aplicación de las medidas de prevención y control','hacer','peligros_riesgos',46,null,null,2.5),
('4.2.3','Procedimientos, instructivos, fichas y protocolos','hacer','peligros_riesgos',47,null,null,2.5),
('4.2.4','Inspecciones con el COPASST o Vigía','hacer','peligros_riesgos',48,null,null,2.5),
('4.2.5','Mantenimiento periódico de instalaciones, equipos, máquinas y herramientas','hacer','peligros_riesgos',49,null,null,2.5),
('4.2.6','Entrega y verificación de Elementos de Protección Personal (EPP)','hacer','peligros_riesgos',50,null,null,2.5),
('5.1.1','Plan de prevención, preparación y respuesta ante emergencias','hacer','gestion_amenazas',51,null,4.76,5),
('5.1.2','Brigada de prevención conformada, capacitada y dotada','hacer','gestion_amenazas',52,null,null,5),
('6.1.1','Indicadores de estructura, proceso y resultado','verificar','verificacion',53,null,null,1.25),
('6.1.2','Auditoría del SG-SST por lo menos una vez al año','verificar','verificacion',54,null,null,1.25),
('6.1.3','Revisión anual por la alta dirección, resultados y alcance de la auditoría','verificar','verificacion',55,null,null,1.25),
('6.1.4','Planificación de la auditoría con el COPASST','verificar','verificacion',56,null,null,1.25),
('7.1.1','Acciones de promoción y prevención con base en los resultados del SG-SST','actuar','mejoramiento',57,null,null,2.5),
('7.1.2','Toma de medidas correctivas, preventivas y de mejora','actuar','mejoramiento',58,null,4.76,2.5),
('7.1.3','Ejecución de acciones de mejora de la investigación de incidentes, accidentes y EL','actuar','mejoramiento',59,null,null,2.5),
('7.1.4','Implementación de medidas y acciones correctivas de autoridades y de la ARL','actuar','mejoramiento',60,null,null,2.5);
