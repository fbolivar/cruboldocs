-- 025 — Módulo Competencias y formación (ISO 9001 7.2 / 7.3). Arquitectura: docs/competencias/ARQUITECTURA.md,
-- ADR-019..023. Patrón espejo de los módulos 1–4: RLS solo-SELECT por organization_id + escritura por RPC
-- SECURITY DEFINER con search_path='' y autorización interna por rol; FKs compuestas (id, organization_id).
-- La competencia de la persona se cuelga de `membership` (ADR-022). El estado (cumple/brecha/brecha_en_plan)
-- se calcula SIEMPRE en el servidor (ADR-020). El adjunto de certificado se difiere a un paso posterior:
-- las columnas certificate_* quedan nullables pero esta migración registra la formación sin archivo.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  description text,
  kind text not null check (kind in ('educacion','formacion','habilidad','experiencia')),
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table public.position_competencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  position_id uuid not null,
  competency_id uuid not null,
  required_level smallint not null check (required_level between 1 and 3),
  is_mandatory boolean not null default true,
  is_active boolean not null default true,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (position_id, competency_id),
  unique (id, organization_id),
  foreign key (position_id, organization_id) references public.positions (id, organization_id) on delete cascade,
  foreign key (competency_id, organization_id) references public.competencies (id, organization_id) on delete cascade
);

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  title text not null check (length(trim(title)) between 3 and 200),
  kind text not null check (kind in ('interna','externa')),
  provider text,
  training_date date not null,
  hours numeric(6,1) check (hours is null or hours >= 0),
  process_id uuid,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.training_attendees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  training_id uuid not null,
  membership_id uuid not null,
  result text not null default 'asistio' check (result in ('aprobado','no_aprobado','asistio')),
  certificate_path text,
  certificate_sha256 text,
  certificate_name text,
  valid_until date,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (training_id, membership_id),
  unique (id, organization_id),
  foreign key (training_id, organization_id) references public.trainings (id, organization_id) on delete cascade,
  foreign key (membership_id, organization_id) references public.memberships (id, organization_id) on delete cascade
);

create table public.competency_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  membership_id uuid not null,
  competency_id uuid not null,
  position_id uuid not null,
  assessed_level smallint not null check (assessed_level between 0 and 3),
  status text not null check (status in ('cumple','brecha','brecha_en_plan','sin_evaluar')),
  gap_plan text,
  gap_task_id uuid references public.tasks on delete set null,
  assessed_by uuid not null default auth.uid(),
  assessed_at timestamptz not null default now(),
  next_review_date date,
  note text,
  unique (membership_id, competency_id),
  unique (id, organization_id),
  foreign key (membership_id, organization_id) references public.memberships (id, organization_id) on delete cascade,
  foreign key (competency_id, organization_id) references public.competencies (id, organization_id) on delete cascade,
  foreign key (position_id, organization_id) references public.positions (id, organization_id)
);

create index on public.competencies (organization_id);
create index on public.position_competencies (position_id, organization_id);
create index on public.position_competencies (competency_id, organization_id);
create index on public.trainings (organization_id, training_date desc);
create index on public.trainings (process_id, organization_id);
create index on public.training_attendees (training_id, organization_id);
create index on public.training_attendees (membership_id, organization_id);
create index on public.competency_assessments (membership_id, organization_id);
create index on public.competency_assessments (competency_id, organization_id);

-- ampliar la bandeja para la tarea de cierre de brecha (como hicieron 017/022).
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc',
  'conducir_auditoria', 'capturar_medicion', 'cerrar_brecha'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria',
  'indicador', 'competencia'));

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_competencies(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_competencies(org uuid, process uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

/** Dato personal: ve la competencia/formación de una persona el Líder SIG, la propia persona,
 *  o el Líder del proceso del cargo de esa persona (process no nulo). */
create or replace function public.can_see_person_competency(p_org uuid, p_membership uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(p_org, 'lider_sig')
    or exists (
      select 1 from public.memberships m
      where m.id = p_membership and m.organization_id = p_org and m.user_id = auth.uid()
    )
    or exists (
      select 1 from public.memberships m
      join public.positions pos on pos.id = m.position_id and pos.organization_id = p_org
      where m.id = p_membership and m.organization_id = p_org
        and pos.process_id is not null and public.has_role(p_org, 'lider_proceso', pos.process_id)
    )
$$;

revoke execute on function public.can_see_competencies, public.can_manage_competencies,
  public.can_see_person_competency from public, anon;
grant execute on function public.can_see_competencies, public.can_manage_competencies,
  public.can_see_person_competency to authenticated;

alter table public.competencies enable row level security;
alter table public.position_competencies enable row level security;
alter table public.trainings enable row level security;
alter table public.training_attendees enable row level security;
alter table public.competency_assessments enable row level security;

create policy competency_select on public.competencies for select to authenticated
  using (public.can_see_competencies(organization_id));
create policy position_competency_select on public.position_competencies for select to authenticated
  using (public.can_see_competencies(organization_id));
create policy training_select on public.trainings for select to authenticated
  using (public.can_see_competencies(organization_id));
-- Dato personal: gestor del alcance o la propia persona.
create policy training_attendee_select on public.training_attendees for select to authenticated
  using (public.can_see_person_competency(organization_id, membership_id));
create policy competency_assessment_select on public.competency_assessments for select to authenticated
  using (public.can_see_person_competency(organization_id, membership_id));

-- ---------------------------------------------------------------------------
-- Estado derivado (servidor)
-- ---------------------------------------------------------------------------

create or replace function public.assess_status(p_required smallint, p_assessed smallint, p_has_plan boolean)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_assessed >= p_required then 'cumple'
    when p_has_plan then 'brecha_en_plan'
    else 'brecha'
  end
$$;

-- ---------------------------------------------------------------------------
-- Funciones de escritura (catálogo)
-- ---------------------------------------------------------------------------

create or replace function public.create_competency(p_org uuid, p_name text, p_kind text, p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.has_role(p_org, 'lider_sig') then
    raise exception 'Solo el Líder SIG gestiona el catálogo de competencias' using errcode = '42501';
  end if;
  insert into public.competencies (organization_id, name, kind, description, created_by)
  values (p_org, trim(p_name), p_kind, nullif(trim(coalesce(p_description, '')), ''), auth.uid())
  returning id into v_id;
  perform public.log_event(p_org, 'crear_competencia', 'Competencia', v_id, trim(p_name), '{}');
  return v_id;
end $$;

create or replace function public.update_competency(p_competency uuid, p_name text, p_kind text, p_description text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.competencies;
begin
  select * into c from public.competencies where id = p_competency;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'Competencia no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.has_role(c.organization_id, 'lider_sig') then
    raise exception 'Solo el Líder SIG gestiona el catálogo' using errcode = '42501';
  end if;
  update public.competencies set
    name = trim(p_name), kind = p_kind, description = nullif(trim(coalesce(p_description, '')), ''), updated_at = now()
  where id = c.id;
  perform public.log_event(c.organization_id, 'editar_competencia', 'Competencia', c.id, trim(p_name), '{}');
end $$;

create or replace function public.archive_competency(p_competency uuid, p_archive boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.competencies;
begin
  select * into c from public.competencies where id = p_competency;
  if c.id is null or not public.is_active_member(c.organization_id) then
    raise exception 'Competencia no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.has_role(c.organization_id, 'lider_sig') then
    raise exception 'Solo el Líder SIG gestiona el catálogo' using errcode = '42501';
  end if;
  update public.competencies set is_active = not p_archive, updated_at = now() where id = c.id;
  perform public.log_event(c.organization_id, case when p_archive then 'archivar_competencia' else 'reactivar_competencia' end,
    'Competencia', c.id, c.name, '{}');
end $$;

-- ---------------------------------------------------------------------------
-- Perfil del cargo
-- ---------------------------------------------------------------------------

create or replace function public.set_position_requirement(
  p_position uuid, p_competency uuid, p_level smallint, p_mandatory boolean, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare pos public.positions; v_org uuid; v_id uuid;
begin
  select * into pos from public.positions where id = p_position;
  if pos.id is null or not public.is_active_member(pos.organization_id) then
    raise exception 'Cargo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  v_org := pos.organization_id;
  if not public.can_manage_competencies(v_org, pos.process_id) then
    raise exception 'No puedes editar el perfil de este cargo' using errcode = '42501';
  end if;
  if not exists (select 1 from public.competencies c where c.id = p_competency and c.organization_id = v_org) then
    raise exception 'Competencia no encontrada' using errcode = 'P0002';
  end if;
  insert into public.position_competencies (organization_id, position_id, competency_id, required_level, is_mandatory, note, is_active, created_by)
  values (v_org, p_position, p_competency, p_level, coalesce(p_mandatory, true), nullif(trim(coalesce(p_note, '')), ''), true, auth.uid())
  on conflict (position_id, competency_id) do update
    set required_level = excluded.required_level, is_mandatory = excluded.is_mandatory, note = excluded.note, is_active = true
  returning id into v_id;
  perform public.log_event(v_org, 'definir_requisito_competencia', 'Competencia', p_competency, pos.name, '{}');
  return v_id;
end $$;

create or replace function public.remove_position_requirement(p_req uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.position_competencies; pos public.positions;
begin
  select * into r from public.position_competencies where id = p_req;
  if r.id is null or not public.is_active_member(r.organization_id) then
    raise exception 'Requisito no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  select * into pos from public.positions where id = r.position_id;
  if not public.can_manage_competencies(r.organization_id, pos.process_id) then
    raise exception 'No puedes editar el perfil de este cargo' using errcode = '42501';
  end if;
  -- Baja lógica (no hard-delete): conserva historial y evita que el guard de migración bloquee el DDL.
  update public.position_competencies set is_active = false where id = r.id;
  perform public.log_event(r.organization_id, 'quitar_requisito_competencia', 'Competencia', r.competency_id, pos.name, '{}');
end $$;

-- ---------------------------------------------------------------------------
-- Formación
-- ---------------------------------------------------------------------------

create or replace function public.create_training(
  p_org uuid, p_title text, p_kind text, p_provider text, p_date date, p_hours numeric, p_process uuid, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.can_manage_competencies(p_org, p_process) then
    raise exception 'No puedes registrar formación' using errcode = '42501';
  end if;
  insert into public.trainings (organization_id, title, kind, provider, training_date, hours, process_id, note, created_by)
  values (p_org, trim(p_title), p_kind, nullif(trim(coalesce(p_provider, '')), ''), p_date, p_hours, p_process,
    nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  perform public.log_event(p_org, 'crear_formacion', 'Competencia', v_id, trim(p_title), '{}');
  return v_id;
end $$;

create or replace function public.add_training_attendee(
  p_training uuid, p_membership uuid, p_result text, p_valid_until date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.trainings; v_id uuid;
begin
  select * into t from public.trainings where id = p_training;
  if t.id is null or not public.is_active_member(t.organization_id) then
    raise exception 'Formación no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  if not public.can_manage_competencies(t.organization_id, t.process_id) then
    raise exception 'No puedes registrar asistentes' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memberships m where m.id = p_membership and m.organization_id = t.organization_id) then
    raise exception 'La persona no pertenece a la organización' using errcode = '22023';
  end if;
  insert into public.training_attendees (organization_id, training_id, membership_id, result, valid_until, created_by)
  values (t.organization_id, t.id, p_membership, coalesce(p_result, 'asistio'), p_valid_until, auth.uid())
  on conflict (training_id, membership_id) do update set result = excluded.result, valid_until = excluded.valid_until
  returning id into v_id;
  perform public.log_event(t.organization_id, 'registrar_asistente_formacion', 'Competencia', t.id, t.title, '{}');
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Evaluación de competencia (brecha) — estado calculado en el servidor
-- ---------------------------------------------------------------------------

create or replace function public.assess_competency(
  p_membership uuid, p_competency uuid, p_position uuid, p_assessed smallint,
  p_next_review date, p_note text, p_create_task boolean
) returns table (id uuid, status text) language plpgsql security definer set search_path = '' as $$
declare
  pos public.positions; v_org uuid; v_required smallint; v_status text; v_has_plan boolean;
  v_id uuid; v_task uuid; v_person text;
begin
  select * into pos from public.positions where positions.id = p_position;
  if pos.id is null or not public.is_active_member(pos.organization_id) then
    raise exception 'Cargo no encontrado o sin acceso' using errcode = 'P0002';
  end if;
  v_org := pos.organization_id;
  if not public.can_manage_competencies(v_org, pos.process_id) then
    raise exception 'No puedes evaluar en este cargo' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memberships m where m.id = p_membership and m.organization_id = v_org) then
    raise exception 'La persona no pertenece a la organización' using errcode = '22023';
  end if;
  select required_level into v_required from public.position_competencies
   where position_id = p_position and competency_id = p_competency and is_active;
  if v_required is null then
    raise exception 'La competencia no está en el perfil del cargo' using errcode = '22023';
  end if;

  v_has_plan := nullif(trim(coalesce(p_note, '')), '') is not null;
  v_status := public.assess_status(v_required, p_assessed, v_has_plan);

  insert into public.competency_assessments (organization_id, membership_id, competency_id, position_id,
    assessed_level, status, gap_plan, next_review_date, note, assessed_by, assessed_at)
  values (v_org, p_membership, p_competency, p_position, p_assessed, v_status,
    case when v_status = 'brecha_en_plan' then nullif(trim(coalesce(p_note, '')), '') end,
    p_next_review, nullif(trim(coalesce(p_note, '')), ''), auth.uid(), now())
  on conflict (membership_id, competency_id) do update set
    position_id = excluded.position_id, assessed_level = excluded.assessed_level, status = excluded.status,
    gap_plan = excluded.gap_plan, next_review_date = excluded.next_review_date, note = excluded.note,
    assessed_by = excluded.assessed_by, assessed_at = excluded.assessed_at
  returning competency_assessments.id into v_id;

  -- Tarea de cierre de brecha (opcional), asignada al cargo evaluado.
  if p_create_task and v_status in ('brecha', 'brecha_en_plan') then
    select full_name into v_person from public.profiles p
      join public.memberships m on m.user_id = p.id where m.id = p_membership;
    perform public.create_task(v_org, 'cerrar_brecha', p_position, 'competencia', v_id,
      null, 'Cerrar brecha de competencia de ' || coalesce(v_person, 'la persona'),
      null, null, (now() + interval '30 days'));
    update public.competency_assessments set gap_task_id = (
      select tasks.id from public.tasks where tasks.type = 'cerrar_brecha' and tasks.entity_id = v_id
        and tasks.assignee_position_id = p_position and tasks.status = 'pendiente' limit 1
    ) where competency_assessments.id = v_id;
  end if;

  perform public.log_event(v_org, 'evaluar_competencia', 'Competencia', p_competency, v_status, '{}');
  return query select v_id, v_status;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.assess_status from public, anon, authenticated;
revoke execute on function
  public.create_competency, public.update_competency, public.archive_competency,
  public.set_position_requirement, public.remove_position_requirement,
  public.create_training, public.add_training_attendee, public.assess_competency
  from public, anon;
grant execute on function
  public.create_competency, public.update_competency, public.archive_competency,
  public.set_position_requirement, public.remove_position_requirement,
  public.create_training, public.add_training_attendee, public.assess_competency
  to authenticated;
