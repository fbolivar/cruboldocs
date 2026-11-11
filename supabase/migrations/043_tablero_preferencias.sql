-- 043 — Tablero configurable (v1.3-3b). Arquitectura: docs/tablero/ARQUITECTURA.md, ADR-068/069.
-- Preferencia del tablero POR USUARIO: lista ordenada de claves de bloque visibles (jsonb).
-- RLS solo sobre la propia fila; escritura por RPC definer con validación de claves.

create table public.dashboard_preferences (
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null default auth.uid(),
  layout jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.dashboard_preferences enable row level security;

-- Cada quien ve solo su preferencia.
create policy dashboard_pref_select on public.dashboard_preferences
  for select to authenticated using (user_id = auth.uid());

-- Catálogo canónico de bloques (8). Las claves del layout deben pertenecer a este conjunto.
create or replace function public.set_dashboard_layout(p_org uuid, p_layout jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare allowed text[] := array[
  'kpi_mejora','kpi_desempeno','kpi_cliente','kpi_documentos',
  'panel_nc','panel_indicadores','panel_objetivos','panel_pqrs'];
begin
  if not public.is_active_member(p_org) then
    raise exception 'Sin acceso' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_layout) <> 'array' then
    raise exception 'Configuración no válida' using errcode = '22023';
  end if;
  -- Toda clave del layout debe estar en el catálogo (no se aceptan claves arbitrarias).
  if exists (
    select 1 from jsonb_array_elements_text(p_layout) k where k.value <> all(allowed)
  ) then
    raise exception 'Bloque desconocido en la configuración' using errcode = '22023';
  end if;
  insert into public.dashboard_preferences (organization_id, user_id, layout, updated_at)
  values (p_org, auth.uid(), p_layout, now())
  on conflict (organization_id, user_id) do update set layout = excluded.layout, updated_at = now();
end $$;

revoke execute on function public.set_dashboard_layout from public, anon;
grant execute on function public.set_dashboard_layout to authenticated;
