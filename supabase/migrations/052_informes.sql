-- 052 — BI / Constructor de informes (v1.4-6). Arquitectura: docs/bi/ARQUITECTURA.md, ADR-097/098/099.
-- Solo persiste definiciones de informe (saved_reports). El motor (datasets, filtros, agregación)
-- vive en la capa de app y lee con el cliente del usuario (RLS). Sin SQL libre. Baja lógica
-- (is_active) para "eliminar" sin hard delete.

create table public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  description text,
  dataset text not null check (dataset in ('nc', 'hallazgos', 'mediciones', 'pqrs', 'proveedores', 'solicitudes')),
  config jsonb not null default '{}'::jsonb,
  scope text not null default 'privada' check (scope in ('privada', 'compartida')),
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index on public.saved_reports (organization_id);

alter table public.saved_reports enable row level security;
-- Visible: miembro activo, no eliminado, y (compartida o propia).
create policy saved_report_select on public.saved_reports for select to authenticated
  using (public.is_active_member(organization_id) and is_active and (scope = 'compartida' or created_by = auth.uid()));

create or replace function public.can_manage_reports(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.is_org_admin(org)
$$;
revoke execute on function public.can_manage_reports(uuid) from public, anon;
grant execute on function public.can_manage_reports(uuid) to authenticated;

create or replace function public.create_saved_report(p_org uuid, p_name text, p_dataset text, p_config jsonb, p_scope text)
returns table (id uuid) language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_scope text;
begin
  if not public.is_active_member(p_org) then
    raise exception 'Sin acceso' using errcode = '42501';
  end if;
  v_scope := coalesce(nullif(p_scope, ''), 'privada');
  if v_scope not in ('privada', 'compartida') then
    raise exception 'Ámbito no válido' using errcode = '22023';
  end if;
  if v_scope = 'compartida' and not public.can_manage_reports(p_org) then
    raise exception 'Solo el Líder SIG comparte informes' using errcode = '42501';
  end if;
  if p_dataset not in ('nc', 'hallazgos', 'mediciones', 'pqrs', 'proveedores', 'solicitudes') then
    raise exception 'Fuente no válida' using errcode = '22023';
  end if;
  insert into public.saved_reports (organization_id, name, dataset, config, scope)
  values (p_org, trim(p_name), p_dataset, coalesce(p_config, '{}'::jsonb), v_scope)
  returning saved_reports.id into v_id;
  perform public.log_event(p_org, 'crear_informe', 'Informe', v_id, trim(p_name));
  return query select v_id;
end $$;

create or replace function public.update_saved_report(p_report uuid, p_name text, p_dataset text, p_config jsonb, p_scope text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.saved_reports; v_scope text;
begin
  select * into r from public.saved_reports where id = p_report and is_active;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Informe no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if r.created_by <> auth.uid() and not public.can_manage_reports(r.organization_id) then
    raise exception 'No puedes editar este informe' using errcode = '42501';
  end if;
  v_scope := coalesce(nullif(p_scope, ''), r.scope);
  if v_scope = 'compartida' and not public.can_manage_reports(r.organization_id) then
    raise exception 'Solo el Líder SIG comparte informes' using errcode = '42501';
  end if;
  if p_dataset not in ('nc', 'hallazgos', 'mediciones', 'pqrs', 'proveedores', 'solicitudes') then
    raise exception 'Fuente no válida' using errcode = '22023';
  end if;
  update public.saved_reports
    set name = trim(p_name), dataset = p_dataset, config = coalesce(p_config, '{}'::jsonb),
        scope = v_scope, updated_at = now()
    where id = p_report;
  perform public.log_event(r.organization_id, 'editar_informe', 'Informe', p_report, trim(p_name));
end $$;

create or replace function public.discard_saved_report(p_report uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.saved_reports;
begin
  select * into r from public.saved_reports where id = p_report and is_active;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Informe no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if r.created_by <> auth.uid() and not public.can_manage_reports(r.organization_id) then
    raise exception 'No puedes eliminar este informe' using errcode = '42501';
  end if;
  update public.saved_reports set is_active = false, updated_at = now() where id = p_report;
  perform public.log_event(r.organization_id, 'eliminar_informe', 'Informe', p_report, r.name);
end $$;

revoke execute on function public.create_saved_report(uuid, text, text, jsonb, text), public.update_saved_report(uuid, text, text, jsonb, text), public.discard_saved_report(uuid) from public, anon;
grant execute on function public.create_saved_report(uuid, text, text, jsonb, text), public.update_saved_report(uuid, text, text, jsonb, text), public.discard_saved_report(uuid) to authenticated;
