-- 032 — Aspectos e impactos ambientales (ISO 14001 6.1.2). Arquitectura: docs/ambiental/ARQUITECTURA.md,
-- ADR-049/050. Espejo de Peligros/Requisitos: la SIGNIFICANCIA se calcula en el servidor (índice ponderado
-- de 4 criterios 1–3; significativo si índice ≥ 8, o condición = emergencia, o tiene requisito legal).
-- Baja lógica 'inactivo'. Enlace opcional a legal_requirements; etiqueta 14001 vía entity_norms.
-- Reutiliza can_see_sig/can_manage_sig (031). NOTA: aplicada por fragmentos; archivo = SQL final consolidado.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.env_aspects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  process_id uuid,
  activity text not null check (length(trim(activity)) between 2 and 500),
  aspect text not null check (length(trim(aspect)) between 2 and 500),
  impact text not null check (length(trim(impact)) between 2 and 500),
  condition text not null check (condition in ('normal','anormal','emergencia')),
  controls text,
  legal_requirement_id uuid,
  responsible_position_id uuid,
  freq smallint not null check (freq between 1 and 3),
  sev smallint not null check (sev between 1 and 3),
  reach smallint not null check (reach between 1 and 3),
  legal_crit smallint not null check (legal_crit between 1 and 3),
  score smallint not null,
  significance text not null check (significance in ('significativo','no_significativo')),
  status text not null default 'activo' check (status in ('activo','inactivo')),
  next_review_date date,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (legal_requirement_id, organization_id) references public.legal_requirements (id, organization_id),
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.env_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.env_aspects (organization_id, status);
create index on public.env_aspects (process_id, organization_id);
create index on public.env_aspects (legal_requirement_id, organization_id);

alter table public.env_aspects enable row level security;
alter table public.env_counters enable row level security; -- deny-all

create policy env_aspect_select on public.env_aspects for select to authenticated
  using (public.can_see_sig(organization_id));

-- ---------------------------------------------------------------------------
-- Significancia (server-side) + RPCs
-- ---------------------------------------------------------------------------

create or replace function public.env_significance(p_score int, p_condition text, p_legal uuid) returns text
language sql immutable set search_path = '' as $$
  select case when p_score >= 8 or p_condition = 'emergencia' or p_legal is not null
    then 'significativo' else 'no_significativo' end
$$;

create or replace function public.create_aspect(
  p_org uuid, p_process uuid, p_activity text, p_aspect text, p_impact text, p_condition text,
  p_controls text, p_legal uuid, p_responsible uuid, p_freq int, p_sev int, p_reach int, p_legal_crit int, p_next_review date
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int; v_score int; v_sig text;
begin
  if not public.can_manage_sig(p_org, p_process) then
    raise exception 'No puedes registrar aspectos ambientales' using errcode = '42501';
  end if;
  if p_freq not between 1 and 3 or p_sev not between 1 and 3 or p_reach not between 1 and 3 or p_legal_crit not between 1 and 3 then
    raise exception 'Valoración ambiental no válida' using errcode = '22023';
  end if;
  if p_condition not in ('normal','anormal','emergencia') then
    raise exception 'Condición no válida' using errcode = '22023';
  end if;
  v_score := p_freq + p_sev + p_reach + p_legal_crit;
  v_sig := public.env_significance(v_score, p_condition, p_legal);
  v_year := extract(year from current_date)::int;
  insert into public.env_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.env_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'ASP-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.env_aspects (organization_id, code, process_id, activity, aspect, impact, condition,
    controls, legal_requirement_id, responsible_position_id, freq, sev, reach, legal_crit, score, significance, next_review_date, created_by)
  values (p_org, v_code, p_process, trim(p_activity), trim(p_aspect), trim(p_impact), p_condition,
    nullif(trim(coalesce(p_controls, '')), ''), p_legal, p_responsible, p_freq, p_sev, p_reach, p_legal_crit,
    v_score, v_sig, p_next_review, auth.uid())
  returning env_aspects.id into v_id;

  perform public.log_event(p_org, 'crear_aspecto', 'Aspecto', v_id, v_code, jsonb_build_object('significancia', v_sig));
  return query select v_id, v_code;
end $$;

create or replace function public.env_aspect_or_fail(p_aspect uuid) returns public.env_aspects
language plpgsql stable security definer set search_path = '' as $$
declare a public.env_aspects;
begin
  select * into a from public.env_aspects where id = p_aspect;
  if a.id is null or not public.is_active_member(a.organization_id) then
    raise exception 'Aspecto no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  return a;
end $$;

create or replace function public.update_aspect(
  p_aspect uuid, p_process uuid, p_activity text, p_aspect_text text, p_impact text, p_condition text,
  p_controls text, p_legal uuid, p_responsible uuid, p_freq int, p_sev int, p_reach int, p_legal_crit int, p_next_review date
) returns void language plpgsql security definer set search_path = '' as $$
declare a public.env_aspects; v_score int; v_sig text;
begin
  a := public.env_aspect_or_fail(p_aspect);
  if not public.can_manage_sig(a.organization_id, a.process_id) then
    raise exception 'No puedes editar este aspecto' using errcode = '42501';
  end if;
  if a.status = 'inactivo' then
    raise exception 'El aspecto inactivo ya no es editable' using errcode = '22023';
  end if;
  if p_freq not between 1 and 3 or p_sev not between 1 and 3 or p_reach not between 1 and 3 or p_legal_crit not between 1 and 3 then
    raise exception 'Valoración ambiental no válida' using errcode = '22023';
  end if;
  if p_condition not in ('normal','anormal','emergencia') then
    raise exception 'Condición no válida' using errcode = '22023';
  end if;
  v_score := p_freq + p_sev + p_reach + p_legal_crit;
  v_sig := public.env_significance(v_score, p_condition, p_legal);
  update public.env_aspects set
    process_id = p_process, activity = trim(p_activity), aspect = trim(p_aspect_text), impact = trim(p_impact),
    condition = p_condition, controls = nullif(trim(coalesce(p_controls, '')), ''), legal_requirement_id = p_legal,
    responsible_position_id = p_responsible, freq = p_freq, sev = p_sev, reach = p_reach, legal_crit = p_legal_crit,
    score = v_score, significance = v_sig, next_review_date = p_next_review, updated_at = now()
  where id = a.id;
  perform public.log_event(a.organization_id, 'editar_aspecto', 'Aspecto', a.id, a.code, jsonb_build_object('significancia', v_sig));
end $$;

create or replace function public.set_aspect_active(p_aspect uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.env_aspects;
begin
  a := public.env_aspect_or_fail(p_aspect);
  if not public.can_manage_sig(a.organization_id, a.process_id) then
    raise exception 'No puedes cambiar el estado de este aspecto' using errcode = '42501';
  end if;
  update public.env_aspects set status = case when p_active then 'activo' else 'inactivo' end, updated_at = now() where id = a.id;
  perform public.log_event(a.organization_id, 'estado_aspecto', 'Aspecto', a.id, a.code, jsonb_build_object('activo', p_active));
end $$;

revoke execute on function public.env_aspect_or_fail, public.env_significance from public, anon, authenticated;
revoke execute on function public.create_aspect, public.update_aspect, public.set_aspect_active from public, anon;
grant execute on function public.create_aspect, public.update_aspect, public.set_aspect_active to authenticated;
grant execute on function public.env_significance to authenticated;

-- ---------------------------------------------------------------------------
-- entity_norms admite 'aspecto_ambiental'; tasks admite 'revisar_aspecto'/'aspecto_ambiental'
-- ---------------------------------------------------------------------------

alter table public.entity_norms drop constraint entity_norms_entity_type_check;
alter table public.entity_norms add constraint entity_norms_entity_type_check check (entity_type in (
  'proceso','documento','riesgo','no_conformidad','objetivo','requisito_legal','peligro','aspecto_ambiental'));

alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion', 'cerrar_brecha', 'reevaluar_proveedor', 'atender_pqrs',
  'cumplir_compromiso', 'evaluar_requisito', 'revisar_aspecto'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria',
  'indicador', 'competencia', 'proveedor', 'pqrs', 'acta', 'requisito_legal', 'aspecto_ambiental'));
