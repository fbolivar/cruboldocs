-- 055 — Causa raíz estructurada (v1.5-2). Arquitectura: docs/rca/ARQUITECTURA.md, ADR-106/107/108.
-- Un análisis por NC (5 Porqués o Ishikawa). Alimenta nonconformities.root_cause vía "Usar como
-- causa raíz" (reusa set_nc_cause). Autorización = gestionar la NC (mismo patrón que set_nc_cause).

create table public.rca_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  nonconformity_id uuid not null,
  method text not null check (method in ('5porques', 'ishikawa')),
  data jsonb not null default '{}'::jsonb,
  conclusion text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nonconformity_id, organization_id),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id) on delete cascade
);
create index on public.rca_analyses (organization_id);

alter table public.rca_analyses enable row level security;
create policy rca_analysis_select on public.rca_analyses for select to authenticated using (public.is_active_member(organization_id));

create or replace function public.save_rca_analysis(p_nc uuid, p_method text, p_data jsonb, p_conclusion text)
returns void language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities;
begin
  n := public.nc_or_fail(p_nc);
  if not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Tu cargo no puede gestionar esta no conformidad' using errcode = '42501';
  end if;
  if n.status in ('cerrada', 'anulada') then
    raise exception 'La no conformidad ya está cerrada' using errcode = '22023';
  end if;
  if p_method <> all (array['5porques', 'ishikawa']) then
    raise exception 'Método no válido' using errcode = '22023';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Análisis inválido' using errcode = '22023';
  end if;
  insert into public.rca_analyses (organization_id, nonconformity_id, method, data, conclusion)
  values (n.organization_id, n.id, p_method, p_data, nullif(trim(coalesce(p_conclusion, '')), ''))
  on conflict (nonconformity_id, organization_id) do update
    set method = excluded.method, data = excluded.data, conclusion = excluded.conclusion, updated_at = now();
  perform public.log_event(n.organization_id, 'analisis_causa', 'NoConformidad', n.id, n.code, jsonb_build_object('metodo', p_method));
end $$;

revoke execute on function public.save_rca_analysis(uuid, text, jsonb, text) from public, anon;
grant execute on function public.save_rca_analysis(uuid, text, jsonb, text) to authenticated;
