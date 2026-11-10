-- 020 — Módulo Auditorías Internas (ISO 9001 9.2). Arquitectura: docs/auditorias/ARQUITECTURA.md.
-- Espejo de No Conformidades: RLS solo-SELECT, escritura por RPC SECURITY DEFINER que valida permiso
-- y audita. Un hallazgo de no conformidad genera una NC con `generate_nc_from_finding` (reusa
-- report_nonconformity, ADR-010). Numeración atómica AUD-AAAA-### (audit_counters).

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  code text not null,
  title text not null,
  objective text,
  criteria text,
  lead_auditor_position_id uuid,
  planned_date date not null,
  status text not null default 'planificada' check (status in ('planificada','en_ejecucion','cerrada','cancelada')),
  conclusions text,
  closed_at timestamptz,
  cancel_reason text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (lead_auditor_position_id, organization_id) references public.positions (id, organization_id)
);

create table public.audit_processes (
  audit_id uuid not null,
  organization_id uuid not null references public.organizations on delete cascade,
  process_id uuid not null,
  primary key (audit_id, process_id),
  foreign key (audit_id, organization_id) references public.audits (id, organization_id) on delete cascade,
  foreign key (process_id, organization_id) references public.processes (id, organization_id)
);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  audit_id uuid not null,
  type text not null check (type in ('no_conformidad','observacion','oportunidad_mejora','conformidad')),
  process_id uuid,
  description text not null,
  criteria_ref text,
  severity text check (severity in ('menor','mayor')),
  nonconformity_id uuid,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (audit_id, organization_id) references public.audits (id, organization_id) on delete cascade,
  foreign key (process_id, organization_id) references public.processes (id, organization_id),
  foreign key (nonconformity_id, organization_id) references public.nonconformities (id, organization_id)
);

create table public.audit_counters (
  organization_id uuid not null references public.organizations on delete cascade,
  year int not null,
  last_seq int not null default 0,
  primary key (organization_id, year)
);

create index on public.audits (organization_id, status);
create index on public.audits (lead_auditor_position_id, organization_id);
create index on public.audit_processes (process_id, organization_id);
create index on public.audit_processes (audit_id, organization_id);
create index on public.audit_findings (audit_id, organization_id);
create index on public.audit_findings (process_id, organization_id);
create index on public.audit_findings (nonconformity_id, organization_id);

-- Ampliar las tareas para el módulo: nuevo tipo y nueva entidad.
alter table public.tasks drop constraint tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in (
  'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
  'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos', 'ejecutar_accion_nc', 'conducir_auditoria'));
alter table public.tasks drop constraint tasks_entity_type_check;
alter table public.tasks add constraint tasks_entity_type_check check (entity_type in (
  'documento', 'version', 'solicitud', 'control', 'organizacion', 'no_conformidad', 'auditoria'));

-- ---------------------------------------------------------------------------
-- Autorización y RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_see_audits(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig') or public.has_role(org, 'lider_proceso')
    or public.has_role(org, 'responsable_control') or public.has_role(org, 'auditor')
    or public.has_role(org, 'consulta')
$$;

create or replace function public.can_manage_audits(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role(org, 'lider_sig')
$$;

revoke execute on function public.can_see_audits, public.can_manage_audits from public, anon;
grant execute on function public.can_see_audits, public.can_manage_audits to authenticated;

alter table public.audits enable row level security;
alter table public.audit_processes enable row level security;
alter table public.audit_findings enable row level security;
alter table public.audit_counters enable row level security; -- deny-all: solo la función de servidor

create policy audit_select on public.audits for select to authenticated
  using (public.can_see_audits(organization_id));
create policy audit_process_select on public.audit_processes for select to authenticated
  using (public.can_see_audits(organization_id));
create policy audit_finding_select on public.audit_findings for select to authenticated
  using (public.can_see_audits(organization_id));

-- ---------------------------------------------------------------------------
-- Funciones de escritura
-- ---------------------------------------------------------------------------

create or replace function public.audit_or_fail(p_audit uuid) returns public.audits
language plpgsql stable security definer set search_path = '' as $$
declare a public.audits;
begin
  select * into a from public.audits where id = p_audit;
  if a.id is null or not public.is_active_member(a.organization_id) then
    raise exception 'Auditoría no encontrada o sin acceso' using errcode = 'P0002';
  end if;
  return a;
end $$;

/** Planifica una auditoría (Líder SIG). Devuelve el código. */
create or replace function public.plan_audit(
  p_org uuid, p_title text, p_objective text, p_criteria text, p_lead uuid, p_planned_date date, p_process_ids uuid[]
) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_year int; v_seq int; v_proc uuid;
begin
  if not public.can_manage_audits(p_org) then
    raise exception 'Solo el Líder SIG planifica auditorías' using errcode = '42501';
  end if;
  if coalesce(array_length(p_process_ids, 1), 0) = 0 then
    raise exception 'Indica al menos un proceso' using errcode = '22023';
  end if;
  v_year := extract(year from coalesce(p_planned_date, current_date))::int;
  insert into public.audit_counters (organization_id, year, last_seq)
    values (p_org, v_year, 1)
    on conflict (organization_id, year) do update set last_seq = public.audit_counters.last_seq + 1
    returning last_seq into v_seq;
  v_code := 'AUD-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.audits (organization_id, code, title, objective, criteria, lead_auditor_position_id, planned_date, created_by)
  values (p_org, v_code, trim(p_title), nullif(trim(coalesce(p_objective, '')), ''), nullif(trim(coalesce(p_criteria, '')), ''),
    p_lead, coalesce(p_planned_date, current_date), auth.uid())
  returning audits.id into v_id;

  foreach v_proc in array p_process_ids loop
    insert into public.audit_processes (audit_id, organization_id, process_id) values (v_id, p_org, v_proc)
      on conflict do nothing;
  end loop;

  if p_lead is not null then
    perform public.create_task(
      org => p_org, p_type => 'conducir_auditoria', p_position => p_lead,
      p_entity_type => 'auditoria', p_entity_id => v_id, p_code => v_code, p_title => trim(p_title),
      p_version_no => null, p_detail => nullif(trim(coalesce(p_objective, '')), ''), p_due => coalesce(p_planned_date, current_date)::timestamptz
    );
  end if;
  perform public.log_event(p_org, 'planificar_auditoria', 'Auditoria', v_id, v_code, '{}');
  return query select v_id, v_code;
end $$;

create or replace function public.start_audit(p_audit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.audits;
begin
  a := public.audit_or_fail(p_audit);
  if not public.can_manage_audits(a.organization_id) then
    raise exception 'Solo el Líder SIG inicia auditorías' using errcode = '42501';
  end if;
  if a.status <> 'planificada' then
    raise exception 'La auditoría no está planificada' using errcode = '22023';
  end if;
  update public.audits set status = 'en_ejecucion', updated_at = now() where id = a.id;
  perform public.log_event(a.organization_id, 'iniciar_auditoria', 'Auditoria', a.id, a.code, '{}');
end $$;

/** Registra un hallazgo (rol auditor o Líder SIG, auditoría en ejecución). */
create or replace function public.add_audit_finding(
  p_audit uuid, p_type text, p_process uuid, p_description text, p_criteria_ref text, p_severity text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.audits; v_id uuid; v_sev text;
begin
  a := public.audit_or_fail(p_audit);
  if not (public.has_role(a.organization_id, 'auditor') or public.can_manage_audits(a.organization_id)) then
    raise exception 'Tu cargo no puede registrar hallazgos' using errcode = '42501';
  end if;
  if a.status <> 'en_ejecucion' then
    raise exception 'La auditoría no está en ejecución' using errcode = '22023';
  end if;
  v_sev := case when p_type = 'no_conformidad' then p_severity else null end;
  insert into public.audit_findings (organization_id, audit_id, type, process_id, description, criteria_ref, severity, created_by)
  values (a.organization_id, a.id, p_type, p_process, trim(p_description), nullif(trim(coalesce(p_criteria_ref, '')), ''), v_sev, auth.uid())
  returning id into v_id;
  perform public.log_event(a.organization_id, 'agregar_hallazgo', 'Auditoria', a.id, a.code, jsonb_build_object('tipo', p_type));
  return v_id;
end $$;

/** Genera una NC desde un hallazgo de no conformidad (un clic, idempotente). Devuelve el código. */
create or replace function public.generate_nc_from_finding(p_finding uuid) returns table (code text)
language plpgsql security definer set search_path = '' as $$
declare f public.audit_findings; a public.audits; v_nc_id uuid; v_nc_code text;
begin
  select * into f from public.audit_findings where id = p_finding;
  if f.id is null then raise exception 'Hallazgo no encontrado' using errcode = 'P0002'; end if;
  a := public.audit_or_fail(f.audit_id);
  if not (public.has_role(a.organization_id, 'auditor') or public.can_manage_audits(a.organization_id)) then
    raise exception 'Tu cargo no puede generar la no conformidad' using errcode = '42501';
  end if;
  if f.type <> 'no_conformidad' then
    raise exception 'El hallazgo no es una no conformidad' using errcode = '22023';
  end if;
  if f.nonconformity_id is not null then
    raise exception 'Este hallazgo ya tiene una no conformidad' using errcode = '22023';
  end if;
  select r.id, r.code into v_nc_id, v_nc_code
  from public.report_nonconformity(a.organization_id, 'auditoria_interna', f.process_id,
    left(f.description, 120), f.description, coalesce(f.severity, 'menor')) r;
  update public.audit_findings set nonconformity_id = v_nc_id where id = f.id;
  perform public.log_event(a.organization_id, 'generar_nc_hallazgo', 'Auditoria', a.id, a.code, jsonb_build_object('nc', v_nc_code));
  return query select v_nc_code;
end $$;

create or replace function public.close_audit(p_audit uuid, p_conclusions text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.audits;
begin
  a := public.audit_or_fail(p_audit);
  if not public.can_manage_audits(a.organization_id) then
    raise exception 'Solo el Líder SIG cierra auditorías' using errcode = '42501';
  end if;
  if a.status <> 'en_ejecucion' then
    raise exception 'La auditoría no está en ejecución' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_conclusions, ''))) < 1 then
    raise exception 'Escribe las conclusiones' using errcode = '22023';
  end if;
  update public.audits set status = 'cerrada', conclusions = trim(p_conclusions), closed_at = now(), updated_at = now()
  where id = a.id;
  perform public.complete_tasks('conducir_auditoria', a.id);
  perform public.log_event(a.organization_id, 'cerrar_auditoria', 'Auditoria', a.id, a.code, '{}');
end $$;

create or replace function public.cancel_audit(p_audit uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.audits;
begin
  a := public.audit_or_fail(p_audit);
  if not public.can_manage_audits(a.organization_id) then
    raise exception 'Solo el Líder SIG cancela auditorías' using errcode = '42501';
  end if;
  if a.status in ('cerrada','cancelada') then
    raise exception 'La auditoría ya está cerrada' using errcode = '22023';
  end if;
  update public.audits set status = 'cancelada', cancel_reason = trim(p_reason), closed_at = now(), updated_at = now()
  where id = a.id;
  perform public.complete_tasks('conducir_auditoria', a.id);
  perform public.log_event(a.organization_id, 'cancelar_auditoria', 'Auditoria', a.id, a.code, jsonb_build_object('motivo', trim(p_reason)));
end $$;

revoke execute on function public.audit_or_fail from public, anon, authenticated;
revoke execute on function public.plan_audit, public.start_audit, public.add_audit_finding,
  public.generate_nc_from_finding, public.close_audit, public.cancel_audit from public, anon;
grant execute on function public.plan_audit, public.start_audit, public.add_audit_finding,
  public.generate_nc_from_finding, public.close_audit, public.cancel_audit to authenticated;
