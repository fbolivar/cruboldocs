-- 016 — Crubol-Agent (feature v1.1): opt-in por organización y contador de uso mensual para
-- aplicar los límites. NADA aquí activa el agente: el default es apagado. La activación la
-- controla el Superadmin (política org_update existente) en el despliegue gradual; el consumo
-- lo registra la función de servidor, nunca por REST.

-- Opt-in del agente por organización (lo enciende el Superadmin; default apagado).
alter table public.organizations
  add column ai_agent_enabled boolean not null default false;

-- Uso del agente por organización y período mensual ('YYYY-MM', zona America/Bogota).
create table public.ai_agent_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period text not null,
  used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, period),
  constraint ai_agent_usage_period_check check (period ~ '^\d{4}-\d{2}$'),
  constraint ai_agent_usage_used_check check (used >= 0)
);

alter table public.ai_agent_usage enable row level security;

-- Lectura: quien administra el catálogo (Admin o Líder SIG) ve el uso de su organización, para
-- mostrar cuánto queda del límite. Sin políticas de escritura: el consumo va por la función.
create policy ai_usage_select on public.ai_agent_usage for select to authenticated
  using (public.can_manage_org(organization_id) or public.is_platform_admin());

-- Consumo atómico del agente: verifica permiso (administra el catálogo) y que el agente esté
-- habilitado para la organización; incrementa el contador del período solo si no se pasa del
-- límite y devuelve cuántas acciones quedan. SECURITY DEFINER para escribir sin exponer writes.
create or replace function public.ai_agent_consume(p_org uuid, p_limit integer, p_period text)
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
  if not public.can_manage_org(p_org) then
    raise exception 'Sin permiso para usar el agente en esta organización' using errcode = '42501';
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

revoke execute on function public.ai_agent_consume(uuid, integer, text) from public, anon;
grant execute on function public.ai_agent_consume(uuid, integer, text) to authenticated;
