-- 038 — Gestión del cambio (ISO 9001 6.3). Arquitectura: docs/metrologia-cambios/ARQUITECTURA.md,
-- ADR-057. Solicitudes de cambio con máquina de estados (propuesto→en_evaluacion→aprobado/rechazado;
-- aprobado→implementado), análisis de impacto en texto y aprobación por Líder SIG. Tabla
-- `change_control` (nombre distinto de `change_requests`, que es la solicitud de actualización de
-- documentos). RLS solo-SELECT + escritura por RPC. Aplicada por fragmentos; SQL final consolidado.

create table public.change_control (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null check (length(trim(title)) between 3 and 200),
  description text,
  change_type text not null check (change_type in ('proceso','documento','infraestructura','tecnologico','organizacional','otro')),
  process_id uuid,
  request_date date not null default current_date,
  requested_by_position_id uuid,
  impact_assessment text,
  status text not null default 'propuesto' check (status in ('propuesto','en_evaluacion','aprobado','rechazado','implementado')),
  approver_position_id uuid,
  decision_date date,
  implementation_notes text,
  closed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (requested_by_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (approver_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.change_control_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.change_control (organization_id, status);
create index on public.change_control (process_id, organization_id);

create or replace function public.can_see_changes(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_changes(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_changes, public.can_manage_changes from public, anon;
grant execute on function public.can_see_changes, public.can_manage_changes to authenticated;

alter table public.change_control enable row level security;
alter table public.change_control_counters enable row level security; -- deny-all

create policy change_control_select on public.change_control for select to authenticated using (public.can_see_changes(organization_id));

create or replace function public.create_change(
  p_org uuid, p_title text, p_type text, p_process uuid, p_description text, p_requested_by uuid
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_changes(p_org, p_process) then
    raise exception 'No puedes crear solicitudes de cambio' using errcode = '42501';
  end if;
  if p_type not in ('proceso','documento','infraestructura','tecnologico','organizacional','otro') then
    raise exception 'Tipo de cambio no válido' using errcode = '22023';
  end if;
  v_year := extract(year from current_date)::int;
  insert into public.change_control_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.change_control_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'CMB-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.change_control (organization_id, code, title, change_type, process_id, description, requested_by_position_id, status, created_by)
  values (p_org, v_code, trim(p_title), p_type, p_process, nullif(trim(coalesce(p_description,'')),''), p_requested_by, 'propuesto', auth.uid())
  returning change_control.id into v_id;
  perform public.log_event(p_org, 'crear_cambio', 'Cambio', v_id, v_code, jsonb_build_object('tipo', p_type));
  return query select v_id, v_code;
end $$;

create or replace function public.change_or_fail(p_change uuid) returns public.change_control
language plpgsql stable security definer set search_path = '' as $$
declare c public.change_control;
begin
  select * into c from public.change_control where id = p_change;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'Solicitud no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return c;
end $$;

create or replace function public.update_change(
  p_change uuid, p_title text, p_type text, p_process uuid, p_description text, p_requested_by uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare c public.change_control;
begin
  c := public.change_or_fail(p_change);
  if not public.can_manage_changes(c.organization_id, c.process_id) then
    raise exception 'No puedes editar esta solicitud' using errcode = '42501';
  end if;
  if c.status in ('implementado','rechazado') then
    raise exception 'La solicitud ya está cerrada' using errcode = '22023';
  end if;
  if p_type not in ('proceso','documento','infraestructura','tecnologico','organizacional','otro') then
    raise exception 'Tipo de cambio no válido' using errcode = '22023';
  end if;
  update public.change_control set
    title = trim(p_title), change_type = p_type, process_id = p_process,
    description = nullif(trim(coalesce(p_description,'')),''), requested_by_position_id = p_requested_by, updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'editar_cambio', 'Cambio', c.id, c.code, '{}');
end $$;

create or replace function public.assess_change(p_change uuid, p_impact text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.change_control;
begin
  c := public.change_or_fail(p_change);
  if not public.can_manage_changes(c.organization_id, c.process_id) then
    raise exception 'No puedes evaluar esta solicitud' using errcode = '42501';
  end if;
  if c.status not in ('propuesto','en_evaluacion') then
    raise exception 'La solicitud ya fue decidida' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_impact,'')),'') is null then
    raise exception 'Describe el análisis de impacto' using errcode = '23514';
  end if;
  update public.change_control set impact_assessment = trim(p_impact), status = 'en_evaluacion', updated_at = now() where id = c.id;
  perform public.log_event(c.organization_id, 'evaluar_cambio', 'Cambio', c.id, c.code, '{}');
end $$;

create or replace function public.decide_change(p_change uuid, p_approve boolean, p_approver uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.change_control;
begin
  c := public.change_or_fail(p_change);
  if not public.has_role(c.organization_id, 'lider_sig') then
    raise exception 'Solo el Líder SIG aprueba o rechaza cambios' using errcode = '42501';
  end if;
  if c.status <> 'en_evaluacion' then
    raise exception 'La solicitud debe estar en evaluación para decidirse' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(c.impact_assessment,'')),'') is null then
    raise exception 'Registra el análisis de impacto antes de decidir' using errcode = '22023';
  end if;
  update public.change_control set
    status = case when p_approve then 'aprobado' else 'rechazado' end,
    approver_position_id = p_approver, decision_date = current_date,
    closed_at = case when p_approve then null else now() end, updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'decidir_cambio', 'Cambio', c.id, c.code, jsonb_build_object('aprobado', p_approve));
end $$;

create or replace function public.implement_change(p_change uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.change_control;
begin
  c := public.change_or_fail(p_change);
  if not public.can_manage_changes(c.organization_id, c.process_id) then
    raise exception 'No puedes implementar esta solicitud' using errcode = '42501';
  end if;
  if c.status <> 'aprobado' then
    raise exception 'Solo un cambio aprobado se implementa' using errcode = '22023';
  end if;
  update public.change_control set status = 'implementado', implementation_notes = nullif(trim(coalesce(p_notes,'')),''), closed_at = now(), updated_at = now() where id = c.id;
  perform public.log_event(c.organization_id, 'implementar_cambio', 'Cambio', c.id, c.code, '{}');
end $$;

revoke execute on function public.change_or_fail from public, anon, authenticated;
revoke execute on function public.create_change, public.update_change, public.assess_change, public.decide_change, public.implement_change from public, anon;
grant execute on function public.create_change, public.update_change, public.assess_change, public.decide_change, public.implement_change to authenticated;
