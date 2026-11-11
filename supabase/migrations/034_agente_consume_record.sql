-- 034 — Crubol-Agent Fase C (copiloto de NC/Riesgos). Variante del consumo de uso que autoriza por
-- rol GESTOR (líder SIG o líder de proceso), no por admin de catálogo, porque el copiloto lo usan
-- quienes gestionan una NC o un riesgo. Comparte el mismo contador/límite mensual (ai_agent_usage).
-- La autorización POR REGISTRO la garantiza el camino de ejecución (acciones de dominio → RLS);
-- esta función solo decide si la organización puede gastar una unidad de uso del agente.
create or replace function public.ai_agent_consume_record(p_org uuid, p_limit integer, p_period text)
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
  if not (public.has_role(p_org, 'lider_sig') or public.has_role(p_org, 'lider_proceso')) then
    raise exception 'Sin permiso para usar el copiloto en esta organización' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_org and o.ai_agent_enabled) then
    raise exception 'El agente no está habilitado para esta organización' using errcode = '42501';
  end if;
  insert into public.ai_agent_usage (organization_id, period)
    values (p_org, p_period)
    on conflict (organization_id, period) do nothing;
  update public.ai_agent_usage
    set used = used + 1, updated_at = now()
    where organization_id = p_org and period = p_period and used < p_limit
    returning used into v_used;
  if v_used is null then
    raise exception 'Límite de uso del agente alcanzado para el período' using errcode = '53400';
  end if;
  return p_limit - v_used;
end $$;

revoke execute on function public.ai_agent_consume_record(uuid, integer, text) from public, anon;
grant execute on function public.ai_agent_consume_record(uuid, integer, text) to authenticated;
