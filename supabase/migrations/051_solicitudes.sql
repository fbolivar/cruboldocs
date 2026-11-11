-- 051 — BPM-lite: Solicitudes y aprobaciones configurables (v1.4-5).
-- Arquitectura: docs/bpm/ARQUITECTURA.md, ADR-094/095/096.
-- Módulo independiente (no toca los flujos fijos). Flujo lineal secuencial; aprobador = un cargo
-- por paso; los pasos de la plantilla viven como JSONB en el flujo y se COPIAN a la solicitud al
-- radicar (editar la plantilla no altera lo en curso). Reusa tasks/cron, contador atómico, log_event.

-- 051a · Tablas
create table public.approval_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  description text,
  -- [{ "name": text, "position": uuid }] en orden.
  steps jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index on public.approval_flows (organization_id);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  flow_id uuid not null,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 200),
  description text,
  requested_by uuid not null default auth.uid(),
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada', 'anulada')),
  current_step int not null default 1,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (flow_id, organization_id) references public.approval_flows (id, organization_id)
);
create index on public.approval_requests (organization_id);

create table public.approval_request_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  request_id uuid not null,
  step_no int not null,
  name text not null,
  approver_position_id uuid not null,
  decision text not null default 'pendiente' check (decision in ('pendiente', 'aprobada', 'rechazada')),
  decided_by uuid,
  decided_at timestamptz,
  comment text,
  unique (request_id, step_no),
  foreign key (request_id, organization_id) references public.approval_requests (id, organization_id) on delete cascade,
  foreign key (approver_position_id, organization_id) references public.positions (id, organization_id)
);
create index on public.approval_request_steps (request_id, organization_id);

create table public.sol_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

alter table public.approval_flows enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_request_steps enable row level security;
alter table public.sol_counters enable row level security;

create policy approval_flow_select on public.approval_flows for select to authenticated using (public.is_active_member(organization_id));
create policy approval_request_select on public.approval_requests for select to authenticated using (public.is_active_member(organization_id));
create policy approval_request_step_select on public.approval_request_steps for select to authenticated using (public.is_active_member(organization_id));
-- sol_counters: sin política = deny-all (solo las funciones security definer lo tocan).

-- 051b · Enum de tareas y helper de autorización.
-- Se re-declara la lista COMPLETA de tipos (la de 039) + 'aprobar_solicitud'.
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type = any (array[
  'revisar','aprobar','corregir','atender_solicitud','confirmar_lectura','ejecutar_control',
  'revisar_documento_vencido','recertificar_accesos','ejecutar_accion_nc','conducir_auditoria',
  'capturar_medicion','cerrar_brecha','reevaluar_proveedor','atender_pqrs','cumplir_compromiso',
  'evaluar_requisito','revisar_aspecto','cumplir_mejora_sst','calibrar_equipo','aprobar_solicitud']));

create or replace function public.can_manage_flows(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.is_org_admin(org)
$$;
revoke execute on function public.can_manage_flows(uuid) from public, anon;
grant execute on function public.can_manage_flows(uuid) to authenticated;

-- 051c · RPCs de plantillas de flujo
create or replace function public.create_approval_flow(p_org uuid, p_name text, p_description text)
returns table (id uuid) language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.can_manage_flows(p_org) then
    raise exception 'No puedes gestionar flujos' using errcode = '42501';
  end if;
  insert into public.approval_flows (organization_id, name, description)
  values (p_org, trim(p_name), nullif(trim(coalesce(p_description, '')), ''))
  returning approval_flows.id into v_id;
  perform public.log_event(p_org, 'crear_flujo', 'Flujo', v_id, trim(p_name));
  return query select v_id;
end $$;

create or replace function public.update_approval_flow(p_flow uuid, p_name text, p_description text, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.approval_flows;
begin
  select * into f from public.approval_flows where id = p_flow;
  if f.id is null or not public.can_manage_flows(f.organization_id) then
    raise exception 'No puedes gestionar este flujo' using errcode = '42501';
  end if;
  update public.approval_flows
    set name = trim(p_name), description = nullif(trim(coalesce(p_description, '')), ''),
        is_active = coalesce(p_active, is_active), updated_at = now()
    where id = p_flow;
  perform public.log_event(f.organization_id, 'editar_flujo', 'Flujo', p_flow, trim(p_name));
end $$;

create or replace function public.set_flow_steps(p_flow uuid, p_steps jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.approval_flows;
begin
  select * into f from public.approval_flows where id = p_flow;
  if f.id is null or not public.can_manage_flows(f.organization_id) then
    raise exception 'No puedes gestionar este flujo' using errcode = '42501';
  end if;
  if p_steps is null or jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) < 1 then
    raise exception 'Define al menos un paso' using errcode = '22023';
  end if;
  perform 1 from jsonb_array_elements(p_steps) s
    where s->>'name' is null or length(trim(s->>'name')) < 1 or s->>'position' is null
      or not exists (select 1 from public.positions p where p.id = (s->>'position')::uuid and p.organization_id = f.organization_id);
  if found then
    raise exception 'Hay un paso sin nombre o con un cargo inválido' using errcode = '22023';
  end if;
  update public.approval_flows set steps = p_steps, updated_at = now() where id = p_flow;
  perform public.log_event(f.organization_id, 'editar_pasos_flujo', 'Flujo', p_flow, f.name);
end $$;

revoke execute on function public.create_approval_flow(uuid, text, text), public.update_approval_flow(uuid, text, text, boolean), public.set_flow_steps(uuid, jsonb) from public, anon;
grant execute on function public.create_approval_flow(uuid, text, text), public.update_approval_flow(uuid, text, text, boolean), public.set_flow_steps(uuid, jsonb) to authenticated;

-- 051d · RPCs de solicitudes (instancia del flujo)
create or replace function public.create_approval_request(p_org uuid, p_flow uuid, p_title text, p_description text)
returns table (code text) language plpgsql security definer set search_path = '' as $$
declare f public.approval_flows; v_year int; v_seq int; v_code text; v_req uuid; v_pos uuid;
begin
  if not public.is_active_member(p_org) then
    raise exception 'Sin acceso' using errcode = '42501';
  end if;
  select * into f from public.approval_flows where id = p_flow and organization_id = p_org and is_active;
  if f.id is null then
    raise exception 'El flujo no está disponible' using errcode = 'P0002';
  end if;
  if jsonb_array_length(f.steps) < 1 then
    raise exception 'El flujo no tiene pasos configurados' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Ponle un título a la solicitud' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.sol_counters (organization_id, year, last_seq) values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.sol_counters.last_seq + 1 returning last_seq into v_seq;
  v_code := 'SOL-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.approval_requests (organization_id, flow_id, code, title, description)
    values (p_org, p_flow, v_code, trim(p_title), nullif(trim(coalesce(p_description, '')), '')) returning id into v_req;
  insert into public.approval_request_steps (organization_id, request_id, step_no, name, approver_position_id)
    select p_org, v_req, ord::int, s->>'name', (s->>'position')::uuid
    from jsonb_array_elements(f.steps) with ordinality as t(s, ord);
  select approver_position_id into v_pos from public.approval_request_steps where request_id = v_req and step_no = 1;
  perform public.create_task(p_org, 'aprobar_solicitud', v_pos, 'solicitud', v_req, v_code, trim(p_title), null, null, now() + interval '15 days');
  perform public.log_event(p_org, 'crear_solicitud', 'Solicitud', v_req, v_code);
  return query select v_code;
end $$;

create or replace function public.decide_approval_step(p_request uuid, p_approve boolean, p_comment text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.approval_requests; st public.approval_request_steps; v_pos uuid; v_next int; v_nextpos uuid;
begin
  select * into r from public.approval_requests where id = p_request;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Solicitud no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if r.status <> 'pendiente' then
    raise exception 'La solicitud ya no está en curso' using errcode = '22023';
  end if;
  select * into st from public.approval_request_steps where request_id = p_request and step_no = r.current_step;
  v_pos := public.my_position(r.organization_id);
  if v_pos is null or v_pos <> st.approver_position_id then
    raise exception 'No te corresponde aprobar este paso' using errcode = '42501';
  end if;
  if p_approve then
    update public.approval_request_steps
      set decision = 'aprobada', decided_by = auth.uid(), decided_at = now(), comment = nullif(trim(coalesce(p_comment, '')), '')
      where id = st.id;
    perform public.complete_tasks('aprobar_solicitud', p_request, st.approver_position_id);
    v_next := r.current_step + 1;
    if exists (select 1 from public.approval_request_steps where request_id = p_request and step_no = v_next) then
      update public.approval_requests set current_step = v_next where id = p_request;
      select approver_position_id into v_nextpos from public.approval_request_steps where request_id = p_request and step_no = v_next;
      perform public.create_task(r.organization_id, 'aprobar_solicitud', v_nextpos, 'solicitud', p_request, r.code, r.title, null, null, now() + interval '15 days');
    else
      update public.approval_requests set status = 'aprobada', closed_at = now() where id = p_request;
    end if;
    perform public.log_event(r.organization_id, 'aprobar_paso_solicitud', 'Solicitud', p_request, r.code);
  else
    if length(trim(coalesce(p_comment, ''))) < 1 then
      raise exception 'Indica el motivo del rechazo' using errcode = '22023';
    end if;
    update public.approval_request_steps
      set decision = 'rechazada', decided_by = auth.uid(), decided_at = now(), comment = trim(p_comment)
      where id = st.id;
    perform public.complete_tasks('aprobar_solicitud', p_request, st.approver_position_id);
    update public.approval_requests set status = 'rechazada', closed_at = now() where id = p_request;
    perform public.log_event(r.organization_id, 'rechazar_solicitud', 'Solicitud', p_request, r.code);
  end if;
end $$;

create or replace function public.cancel_approval_request(p_request uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.approval_requests; v_pos uuid;
begin
  select * into r from public.approval_requests where id = p_request;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Solicitud no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if r.status <> 'pendiente' then
    raise exception 'La solicitud ya no está en curso' using errcode = '22023';
  end if;
  if r.requested_by <> auth.uid() and not public.can_manage_flows(r.organization_id) then
    raise exception 'No puedes anular esta solicitud' using errcode = '42501';
  end if;
  update public.approval_requests set status = 'anulada', closed_at = now() where id = p_request;
  select approver_position_id into v_pos from public.approval_request_steps where request_id = p_request and step_no = r.current_step;
  perform public.complete_tasks('aprobar_solicitud', p_request, v_pos);
  perform public.log_event(r.organization_id, 'anular_solicitud', 'Solicitud', p_request, r.code);
end $$;

revoke execute on function public.create_approval_request(uuid, uuid, text, text), public.decide_approval_step(uuid, boolean, text), public.cancel_approval_request(uuid, text) from public, anon;
grant execute on function public.create_approval_request(uuid, uuid, text, text), public.decide_approval_step(uuid, boolean, text), public.cancel_approval_request(uuid, text) to authenticated;
