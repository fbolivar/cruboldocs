-- 045 — Salida no conforme (ISO 9001 8.7). Arquitectura: docs/salidas-no-conformes/ARQUITECTURA.md,
-- ADR-073/074/075. Registro propio SNC-AAAA-### (distinto de 10.2) con disposición + máquina de
-- estados; genera NC con un clic reutilizando report_nonconformity(source='producto_servicio').

-- 045a · Tabla, contador, helpers, RLS
create table public.nonconforming_outputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  description text not null check (length(trim(description)) between 3 and 2000),
  process_id uuid,
  detected_date date not null default current_date,
  identification text,
  disposition text check (disposition in ('separar','reproceso','reclasificar','concesion','devolucion','desecho','suspender_servicio')),
  disposition_detail text,
  customer_informed boolean not null default false,
  responsible_position_id uuid,
  nonconformity_id uuid,
  status text not null default 'abierto' check (status in ('abierto','tratado','cerrado','anulado')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id)
);
create index on public.nonconforming_outputs (organization_id, status);

create table public.snc_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create or replace function public.can_see_nc_outputs(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin()
    or public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_nc_outputs(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_nc_outputs, public.can_manage_nc_outputs from public, anon;
grant execute on function public.can_see_nc_outputs, public.can_manage_nc_outputs to authenticated;

alter table public.nonconforming_outputs enable row level security;
alter table public.snc_counters enable row level security; -- deny-all
create policy nc_output_select on public.nonconforming_outputs for select to authenticated using (public.can_see_nc_outputs(organization_id));

-- 045b · Ciclo de vida
create or replace function public.create_nc_output(
  p_org uuid, p_description text, p_process uuid, p_detected date, p_identification text
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.can_manage_nc_outputs(p_org, p_process) then
    raise exception 'No puedes registrar salidas no conformes' using errcode = '42501';
  end if;
  v_year := extract(year from coalesce(p_detected, current_date))::int;
  insert into public.snc_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.snc_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'SNC-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  insert into public.nonconforming_outputs (organization_id, code, description, process_id, detected_date, identification)
  values (p_org, v_code, trim(p_description), p_process, coalesce(p_detected, current_date), nullif(trim(coalesce(p_identification,'')),''))
  returning nonconforming_outputs.id into v_id;
  perform public.log_event(p_org, 'crear_salida', 'SalidaNoConforme', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.output_or_fail(p_output uuid) returns public.nonconforming_outputs
language plpgsql stable security definer set search_path = '' as $$
declare o public.nonconforming_outputs;
begin
  select * into o from public.nonconforming_outputs where id = p_output;
  if o.id is null or not public.is_active_member(o.organization_id) then
    raise exception 'Salida no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return o;
end $$;

create or replace function public.update_nc_output(
  p_output uuid, p_description text, p_process uuid, p_detected date, p_identification text
) returns void language plpgsql security definer set search_path = '' as $$
declare o public.nonconforming_outputs;
begin
  o := public.output_or_fail(p_output);
  if not public.can_manage_nc_outputs(o.organization_id, o.process_id) then
    raise exception 'No puedes editar esta salida' using errcode = '42501';
  end if;
  if o.status in ('cerrado','anulado') then
    raise exception 'La salida ya no es editable' using errcode = '22023';
  end if;
  update public.nonconforming_outputs set
    description = trim(p_description), process_id = p_process,
    detected_date = coalesce(p_detected, detected_date), identification = nullif(trim(coalesce(p_identification,'')),''),
    updated_at = now()
  where id = o.id;
  perform public.log_event(o.organization_id, 'editar_salida', 'SalidaNoConforme', o.id, o.code, '{}');
end $$;

create or replace function public.set_output_disposition(
  p_output uuid, p_disposition text, p_detail text, p_customer_informed boolean, p_responsible uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare o public.nonconforming_outputs;
begin
  o := public.output_or_fail(p_output);
  if not public.can_manage_nc_outputs(o.organization_id, o.process_id) then
    raise exception 'No puedes gestionar esta salida' using errcode = '42501';
  end if;
  if o.status in ('cerrado','anulado') then
    raise exception 'La salida ya no admite cambios' using errcode = '22023';
  end if;
  if p_disposition not in ('separar','reproceso','reclasificar','concesion','devolucion','desecho','suspender_servicio') then
    raise exception 'Disposición no válida' using errcode = '22023';
  end if;
  update public.nonconforming_outputs set
    disposition = p_disposition, disposition_detail = nullif(trim(coalesce(p_detail,'')),''),
    customer_informed = coalesce(p_customer_informed, false), responsible_position_id = p_responsible,
    status = case when status = 'abierto' then 'tratado' else status end, updated_at = now()
  where id = o.id;
  perform public.log_event(o.organization_id, 'disposicion_salida', 'SalidaNoConforme', o.id, o.code, jsonb_build_object('disposicion', p_disposition));
end $$;

create or replace function public.close_output(p_output uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.nonconforming_outputs;
begin
  o := public.output_or_fail(p_output);
  if not public.can_manage_nc_outputs(o.organization_id, o.process_id) then
    raise exception 'No puedes cerrar esta salida' using errcode = '42501';
  end if;
  if o.status in ('cerrado','anulado') then
    raise exception 'La salida ya está cerrada' using errcode = '22023';
  end if;
  if o.disposition is null then
    raise exception 'Aplica una disposición antes de cerrar' using errcode = '22023';
  end if;
  update public.nonconforming_outputs set status = 'cerrado', updated_at = now() where id = o.id;
  perform public.log_event(o.organization_id, 'cerrar_salida', 'SalidaNoConforme', o.id, o.code, '{}');
end $$;

create or replace function public.cancel_output(p_output uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.nonconforming_outputs;
begin
  o := public.output_or_fail(p_output);
  if not public.can_manage_nc_outputs(o.organization_id, o.process_id) then
    raise exception 'No puedes anular esta salida' using errcode = '42501';
  end if;
  if o.status in ('cerrado','anulado') then
    raise exception 'La salida ya no admite cambios' using errcode = '22023';
  end if;
  update public.nonconforming_outputs set status = 'anulado', updated_at = now() where id = o.id;
  perform public.log_event(o.organization_id, 'anular_salida', 'SalidaNoConforme', o.id, o.code, jsonb_build_object('motivo', nullif(trim(coalesce(p_reason,'')),'')));
end $$;

-- 045c · Generar NC desde la salida no conforme (8.7 → 10.2), idempotente.
-- Nombre propio (generate_nc_from_snc) para no colisionar con generate_nc_from_output de Revisión (023).
create or replace function public.generate_nc_from_snc(p_output uuid)
returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare o public.nonconforming_outputs; r record;
begin
  select * into o from public.nonconforming_outputs where nonconforming_outputs.id = p_output for update;
  if o.id is null or not public.is_active_member(o.organization_id) then
    raise exception 'Salida no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if o.nonconformity_id is not null then
    raise exception 'Esta salida ya generó una no conformidad' using errcode = '22023';
  end if;
  if not public.can_manage_nc_outputs(o.organization_id, o.process_id) then
    raise exception 'No puedes generar la no conformidad' using errcode = '42501';
  end if;
  select nc.id, nc.code into r
  from public.report_nonconformity(o.organization_id, 'producto_servicio', o.process_id,
    left(o.description, 110), o.description, 'mayor', o.detected_date, null) nc;
  update public.nonconforming_outputs set nonconformity_id = r.id, updated_at = now() where nonconforming_outputs.id = o.id;
  perform public.log_event(o.organization_id, 'salida_a_nc', 'SalidaNoConforme', o.id, r.code, jsonb_build_object('nc', r.code));
  return query select r.id, r.code;
end $$;

revoke execute on function public.output_or_fail from public, anon, authenticated;
revoke execute on function public.create_nc_output, public.update_nc_output, public.set_output_disposition,
  public.close_output, public.cancel_output, public.generate_nc_from_snc from public, anon;
grant execute on function public.create_nc_output, public.update_nc_output, public.set_output_disposition,
  public.close_output, public.cancel_output, public.generate_nc_from_snc to authenticated;
