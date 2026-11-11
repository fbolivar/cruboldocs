-- 042 — Caracterización de procesos (ISO 9001 4.4). Arquitectura: docs/procesos/ARQUITECTURA.md,
-- ADR-063/064/065. Se EXTIENDE la tabla existente processes con la caracterización (columnas nullable);
-- el catálogo (alta/baja) sigue en Admin. Edición por RPC definer autorizado por líder.

-- 042a · Columnas de caracterización
alter table public.processes add column if not exists objective text;
alter table public.processes add column if not exists scope text;
alter table public.processes add column if not exists inputs text;
alter table public.processes add column if not exists suppliers text;
alter table public.processes add column if not exists outputs text;
alter table public.processes add column if not exists clients text;
alter table public.processes add column if not exists resources text;
alter table public.processes add column if not exists phva_plan text;
alter table public.processes add column if not exists phva_do text;
alter table public.processes add column if not exists phva_check text;
alter table public.processes add column if not exists phva_act text;
alter table public.processes add column if not exists characterized_at timestamptz;

-- 042b · Autorización
create or replace function public.can_manage_process(org uuid, process uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_manage_process from public, anon;
grant execute on function public.can_manage_process to authenticated;

-- 042c · Caracterizar el proceso
create or replace function public.update_process_characterization(
  p_process uuid, p_objective text, p_scope text, p_inputs text, p_suppliers text, p_outputs text,
  p_clients text, p_resources text, p_phva_plan text, p_phva_do text, p_phva_check text, p_phva_act text
) returns void language plpgsql security definer set search_path = '' as $$
declare pr public.processes;
begin
  select * into pr from public.processes where id = p_process;
  if pr.id is null or not public.is_active_member(pr.organization_id) then
    raise exception 'Proceso no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_process(pr.organization_id, pr.id) then
    raise exception 'No puedes caracterizar este proceso' using errcode = '42501';
  end if;
  update public.processes set
    objective = nullif(trim(coalesce(p_objective,'')),''),
    scope = nullif(trim(coalesce(p_scope,'')),''),
    inputs = nullif(trim(coalesce(p_inputs,'')),''),
    suppliers = nullif(trim(coalesce(p_suppliers,'')),''),
    outputs = nullif(trim(coalesce(p_outputs,'')),''),
    clients = nullif(trim(coalesce(p_clients,'')),''),
    resources = nullif(trim(coalesce(p_resources,'')),''),
    phva_plan = nullif(trim(coalesce(p_phva_plan,'')),''),
    phva_do = nullif(trim(coalesce(p_phva_do,'')),''),
    phva_check = nullif(trim(coalesce(p_phva_check,'')),''),
    phva_act = nullif(trim(coalesce(p_phva_act,'')),''),
    characterized_at = now()
  where id = pr.id;
  perform public.log_event(pr.organization_id, 'caracterizar_proceso', 'Proceso', pr.id, pr.code, '{}');
end $$;

revoke execute on function public.update_process_characterization from public, anon;
grant execute on function public.update_process_characterization to authenticated;
