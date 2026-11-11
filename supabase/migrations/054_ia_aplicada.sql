-- 054 — IA aplicada (v1.5-1). Arquitectura: docs/ia/ARQUITECTURA.md, ADR-103/104/105.
-- Solo agrega el consumo de cupo para la IA de contenido: comparte el MISMO contador mensual por
-- organización (ai_agent_usage) y el mismo opt-in (organizations.ai_agent_enabled). La autorización
-- FINA por tarea vive en la server action (rol de la acción de fondo). Esta función solo decide si la
-- organización puede gastar una unidad. Sin tablas nuevas.
create or replace function public.ai_content_consume(p_org uuid, p_limit integer, p_period text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_used integer;
begin
  if p_limit < 0 or p_period !~ '^\d{4}-\d{2}$' then
    raise exception 'Parámetros inválidos' using errcode = '22023';
  end if;
  if not public.is_active_member(p_org) then
    raise exception 'Sin acceso a esta organización' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_org and o.ai_agent_enabled) then
    raise exception 'La IA no está habilitada para esta organización' using errcode = '42501';
  end if;
  insert into public.ai_agent_usage (organization_id, period)
    values (p_org, p_period)
    on conflict (organization_id, period) do nothing;
  update public.ai_agent_usage
    set used = used + 1, updated_at = now()
    where organization_id = p_org and period = p_period and used < p_limit
    returning used into v_used;
  if v_used is null then
    raise exception 'Límite de IA alcanzado para el período' using errcode = '53400';
  end if;
  return p_limit - v_used;
end $$;

revoke execute on function public.ai_content_consume(uuid, integer, text) from public, anon;
grant execute on function public.ai_content_consume(uuid, integer, text) to authenticated;
