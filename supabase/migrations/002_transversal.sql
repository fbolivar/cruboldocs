-- 002 · Transversal: bandeja de tareas por cargo, auditoría (solo inserción) y
-- cola de correos (outbox, ADR-003). Las escriben solo funciones internas.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  type text not null check (type in (
    'revisar', 'aprobar', 'corregir', 'atender_solicitud', 'confirmar_lectura',
    'ejecutar_control', 'revisar_documento_vencido', 'recertificar_accesos'
  )),
  -- Se asigna al cargo y se resuelve a los usuarios vigentes que lo ocupan.
  assignee_position_id uuid not null,
  entity_type text not null check (entity_type in ('documento', 'version', 'solicitud', 'control', 'organizacion')),
  entity_id uuid not null,
  entity_code text,
  title text not null,
  version_no int,
  detail text,
  origin_user_id uuid references public.profiles on delete set null,
  due_date timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'completada', 'cancelada')),
  completed_at timestamptz,
  completed_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  foreign key (assignee_position_id, organization_id) references public.positions (id, organization_id)
);

comment on table public.tasks is 'Bandeja. La generan funciones del flujo y el job diario; nunca el usuario a mano.';

-- Idempotencia: una sola tarea pendiente por tipo, entidad y cargo.
create unique index tasks_one_pending on public.tasks (type, entity_id, assignee_position_id) where status = 'pendiente';
create index on public.tasks (organization_id);
create index on public.tasks (assignee_position_id) where status = 'pendiente';

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations on delete cascade,
  -- null = Sistema (job diario).
  actor_id uuid references public.profiles on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text not null default '',
  diff jsonb not null default '{}',
  at timestamptz not null default now()
);

comment on table public.audit_log is 'Dato sensible. Solo inserción (sin políticas de escritura; trigger impide update/delete). Base de indicadores a 90 días.';

create index on public.audit_log (organization_id, at desc);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  to_email text not null,
  template text not null,
  payload jsonb not null default '{}',
  status text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'fallido')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

comment on table public.email_outbox is 'RLS deny-all intencional: la procesa el servidor con service_role (envío inmediato + cron diario).';

create index on public.email_outbox (status, created_at) where status = 'pendiente';

-- Inmutabilidad del registro de auditoría.
create or replace function public.forbid_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registro inmutable: % no admite %', tg_table_name, tg_op using errcode = '42501';
end $$;

create trigger t_immutable before update or delete on public.audit_log
  for each row execute function public.forbid_change();

alter table public.tasks enable row level security;
alter table public.audit_log enable row level security;
alter table public.email_outbox enable row level security;

-- tasks: cada usuario ve las pendientes e historial de su cargo vigente.
create policy task_select on public.tasks for select to authenticated
  using (assignee_position_id = public.my_position(organization_id));

-- audit_log: Admin, Líder SIG y Auditor (lectura).
create policy audit_select on public.audit_log for select to authenticated
  using (
    organization_id is not null
    and (public.can_manage_org(organization_id) or public.has_role(organization_id, 'auditor'))
  );

-- email_outbox: sin políticas (deny-all).

-- ---------------------------------------------------------------------------
-- Funciones internas (no ejecutables por clientes)
-- ---------------------------------------------------------------------------

create or replace function public.log_event(
  org uuid, p_action text, p_entity_type text, p_entity_id uuid, p_label text, p_diff jsonb default '{}',
  p_actor uuid default auth.uid()
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, entity_label, diff)
  values (org, p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_label, ''), coalesce(p_diff, '{}'))
$$;

/** Encola un correo para cada usuario vigente que ocupa el cargo. */
create or replace function public.notify_position(org uuid, p_position uuid, p_template text, p_payload jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.email_outbox (organization_id, to_email, template, payload)
  select org, p.email, p_template, p_payload
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join public.organizations o on o.id = m.organization_id
  where m.organization_id = org
    and m.position_id = p_position
    and m.status = 'activo'
    and o.status = 'activa'
    and current_date >= m.valid_from
    and (m.valid_until is null or current_date <= m.valid_until)
$$;

create or replace function public.create_task(
  org uuid, p_type text, p_position uuid, p_entity_type text, p_entity_id uuid,
  p_code text, p_title text, p_version_no int, p_detail text, p_due timestamptz,
  p_actor uuid default auth.uid()
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tasks (
    organization_id, type, assignee_position_id, entity_type, entity_id,
    entity_code, title, version_no, detail, origin_user_id, due_date
  ) values (
    org, p_type, p_position, p_entity_type, p_entity_id,
    p_code, p_title, p_version_no, p_detail, p_actor, p_due
  )
  on conflict (type, entity_id, assignee_position_id) where status = 'pendiente' do nothing;

  -- Solo se avisa por correo cuando la tarea es nueva (el job diario es idempotente).
  if not found then
    return;
  end if;
  perform public.notify_position(org, p_position, 'tarea_nueva', jsonb_build_object(
    'tipo', p_type, 'codigo', p_code, 'titulo', p_title, 'version', p_version_no, 'vence', p_due
  ));
end $$;

create or replace function public.complete_tasks(
  p_type text, p_entity_id uuid, p_position uuid default null, p_actor uuid default auth.uid()
)
returns void
language sql security definer set search_path = '' as $$
  update public.tasks
  set status = 'completada', completed_at = now(), completed_by = p_actor
  where type = p_type and entity_id = p_entity_id and status = 'pendiente'
    and (p_position is null or assignee_position_id = p_position)
$$;

revoke execute on function public.log_event, public.notify_position, public.create_task,
  public.complete_tasks, public.forbid_change from public, anon, authenticated;
