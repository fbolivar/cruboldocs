-- 041 — Contexto de la organización (ISO 9001 4.1 / 4.2). Arquitectura: docs/contexto/ARQUITECTURA.md,
-- ADR-060/061/062. Cuestiones del contexto (DOFA + PESTEL) y partes interesadas, conectadas al SGC
-- (generar riesgo, ligar a objetivo/requisito legal). RLS solo-SELECT + escritura por RPC definer.

-- ---------------------------------------------------------------------------
-- 041a · Cuestiones del contexto (4.1)
-- ---------------------------------------------------------------------------
create table public.context_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  swot text not null check (swot in ('fortaleza','debilidad','oportunidad','amenaza')),
  pestel text check (pestel in ('politico','economico','social','tecnologico','ecologico','legal')),
  description text not null check (length(trim(description)) between 3 and 2000),
  implication text,
  process_id uuid,
  risk_id uuid references public.risks on delete set null,
  objective_id uuid references public.quality_objectives on delete set null,
  status text not null default 'vigente' check (status in ('vigente','archivada')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PESTEL solo aplica a cuestiones externas (oportunidad/amenaza).
  constraint context_pestel_externa check (pestel is null or swot in ('oportunidad','amenaza')),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);
create index on public.context_issues (organization_id, swot);

create or replace function public.can_see_context(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin()
    or public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_context(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_context, public.can_manage_context from public, anon;
grant execute on function public.can_see_context, public.can_manage_context to authenticated;

alter table public.context_issues enable row level security;
create policy context_issue_select on public.context_issues for select to authenticated using (public.can_see_context(organization_id));

-- ---------------------------------------------------------------------------
-- 041b · Partes interesadas (4.2)
-- ---------------------------------------------------------------------------
create table public.interested_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 2 and 200),
  party_type text not null check (party_type in ('cliente','proveedor','empleado','accionista','autoridad','comunidad','otro')),
  needs_expectations text,
  requirements text,
  monitoring text,
  process_id uuid,
  legal_requirement_id uuid references public.legal_requirements on delete set null,
  status text not null default 'vigente' check (status in ('vigente','archivada')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);
create index on public.interested_parties (organization_id, party_type);

alter table public.interested_parties enable row level security;
create policy party_select on public.interested_parties for select to authenticated using (public.can_see_context(organization_id));

-- ---------------------------------------------------------------------------
-- 041c · RPCs de cuestiones del contexto
-- ---------------------------------------------------------------------------
create or replace function public.issue_or_fail(p_issue uuid) returns public.context_issues
language plpgsql stable security definer set search_path = '' as $$
declare i public.context_issues;
begin
  select * into i from public.context_issues where id = p_issue;
  if i.id is null or not public.is_active_member(i.organization_id) then
    raise exception 'Cuestión no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return i;
end $$;

create or replace function public.create_context_issue(
  p_org uuid, p_swot text, p_pestel text, p_description text, p_implication text, p_process uuid, p_objective uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_pestel text;
begin
  if not public.can_manage_context(p_org, p_process) then
    raise exception 'No puedes registrar cuestiones del contexto' using errcode = '42501';
  end if;
  if p_swot not in ('fortaleza','debilidad','oportunidad','amenaza') then
    raise exception 'Tipo DOFA no válido' using errcode = '22023';
  end if;
  -- PESTEL solo en externas.
  v_pestel := case when p_swot in ('oportunidad','amenaza') then nullif(p_pestel,'') else null end;
  insert into public.context_issues (organization_id, swot, pestel, description, implication, process_id, objective_id)
  values (p_org, p_swot, v_pestel, trim(p_description), nullif(trim(coalesce(p_implication,'')),''), p_process, p_objective)
  returning context_issues.id into v_id;
  perform public.log_event(p_org, 'crear_cuestion', 'Contexto', v_id, left(trim(p_description), 60), '{}');
  return v_id;
end $$;

create or replace function public.update_context_issue(
  p_issue uuid, p_swot text, p_pestel text, p_description text, p_implication text, p_process uuid, p_objective uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare i public.context_issues; v_pestel text;
begin
  i := public.issue_or_fail(p_issue);
  if not public.can_manage_context(i.organization_id, i.process_id) then
    raise exception 'No puedes editar esta cuestión' using errcode = '42501';
  end if;
  if p_swot not in ('fortaleza','debilidad','oportunidad','amenaza') then
    raise exception 'Tipo DOFA no válido' using errcode = '22023';
  end if;
  v_pestel := case when p_swot in ('oportunidad','amenaza') then nullif(p_pestel,'') else null end;
  update public.context_issues set
    swot = p_swot, pestel = v_pestel, description = trim(p_description),
    implication = nullif(trim(coalesce(p_implication,'')),''), process_id = p_process,
    objective_id = p_objective, updated_at = now()
  where id = i.id;
  perform public.log_event(i.organization_id, 'editar_cuestion', 'Contexto', i.id, left(trim(p_description), 60), '{}');
end $$;

create or replace function public.set_issue_archived(p_issue uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.context_issues;
begin
  i := public.issue_or_fail(p_issue);
  if not public.can_manage_context(i.organization_id, i.process_id) then
    raise exception 'No puedes archivar esta cuestión' using errcode = '42501';
  end if;
  update public.context_issues set status = case when p_archived then 'archivada' else 'vigente' end, updated_at = now()
  where id = i.id;
  perform public.log_event(i.organization_id, 'estado_cuestion', 'Contexto', i.id, '', jsonb_build_object('archivada', p_archived));
end $$;

-- Genera un riesgo desde una cuestión (4.1 → 6.1), reutilizando create_risk (ADR-061). Idempotente.
create or replace function public.generate_risk_from_issue(
  p_issue uuid, p_process uuid, p_owner uuid, p_probability int, p_impact int
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare i public.context_issues; r record;
begin
  select * into i from public.context_issues where context_issues.id = p_issue for update;
  if i.id is null or not public.is_active_member(i.organization_id) then
    raise exception 'Cuestión no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if i.risk_id is not null then
    raise exception 'Esta cuestión ya generó un riesgo' using errcode = '22023';
  end if;
  if not public.can_manage_risk(i.organization_id, p_process) then
    raise exception 'Tu cargo no puede identificar riesgos en este proceso' using errcode = '42501';
  end if;
  select cr.id, cr.code into r
  from public.create_risk(i.organization_id, p_process, i.description,
    coalesce(i.implication, ''), '', 'Contexto', p_owner, p_probability, p_impact, '[]'::jsonb) cr;
  update public.context_issues set risk_id = r.id, updated_at = now() where context_issues.id = i.id;
  perform public.log_event(i.organization_id, 'cuestion_a_riesgo', 'Contexto', i.id, r.code, jsonb_build_object('risk', r.code));
  return query select r.id, r.code;
end $$;

revoke execute on function public.issue_or_fail from public, anon, authenticated;
revoke execute on function public.create_context_issue, public.update_context_issue, public.set_issue_archived,
  public.generate_risk_from_issue from public, anon;
grant execute on function public.create_context_issue, public.update_context_issue, public.set_issue_archived,
  public.generate_risk_from_issue to authenticated;

-- ---------------------------------------------------------------------------
-- 041d · RPCs de partes interesadas
-- ---------------------------------------------------------------------------
create or replace function public.party_or_fail(p_party uuid) returns public.interested_parties
language plpgsql stable security definer set search_path = '' as $$
declare p public.interested_parties;
begin
  select * into p from public.interested_parties where id = p_party;
  if p.id is null or not public.is_active_member(p.organization_id) then
    raise exception 'Parte interesada no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return p;
end $$;

create or replace function public.create_interested_party(
  p_org uuid, p_name text, p_type text, p_needs text, p_requirements text, p_monitoring text, p_process uuid, p_legal uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.can_manage_context(p_org, p_process) then
    raise exception 'No puedes registrar partes interesadas' using errcode = '42501';
  end if;
  if p_type not in ('cliente','proveedor','empleado','accionista','autoridad','comunidad','otro') then
    raise exception 'Tipo de parte no válido' using errcode = '22023';
  end if;
  insert into public.interested_parties (organization_id, name, party_type, needs_expectations, requirements, monitoring, process_id, legal_requirement_id)
  values (p_org, trim(p_name), p_type, nullif(trim(coalesce(p_needs,'')),''), nullif(trim(coalesce(p_requirements,'')),''),
    nullif(trim(coalesce(p_monitoring,'')),''), p_process, p_legal)
  returning interested_parties.id into v_id;
  perform public.log_event(p_org, 'crear_parte', 'ParteInteresada', v_id, trim(p_name), '{}');
  return v_id;
end $$;

create or replace function public.update_interested_party(
  p_party uuid, p_name text, p_type text, p_needs text, p_requirements text, p_monitoring text, p_process uuid, p_legal uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare p public.interested_parties;
begin
  p := public.party_or_fail(p_party);
  if not public.can_manage_context(p.organization_id, p.process_id) then
    raise exception 'No puedes editar esta parte interesada' using errcode = '42501';
  end if;
  if p_type not in ('cliente','proveedor','empleado','accionista','autoridad','comunidad','otro') then
    raise exception 'Tipo de parte no válido' using errcode = '22023';
  end if;
  update public.interested_parties set
    name = trim(p_name), party_type = p_type, needs_expectations = nullif(trim(coalesce(p_needs,'')),''),
    requirements = nullif(trim(coalesce(p_requirements,'')),''), monitoring = nullif(trim(coalesce(p_monitoring,'')),''),
    process_id = p_process, legal_requirement_id = p_legal, updated_at = now()
  where id = p.id;
  perform public.log_event(p.organization_id, 'editar_parte', 'ParteInteresada', p.id, trim(p_name), '{}');
end $$;

create or replace function public.set_party_archived(p_party uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.interested_parties;
begin
  p := public.party_or_fail(p_party);
  if not public.can_manage_context(p.organization_id, p.process_id) then
    raise exception 'No puedes archivar esta parte interesada' using errcode = '42501';
  end if;
  update public.interested_parties set status = case when p_archived then 'archivada' else 'vigente' end, updated_at = now()
  where id = p.id;
  perform public.log_event(p.organization_id, 'estado_parte', 'ParteInteresada', p.id, '', jsonb_build_object('archivada', p_archived));
end $$;

revoke execute on function public.party_or_fail from public, anon, authenticated;
revoke execute on function public.create_interested_party, public.update_interested_party, public.set_party_archived from public, anon;
grant execute on function public.create_interested_party, public.update_interested_party, public.set_party_archived to authenticated;
