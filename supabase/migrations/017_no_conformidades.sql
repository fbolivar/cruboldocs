-- 017 — Módulo No Conformidades / CAPA (ISO 9001 cap. 10.2). Arquitectura:
-- docs/no-conformidades/ARQUITECTURA.md. Espejo del módulo de riesgos: RLS solo-SELECT y toda
-- escritura por funciones SECURITY DEFINER que validan permiso y auditan. Reutiliza cargos/roles,
-- tareas+cron (create_task/complete_tasks), auditoría (log_event) y numeración atómica (nc_counters).

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.nonconformities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  source text not null check (source in
    ('auditoria_interna','auditoria_externa','queja_pqrs','producto_servicio','riesgo_materializado','mejora','otro')),
  process_id uuid,
  title text not null,
  description text not null,
  severity text not null check (severity in ('observacion','menor','mayor')),
  source_risk_id uuid,
  reported_by uuid not null references public.profiles,
  detected_at date not null,
  owner_position_id uuid,
  root_cause text,
  status text not null default 'abierta' check (status in
    ('abierta','analisis_causa','plan_accion','en_ejecucion','verificacion','cerrada','anulada')),
  reopened_count int not null default 0,
  verified_by uuid references public.profiles,
  verified_at timestamptz,
  effective boolean,
  verification_notes text,
  closed_at timestamptz,
  cancel_reason text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (source_risk_id, organization_id) references public.risks (id, organization_id),
  foreign key (owner_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.nc_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  nonconformity_id uuid not null,
  type text not null check (type in ('correccion','correctiva','preventiva')),
  description text not null,
  responsible_position_id uuid not null,
  due_date date not null,
  status text not null default 'pendiente' check (status in ('pendiente','en_curso','hecha','cancelada')),
  completed_at timestamptz,
  completed_by uuid references public.profiles,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id) on delete cascade,
  foreign key (responsible_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.nc_evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  nonconformity_id uuid not null,
  action_id uuid,
  file_path text not null,
  file_sha256 text,
  file_size bigint,
  file_name text not null,
  note text,
  registered_by uuid not null default auth.uid(),
  registered_at timestamptz not null default now(),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id) on delete cascade,
  foreign key (action_id, organization_id) references public.nc_actions (id, organization_id) on delete cascade
);

-- Contador atómico para la numeración NC-AAAA-### por organización y año (ADR-007).
create table public.nc_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

-- Índices que cubren las FKs (evita el aviso de FKs sin índice) y el tablero.
create index on public.nonconformities (organization_id, status);
create index on public.nonconformities (process_id, organization_id);
create index on public.nonconformities (source_risk_id, organization_id);
create index on public.nonconformities (owner_position_id, organization_id);
create index on public.nonconformities (reported_by);
create index on public.nc_actions (nonconformity_id, organization_id);
create index on public.nc_actions (responsible_position_id, organization_id);
create index on public.nc_evidences (nonconformity_id, organization_id);
create index on public.nc_evidences (action_id, organization_id);

-- Ampliar las tareas para el módulo: nuevo tipo de tarea y nueva entidad.
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad'));

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

-- Mismos roles del SIG que riesgos (sin Superadmin, AUD ALTA-04). El reporte es abierto a todos.
create or replace function public.can_see_nonconformities(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

-- Gestiona (causa, acciones, anular): Líder SIG o Líder del proceso. Espejo de can_manage_risk.
create or replace function public.can_manage_nc(org uuid, process uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso', process)
$$;

revoke execute on function public.can_see_nonconformities, public.can_manage_nc from public, anon;
grant execute on function public.can_see_nonconformities, public.can_manage_nc to authenticated;

alter table public.nonconformities enable row level security;
alter table public.nc_actions enable row level security;
alter table public.nc_evidences enable row level security;
alter table public.nc_counters enable row level security; -- sin políticas: solo la función de servidor

-- Lectura: roles del SIG, o quien reportó la NC (ve su propio caso). Sin políticas de escritura.
create policy nc_select on public.nonconformities for select to authenticated
  using (public.can_see_nonconformities(organization_id) or reported_by = (select auth.uid()));

create policy nc_action_select on public.nc_actions for select to authenticated
  using (public.can_see_nonconformities(organization_id)
    or exists (select 1 from public.nonconformities n
               where n.id = nonconformity_id and n.reported_by = (select auth.uid())));

create policy nc_evidence_select on public.nc_evidences for select to authenticated
  using (public.can_see_nonconformities(organization_id)
    or exists (select 1 from public.nonconformities n
               where n.id = nonconformity_id and n.reported_by = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Funciones de escritura (máquina de estados en SQL; log_event en cada mutación)
-- ---------------------------------------------------------------------------

create or replace function public.nc_or_fail(p_nc uuid) returns public.nonconformities
language plpgsql stable security definer set search_path = '' as $$
declare n public.nonconformities;
begin
  select * into n from public.nonconformities where id = p_nc;
  if n.id is null or not public.is_active_member(n.organization_id) then
    raise exception 'No conformidad no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return n;
end $$;

/** Reporta una no conformidad (cualquier miembro activo). Devuelve el código asignado. */
create or replace function public.report_nonconformity(
  p_org uuid, p_source text, p_process uuid, p_title text, p_description text,
  p_severity text, p_detected_at date default current_date, p_source_risk uuid default null
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int;
begin
  if not public.is_active_member(p_org) then
    raise exception 'No perteneces a esta organización' using errcode = '42501';
  end if;
  v_year := extract(year from coalesce(p_detected_at, current_date))::int;
  insert into public.nc_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.nc_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'NC-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.nonconformities (organization_id, code, source, process_id, title, description,
    severity, source_risk_id, reported_by, detected_at, created_by)
  values (p_org, v_code, p_source, p_process, trim(p_title), trim(p_description),
    p_severity, p_source_risk, auth.uid(), coalesce(p_detected_at, current_date), auth.uid())
  returning nonconformities.id into v_id;

  perform public.log_event(p_org, 'reportar_nc', 'NoConformidad', v_id, v_code,
    jsonb_build_object('origen', p_source, 'severidad', p_severity));
  return query select v_id, v_code;
end $$;

/** Registra/edita el análisis de causa y el dueño. Mueve de Abierta a Plan de acción. */
create or replace function public.set_nc_cause(p_nc uuid, p_cause text, p_owner uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities;
begin
  n := public.nc_or_fail(p_nc);
  if not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Tu cargo no puede gestionar esta no conformidad' using errcode = '42501';
  end if;
  if n.status in ('cerrada','anulada') then
    raise exception 'La no conformidad ya está cerrada' using errcode = '22023';
  end if;
  update public.nonconformities
  set root_cause = trim(p_cause),
      owner_position_id = coalesce(p_owner, owner_position_id),
      status = case when status = 'abierta' then 'plan_accion' else status end,
      updated_at = now()
  where id = n.id;
  perform public.log_event(n.organization_id, 'analizar_causa_nc', 'NoConformidad', n.id, n.code, '{}');
end $$;

/** Agrega una acción al plan y crea la tarea para el cargo responsable. */
create or replace function public.add_nc_action(
  p_nc uuid, p_type text, p_description text, p_responsible uuid, p_due date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities; v_id uuid;
begin
  n := public.nc_or_fail(p_nc);
  if not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Tu cargo no puede gestionar esta no conformidad' using errcode = '42501';
  end if;
  if n.status in ('cerrada','anulada') then
    raise exception 'La no conformidad ya está cerrada' using errcode = '22023';
  end if;
  insert into public.nc_actions (organization_id, nonconformity_id, type, description, responsible_position_id, due_date, created_by)
  values (n.organization_id, n.id, p_type, trim(p_description), p_responsible, p_due, auth.uid())
  returning id into v_id;

  if n.status in ('abierta','analisis_causa','plan_accion') then
    update public.nonconformities set status = 'en_ejecucion', updated_at = now() where id = n.id;
  end if;

  perform public.create_task(
    org => n.organization_id, p_type => 'ejecutar_accion_nc', p_position => p_responsible,
    p_entity_type => 'no_conformidad', p_entity_id => v_id, p_code => n.code, p_title => n.title,
    p_version_no => null, p_detail => trim(p_description), p_due => p_due::timestamptz
  );
  perform public.log_event(n.organization_id, 'agregar_accion_nc', 'NoConformidad', n.id, n.code,
    jsonb_build_object('tipo', p_type));
  return v_id;
end $$;

-- Si no quedan acciones pendientes/en curso y la NC está en ejecución, pasa a verificación.
create or replace function public.nc_advance_if_actions_done(p_nc uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.nonconformities nc set status = 'verificacion', updated_at = now()
  where nc.id = p_nc and nc.status = 'en_ejecucion'
    and not exists (select 1 from public.nc_actions a
                    where a.nonconformity_id = p_nc and a.status in ('pendiente','en_curso'));
end $$;

/** El responsable (o un gestor) marca una acción como hecha. */
create or replace function public.complete_nc_action(p_action uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.nc_actions; n public.nonconformities;
begin
  select * into a from public.nc_actions where id = p_action;
  if a.id is null then raise exception 'Acción no encontrada' using errcode = 'P0002'; end if;
  n := public.nc_or_fail(a.nonconformity_id);
  if public.my_position(a.organization_id) is distinct from a.responsible_position_id
     and not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Solo el cargo responsable o un líder marca esta acción' using errcode = '42501';
  end if;
  if a.status <> 'pendiente' and a.status <> 'en_curso' then
    raise exception 'La acción ya está cerrada' using errcode = '22023';
  end if;
  update public.nc_actions set status = 'hecha', completed_at = now(), completed_by = auth.uid() where id = a.id;
  perform public.complete_tasks('ejecutar_accion_nc', a.id);
  perform public.nc_advance_if_actions_done(n.id);
  perform public.log_event(n.organization_id, 'completar_accion_nc', 'NoConformidad', n.id, n.code, '{}');
end $$;

/** Un gestor cancela una acción del plan. */
create or replace function public.cancel_nc_action(p_action uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.nc_actions; n public.nonconformities;
begin
  select * into a from public.nc_actions where id = p_action;
  if a.id is null then raise exception 'Acción no encontrada' using errcode = 'P0002'; end if;
  n := public.nc_or_fail(a.nonconformity_id);
  if not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Tu cargo no puede gestionar esta no conformidad' using errcode = '42501';
  end if;
  update public.nc_actions set status = 'cancelada' where id = a.id and status in ('pendiente','en_curso');
  perform public.complete_tasks('ejecutar_accion_nc', a.id);
  perform public.nc_advance_if_actions_done(n.id);
  perform public.log_event(n.organization_id, 'cancelar_accion_nc', 'NoConformidad', n.id, n.code, '{}');
end $$;

/** Verificación de eficacia (Líder SIG o dueño). Eficaz cierra; no eficaz reabre (ADR-008). */
create or replace function public.verify_nc(p_nc uuid, p_effective boolean, p_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities;
begin
  n := public.nc_or_fail(p_nc);
  if not (public.has_role(n.organization_id, 'lider_sig')
          or public.my_position(n.organization_id) is not distinct from n.owner_position_id) then
    raise exception 'Solo el Líder SIG o el dueño verifica la eficacia' using errcode = '42501';
  end if;
  if n.status <> 'verificacion' then
    raise exception 'La no conformidad no está en verificación' using errcode = '22023';
  end if;
  if p_effective then
    update public.nonconformities set status = 'cerrada', effective = true, verified_by = auth.uid(),
      verified_at = now(), verification_notes = trim(coalesce(p_notes, '')), closed_at = now(), updated_at = now()
    where id = n.id;
  else
    update public.nonconformities set status = 'plan_accion', effective = false, reopened_count = reopened_count + 1,
      verified_by = auth.uid(), verified_at = now(), verification_notes = trim(coalesce(p_notes, '')), updated_at = now()
    where id = n.id;
  end if;
  perform public.log_event(n.organization_id, 'verificar_nc', 'NoConformidad', n.id, n.code,
    jsonb_build_object('eficaz', p_effective));
end $$;

/** Anula una no conformidad con motivo (gestor) y cierra sus tareas pendientes. */
create or replace function public.cancel_nc(p_nc uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities;
begin
  n := public.nc_or_fail(p_nc);
  if not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Tu cargo no puede gestionar esta no conformidad' using errcode = '42501';
  end if;
  if n.status in ('cerrada','anulada') then
    raise exception 'La no conformidad ya está cerrada' using errcode = '22023';
  end if;
  update public.nonconformities set status = 'anulada', cancel_reason = trim(p_reason), closed_at = now(), updated_at = now()
  where id = n.id;
  update public.tasks set status = 'completada', completed_at = now(), completed_by = auth.uid()
  where type = 'ejecutar_accion_nc' and status = 'pendiente'
    and entity_id in (select id from public.nc_actions where nonconformity_id = n.id);
  perform public.log_event(n.organization_id, 'anular_nc', 'NoConformidad', n.id, n.code,
    jsonb_build_object('motivo', trim(p_reason)));
end $$;

/** Registra evidencia (de una acción o de la NC). El archivo debe estar bajo la ruta de la organización. */
create or replace function public.add_nc_evidence(
  p_nc uuid, p_action uuid, p_path text, p_sha256 text, p_size bigint, p_name text, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare n public.nonconformities; a public.nc_actions; v_id uuid;
begin
  n := public.nc_or_fail(p_nc);
  if p_action is not null then
    select * into a from public.nc_actions where id = p_action and nonconformity_id = n.id;
    if a.id is null then raise exception 'Acción no encontrada' using errcode = 'P0002'; end if;
    if public.my_position(n.organization_id) is distinct from a.responsible_position_id
       and not public.can_manage_nc(n.organization_id, n.process_id) then
      raise exception 'Solo el responsable o un líder registra evidencia' using errcode = '42501';
    end if;
  elsif not public.can_manage_nc(n.organization_id, n.process_id) then
    raise exception 'Tu cargo no puede gestionar esta no conformidad' using errcode = '42501';
  end if;
  if split_part(p_path, '/', 1) <> n.organization_id::text then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  insert into public.nc_evidences (organization_id, nonconformity_id, action_id, file_path, file_sha256, file_size, file_name, note, registered_by)
  values (n.organization_id, n.id, p_action, p_path, p_sha256, p_size, trim(p_name), trim(coalesce(p_note, '')), auth.uid())
  returning id into v_id;
  perform public.log_event(n.organization_id, 'registrar_evidencia_nc', 'NoConformidad', n.id, n.code, '{}');
  return v_id;
end $$;

-- Permisos: internas no ejecutables por clientes; RPCs solo authenticated.
revoke execute on function public.nc_or_fail, public.nc_advance_if_actions_done from public, anon, authenticated;
revoke execute on function public.report_nonconformity, public.set_nc_cause, public.add_nc_action,
  public.complete_nc_action, public.cancel_nc_action, public.verify_nc, public.cancel_nc, public.add_nc_evidence
  from public, anon;
grant execute on function public.report_nonconformity, public.set_nc_cause, public.add_nc_action,
  public.complete_nc_action, public.cancel_nc_action, public.verify_nc, public.cancel_nc, public.add_nc_evidence
  to authenticated;
