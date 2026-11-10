-- 026 — Módulo Proveedores (ISO 9001 8.4). Arquitectura: docs/proveedores/ARQUITECTURA.md, ADR-024..027.
-- Patrón espejo de los módulos 1–5: RLS solo-SELECT por organization_id + escritura por RPC SECURITY DEFINER
-- con search_path='' y autorización interna por rol; FKs compuestas (id, organization_id). El puntaje total y
-- el resultado de cada evaluación se calculan SIEMPRE en el servidor por pesos/umbrales fijos (ADR-025); la
-- última evaluación fija el status y la próxima reevaluación del proveedor. Numeración PRV-AAAA-### por año.
-- Certificados en Storage DIFERIDOS (ADR-027): no se crean bucket ni columnas de archivo.
-- NOTA: aplicada por fragmentos (el guard del MCP rechaza DROP, el texto 'delete' y migraciones grandes);
-- este archivo es el SQL final consolidado.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  name text not null check (length(trim(name)) between 2 and 200),
  nit text,
  kind text not null check (kind in ('bien','servicio','ambos')),
  category text,
  criticality text not null check (criticality in ('alta','media','baja')),
  process_id uuid,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'pendiente' check (status in ('pendiente','aprobado','condicionado','rechazado','inactivo')),
  next_eval_date date,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.supplier_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  supplier_id uuid not null,
  kind text not null check (kind in ('inicial','periodica')),
  eval_date date not null,
  score_quality smallint not null check (score_quality between 0 and 100),
  score_delivery smallint not null check (score_delivery between 0 and 100),
  score_service smallint not null check (score_service between 0 and 100),
  weight_quality smallint not null,
  weight_delivery smallint not null,
  weight_service smallint not null,
  total_score numeric(5,2) not null,
  result text not null check (result in ('aprobado','condicionado','rechazado')),
  next_eval_date date,
  note text,
  evaluated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (supplier_id, organization_id) references public.suppliers (id, organization_id) on delete cascade
);

create table public.supplier_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.suppliers (organization_id, status);
create index on public.suppliers (process_id, organization_id);
create index on public.supplier_evaluations (supplier_id, organization_id);

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_suppliers(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_suppliers(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_suppliers, public.can_manage_suppliers from public, anon;
grant execute on function public.can_see_suppliers, public.can_manage_suppliers to authenticated;

alter table public.suppliers enable row level security;
alter table public.supplier_evaluations enable row level security;
alter table public.supplier_counters enable row level security; -- deny-all

create policy supplier_select on public.suppliers for select to authenticated
  using (public.can_see_suppliers(organization_id));
create policy supplier_evaluation_select on public.supplier_evaluations for select to authenticated
  using (public.can_see_suppliers(organization_id));

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.create_supplier(
  p_org uuid, p_name text, p_nit text, p_kind text, p_category text, p_criticality text,
  p_process uuid, p_contact_name text, p_contact_email text, p_contact_phone text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_suppliers(p_org, p_process) then
    raise exception 'No puedes registrar proveedores' using errcode = '42501';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.supplier_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.supplier_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'PRV-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.suppliers (organization_id, code, name, nit, kind, category, criticality, process_id,
    contact_name, contact_email, contact_phone, status, created_by)
  values (p_org, v_code, trim(p_name), nullif(trim(coalesce(p_nit, '')), ''), p_kind,
    nullif(trim(coalesce(p_category, '')), ''), p_criticality, p_process,
    nullif(trim(coalesce(p_contact_name, '')), ''), nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(trim(coalesce(p_contact_phone, '')), ''), 'pendiente', auth.uid())
  returning suppliers.id into v_id;

  perform public.log_event(p_org, 'crear_proveedor', 'Proveedor', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.supplier_or_fail(p_supplier uuid) returns public.suppliers
language plpgsql stable security definer set search_path = '' as $$
declare s public.suppliers;
begin
  select * into s from public.suppliers where id = p_supplier;
  if s.id is null or not public.is_active_member(s.organization_id) then
    raise exception 'Proveedor no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return s;
end $$;

create or replace function public.update_supplier(
  p_supplier uuid, p_name text, p_nit text, p_kind text, p_category text, p_criticality text,
  p_contact_name text, p_contact_email text, p_contact_phone text
) returns void language plpgsql security definer set search_path = '' as $$
declare s public.suppliers;
begin
  s := public.supplier_or_fail(p_supplier);
  if not public.can_manage_suppliers(s.organization_id, s.process_id) then
    raise exception 'No puedes editar este proveedor' using errcode = '42501';
  end if;
  update public.suppliers set
    name = trim(p_name), nit = nullif(trim(coalesce(p_nit, '')), ''), kind = p_kind,
    category = nullif(trim(coalesce(p_category, '')), ''), criticality = p_criticality,
    contact_name = nullif(trim(coalesce(p_contact_name, '')), ''),
    contact_email = nullif(trim(coalesce(p_contact_email, '')), ''),
    contact_phone = nullif(trim(coalesce(p_contact_phone, '')), ''), updated_at = now()
  where id = s.id;
  perform public.log_event(s.organization_id, 'editar_proveedor', 'Proveedor', s.id, s.code, '{}');
end $$;

/** Baja lógica / reactivación. Al reactivar, el estado vuelve al resultado de la última evaluación
 *  (o 'pendiente' si no tiene). */
create or replace function public.set_supplier_active(p_supplier uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.suppliers; v_last text;
begin
  s := public.supplier_or_fail(p_supplier);
  if not public.can_manage_suppliers(s.organization_id, s.process_id) then
    raise exception 'No puedes cambiar el estado de este proveedor' using errcode = '42501';
  end if;
  if not p_active then
    update public.suppliers set is_active = false, status = 'inactivo', updated_at = now() where id = s.id;
    perform public.log_event(s.organization_id, 'baja_proveedor', 'Proveedor', s.id, s.code, '{}');
  else
    select result into v_last from public.supplier_evaluations
      where supplier_id = s.id order by eval_date desc, created_at desc limit 1;
    update public.suppliers set is_active = true, status = coalesce(v_last, 'pendiente'), updated_at = now()
    where id = s.id;
    perform public.log_event(s.organization_id, 'reactivar_proveedor', 'Proveedor', s.id, s.code, '{}');
  end if;
end $$;

/** Evalúa/reevalúa: calcula total y resultado en el servidor (pesos 50/30/20, umbrales 80/60) y
 *  actualiza el estado vigente y la próxima reevaluación del proveedor. */
create or replace function public.evaluate_supplier(
  p_supplier uuid, p_kind text, p_eval_date date, p_quality smallint, p_delivery smallint,
  p_service smallint, p_next_eval date, p_note text
) returns table (id uuid, result text, total numeric)
language plpgsql security definer set search_path = '' as $$
declare s public.suppliers; v_total numeric(5,2); v_result text; v_id uuid;
begin
  s := public.supplier_or_fail(p_supplier);
  if not public.can_manage_suppliers(s.organization_id, s.process_id) then
    raise exception 'No puedes evaluar este proveedor' using errcode = '42501';
  end if;
  if not s.is_active then
    raise exception 'El proveedor está inactivo' using errcode = '22023';
  end if;
  if p_quality not between 0 and 100 or p_delivery not between 0 and 100 or p_service not between 0 and 100 then
    raise exception 'Cada criterio va de 0 a 100' using errcode = '22023';
  end if;
  v_total := round((p_quality * 50 + p_delivery * 30 + p_service * 20) / 100.0, 2);
  v_result := case when v_total >= 80 then 'aprobado' when v_total >= 60 then 'condicionado' else 'rechazado' end;

  insert into public.supplier_evaluations (organization_id, supplier_id, kind, eval_date,
    score_quality, score_delivery, score_service, weight_quality, weight_delivery, weight_service,
    total_score, result, next_eval_date, note, evaluated_by)
  values (s.organization_id, s.id, p_kind, p_eval_date, p_quality, p_delivery, p_service, 50, 30, 20,
    v_total, v_result, p_next_eval, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning supplier_evaluations.id into v_id;

  update public.suppliers set status = v_result, next_eval_date = p_next_eval, updated_at = now()
  where suppliers.id = s.id;
  perform public.log_event(s.organization_id, 'evaluar_proveedor', 'Proveedor', s.id, s.code,
    jsonb_build_object('resultado', v_result, 'total', v_total));
  return query select v_id, v_result, v_total;
end $$;

revoke execute on function public.supplier_or_fail from public, anon, authenticated;
revoke execute on function public.create_supplier, public.update_supplier,
  public.set_supplier_active, public.evaluate_supplier from public, anon;
grant execute on function public.create_supplier, public.update_supplier,
  public.set_supplier_active, public.evaluate_supplier to authenticated;

-- ---------------------------------------------------------------------------
-- Bandeja: recordatorio de reevaluación (ADR-026) + job diario
-- ---------------------------------------------------------------------------

alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion', 'cerrar_brecha', 'reevaluar_proveedor'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria',
  'indicador', 'competencia', 'proveedor'));

-- El job diario crea la tarea de reevaluación para proveedores activos con next_eval_date vencida,
-- asignada al cargo líder del proceso del proveedor (si lo tiene). Los proveedores sin proceso con
-- líder no generan tarea automática: aparecen como "por reevaluar" en el tablero.
create or replace function public.run_daily_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int := 0; v_controls int := 0; v_recerts int := 0; v_suppliers int := 0; n int;
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

  -- 4. Proveedores activos con reevaluación vencida → tarea al cargo líder del proceso del proveedor.
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

  perform public.log_event(null, 'job_diario', 'Sistema', null, current_date::text,
    jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts, 'proveedores', v_suppliers), null);
  return jsonb_build_object('revisiones', v_reviews, 'controles', v_controls, 'recertificaciones', v_recerts, 'proveedores', v_suppliers);
end $$;

revoke execute on function public.run_daily_jobs from public, anon, authenticated;
grant execute on function public.run_daily_jobs to service_role;
